import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { Database } from "bun:sqlite";
import { request } from "undici";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { agent } from "./agent";
import { generateAnimalVoice } from "./elevenlabs";
import { generateSticker } from "./sticker";

const PORT = parseInt(process.env.PORT || "3001");
const BRIDGE_URL = process.env.BRIDGE_URL || "http://localhost:3000";
const IMGFLIP_USERNAME = process.env.IMGFLIP_USERNAME!;
const IMGFLIP_PASSWORD = process.env.IMGFLIP_PASSWORD!;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const fastify = Fastify({ logger: true });
await fastify.register(cors, { origin: true });
await fastify.register(import('@fastify/static'), {
  root: import.meta.dir + '/../audio',
  prefix: '/audio/',
});
await fastify.register(import('@fastify/multipart'), {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  }
});

// SQLite database
const db = new Database("nori.db");

// Track which messages have already generated stickers (prevent duplicates)
// Key: `${chatId}:${userId}:${text}:${ts}` or `${chatId}:${userId}:${text}`
const stickerGenerated = new Set<string>();

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    userId TEXT PRIMARY KEY,
    displayName TEXT,
    lastMood TEXT DEFAULT 'neutral',
    shareWins INTEGER DEFAULT 1,
    shareAudio INTEGER DEFAULT 1,
    shareImages INTEGER DEFAULT 1,
    shareMemes INTEGER DEFAULT 1,
    askBeforeShare INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS groups (
    groupId TEXT PRIMARY KEY,
    chatId TEXT,
    petMood TEXT DEFAULT 'chill',
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chatId TEXT,
    userId TEXT,
    text TEXT,
    ts TEXT
  );

  CREATE TABLE IF NOT EXISTS moments (
    eventId TEXT PRIMARY KEY,
    groupId TEXT,
    userId TEXT,
    type TEXT,
    s3Url TEXT,
    durationSec INTEGER,
    shortDesc TEXT,
    ts TEXT,
    shareable INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS utterances (
    userId TEXT PRIMARY KEY,
    text TEXT,
    voiceKind TEXT,
    voiceDurationHint TEXT,
    audioMomentId TEXT,
    imageMomentId TEXT,
    ts TEXT
  );
`);

// Imgflip meme catalog
let MEME_CATALOG: Record<string, any> = {};

async function loadMemes() {
  try {
    const res = await request("https://api.imgflip.com/get_memes");
    const j: any = await res.body.json();
    if (j?.success) {
      MEME_CATALOG = Object.fromEntries(
        j.data.memes.map((m: any) => [m.name.toLowerCase(), m])
      );
      console.log(`📚 Loaded ${Object.keys(MEME_CATALOG).length} meme templates`);
    }
  } catch (e) {
    console.error("Failed to load memes:", e);
  }
}

function findTemplate(hint: string): any | null {
  const key = hint.toLowerCase();
  const match = Object.entries(MEME_CATALOG).find(([name]) => name.includes(key));
  return match ? match[1] : null;
}

// Initialize
await loadMemes();

// Ensure default group exists
const stmt = db.prepare("INSERT OR IGNORE INTO groups (groupId, chatId, petMood, xp, level) VALUES (?, ?, ?, ?, ?)");
stmt.run("main", process.env.TARGET_CHAT_ID || "default", "chill", 0, 1);

// API Endpoints

// Receive messages from iMessage (only from friends, not self-sent)
fastify.post<{ Body: { chatId: string; userId: string; text: string; ts: string } }>(
  '/events/message',
  async (req, reply) => {
    const { chatId, userId, text, ts } = req.body;
    
    // Skip empty messages
    if (!text || text.trim().length === 0) {
      return { success: true, skipped: true, reason: "empty_message" };
    }
    
    // Store message
    db.prepare("INSERT INTO messages (chatId, userId, text, ts) VALUES (?, ?, ?, ?)")
      .run(chatId, userId, text, ts);
    
    // Keep only last 20 messages per chat (cleanup old messages)
    try {
      // Count messages for this chat
      const count: any = db.prepare("SELECT COUNT(*) as count FROM messages WHERE chatId = ?").get(chatId);
      if (count && count.count > 20) {
        // Delete oldest messages, keeping only the last 20
        db.prepare(`
          DELETE FROM messages
          WHERE chatId = ?
          AND id IN (
            SELECT id FROM messages
            WHERE chatId = ?
            ORDER BY ts ASC
            LIMIT ?
          )
        `).run(chatId, chatId, count.count - 20);
        console.log(`[CLEANUP] Cleaned up ${count.count - 20} old messages for chat ${chatId}`);
      }
    } catch (e) {
      // Ignore cleanup errors
      console.error("[CLEANUP] Error cleaning up old messages:", e);
    }
    
    // Ensure user exists
    db.prepare("INSERT OR IGNORE INTO users (userId, displayName) VALUES (?, ?)")
      .run(userId, userId.slice(0, 20));
    
    // Use Dedalus Agent for mood classification (async, don't block)
    (async () => {
      try {
        const recentMsgs: any[] = db.prepare(
          "SELECT text FROM messages WHERE userId = ? ORDER BY ts DESC LIMIT 10"
        ).all(userId);
        
        const agentResponse = await agent.callAgent("mood_classification", {
          messages: recentMsgs.map(m => m.text)
        });
        
        if (agentResponse.mood) {
          db.prepare("UPDATE users SET lastMood = ? WHERE userId = ?")
            .run(agentResponse.mood, userId);
          console.log(`[MOOD] ${userId.slice(0, 15)} → ${agentResponse.mood}`);
          
          // Generate voice response based on mood
          const responses: Record<string, string[]> = {
            excited: ["Yay! That's awesome! 🎉", "So exciting!", "Love the energy!"],
            stressed: ["Hang in there! 🐱", "You got this!", "Take a deep breath"],
            sad: ["Sending hugs 🤗", "I'm here for you", "It'll be okay"],
            neutral: ["Got it!", "Interesting!", "Cool!"]
          };
          
          const moodResponses = responses[agentResponse.mood] || responses.neutral;
          const responseText = moodResponses[Math.floor(Math.random() * moodResponses.length)];
          
          // Determine voice kind based on mood
          const voiceKind = agentResponse.mood === 'excited' ? 'cat' : 
                           agentResponse.mood === 'stressed' ? 'dog' :
                           agentResponse.mood === 'sad' ? 'bird' : 'cat';
          const voiceDuration = text.length > 50 ? 'long' : text.length > 20 ? 'medium' : 'short';
          
          // Save utterance for UI to pick up
          db.prepare(`
            INSERT OR REPLACE INTO utterances (userId, text, voiceKind, voiceDurationHint, ts)
            VALUES (?, ?, ?, ?, ?)
          `).run(userId, responseText, voiceKind, voiceDuration, new Date().toISOString());
          
          console.log(`[VOICE] Generated response for ${userId.slice(0, 15)}: "${responseText}" (${voiceKind}, ${voiceDuration})`);
        }
      } catch (e) {
        console.error("[MOOD] Classification error:", e);
      }
    })();
    
    // DISABLED: Automatic sticker generation
    // Use @moji send sticker command instead for manual control
    if (false) {
    (async () => {
      try {
        // Create a unique key for this message to prevent duplicate sticker generation
        // Use text + timestamp for uniqueness (since same text can be sent multiple times)
        const messageKey = `${chatId}:${userId}:${text}:${ts}`;
        const messageKeyNoTs = `${chatId}:${userId}:${text}`; // Fallback key without timestamp
        
        // Check if we've already generated a sticker for this message
        if (stickerGenerated.has(messageKey) || stickerGenerated.has(messageKeyNoTs)) {
          console.log(`[STICKER AUTO] ⏭️  Skipping duplicate message (already generated sticker): "${text.slice(0, 50)}${text.length > 50 ? '...' : ''}"`);
          return;
        }
        
        // Skip if message is too short (likely not substantive - "hi", "ok", emojis, etc.)
        if (text.length < 3) {
          console.log(`[STICKER AUTO] ⏭️  Skipping short message (${text.length} chars): "${text}"`);
          return;
        }
        
        // Get user mood for context
        const user: any = db.prepare("SELECT * FROM users WHERE userId = ?").get(userId);
        const userMood = user?.lastMood || "neutral";
        
        console.log(`[STICKER AUTO] Evaluating message (${text.length} chars) from FRIEND: "${text.slice(0, 50)}${text.length > 50 ? '...' : ''}"`);
        
        // Call agent to decide if we should generate a reaction sticker
        const stickerDecision = await agent.callAgent("sticker_decision", {
          messageText: text,
          userId,
          userMood
        });
        
        // Generate meme/sticker using Imgflip if agent recommends it
        console.log(`[STICKER AUTO] Decision: shouldGenerate=${stickerDecision.shouldGenerateSticker}, prompt="${stickerDecision.stickerPrompt}", style="${stickerDecision.stickerStyle}"`);
        
        if (stickerDecision.shouldGenerateSticker && stickerDecision.stickerPrompt) {
          const stickerStyle = stickerDecision.stickerStyle || "cute";
          const stickerPrompt = stickerDecision.stickerPrompt;
          
          console.log(`[STICKER AUTO] 🎨 Generating reaction meme: "${stickerPrompt}" (${stickerStyle})`);
          
          // Convert sticker prompt/style into meme template and text
          let templateHint = "drake"; // default
          let topText = "";
          let bottomText = "";
          
          // Clean up the prompt
          const cleanPrompt = stickerPrompt.replace(/^a /, "").replace(/ with .*$/, "").replace(/ animal.*$/, "");
          
          // Map sticker styles and prompts to meme templates (reactions only)
          if (stickerStyle === "funny" || stickerPrompt.includes("laughing") || stickerPrompt.includes("funny")) {
            templateHint = "drake hotline bling";
            topText = "Not reacting";
            bottomText = cleanPrompt.charAt(0).toUpperCase() + cleanPrompt.slice(1);
          } else if (stickerStyle === "excited" || stickerPrompt.includes("celebrating") || stickerPrompt.includes("happy")) {
            templateHint = "distracted boyfriend";
            topText = text.slice(0, 40) || "Normal messages";
            bottomText = cleanPrompt.charAt(0).toUpperCase() + cleanPrompt.slice(1) + "! 🎉";
          } else if (stickerStyle === "sad" || stickerPrompt.includes("stressed") || stickerPrompt.includes("supportive")) {
            templateHint = "this is fine";
            topText = text.slice(0, 40) || "Everything";
            bottomText = "This is fine";
          } else if (stickerPrompt.includes("study") || stickerPrompt.includes("exam") || stickerPrompt.includes("work")) {
            templateHint = "this is fine";
            topText = text.slice(0, 40) || "Studying";
            bottomText = "This is fine";
          } else if (stickerPrompt.includes("food") || stickerPrompt.includes("coffee") || stickerPrompt.includes("eat")) {
            templateHint = "drake hotline bling";
            topText = "Not having " + cleanPrompt;
            bottomText = "Having " + cleanPrompt + " 🍕";
          } else if (stickerPrompt.includes("sleep") || stickerPrompt.includes("tired")) {
            templateHint = "this is fine";
            topText = text.slice(0, 40) || "Being awake";
            bottomText = "Sleeping 😴";
          } else {
            // Default - use drake
            templateHint = "drake hotline bling";
            topText = text.slice(0, 40) || "Not " + cleanPrompt;
            bottomText = cleanPrompt.charAt(0).toUpperCase() + cleanPrompt.slice(1);
          }
          
          // Find template
          const template = findTemplate(templateHint) || Object.values(MEME_CATALOG)[0];
          
          if (!template) {
            console.log(`[STICKER AUTO] ❌ No meme template found for "${templateHint}"`);
            return;
          }
          
          console.log(`[STICKER AUTO] Using template: ${template.name}, Top: "${topText}", Bottom: "${bottomText}"`);
          
          // Generate meme via Imgflip
          const memeUrl = await captionMeme(template.id, topText, bottomText);
          
          if (memeUrl) {
            console.log(`[STICKER AUTO] ✅ Generated meme URL: ${memeUrl}`);
            
            // Add a small delay for reactions (so it doesn't feel too instant)
            // No delay for accompanying messages (user's own messages)
            if (!isFromMe) {
              const delay = 1000 + Math.random() * 1000; // 1-2 seconds for reactions
              console.log(`[STICKER AUTO] ⏱️  Adding ${Math.round(delay)}ms delay for reaction`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
            
            // Send meme to chat
            try {
              await request(`${BRIDGE_URL}/send`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chatId,
                  imageUrl: memeUrl
                })
              });
              
              // Mark this message as having generated a sticker (prevent duplicates)
              stickerGenerated.add(messageKey);
              stickerGenerated.add(messageKeyNoTs);
              
              // Clean up old entries (keep only last 50 to prevent memory leak)
              if (stickerGenerated.size > 100) {
                const entries = Array.from(stickerGenerated);
                stickerGenerated.clear();
                entries.slice(-50).forEach(key => stickerGenerated.add(key));
              }
              
              console.log(`[STICKER AUTO] ✅ Sent reaction meme to chat`);
            } catch (e: any) {
              console.error("[STICKER AUTO] ❌ Send error:", e.message || e);
            }
          } else {
            console.log(`[STICKER AUTO] ❌ Failed to generate meme URL`);
          }
        } else if (!stickerDecision.shouldGenerateSticker) {
          console.log(`[STICKER AUTO] ⏭️  Agent decided not to generate sticker`);
        } else {
          console.log(`[STICKER AUTO] ⚠️  Missing prompt or other issue`);
        }
      } catch (e: any) {
        console.error("[STICKER AUTO] Error:", e.message || e);
        if (e.stack) {
          console.error("[STICKER AUTO] Stack:", e.stack);
        }
      }
    })();
    }
    
    console.log(`[MSG] ${userId.slice(0, 15)}: ${text.slice(0, 50)}`);
    
    return { success: true };
  }
);

// Handle meme requests with Dedalus Agent
fastify.post<{ Body: { chatId: string; userId: string; topic: string } }>(
  '/events/meme-request',
  async (req, reply) => {
    const { chatId, userId, topic } = req.body;
    
    console.log(`[MEME] Request from ${userId.slice(0, 15)}: "${topic}"`);
    
    // Get user context
    const user: any = db.prepare("SELECT * FROM users WHERE userId = ?").get(userId);
    
    // Call Dedalus Agent for meme suggestion
    const agentResponse = await agent.callAgent("meme_suggestion", {
      topic,
      userMood: user?.lastMood || "neutral"
    });
    
    const templateHint = agentResponse.templateHint || "drake";
    const topText = agentResponse.topText || topic.slice(0, 80);
    const bottomText = agentResponse.bottomText || "Moji relates";
    
    // Find template
    const template = findTemplate(templateHint) || Object.values(MEME_CATALOG)[0];
    
    if (!template) {
      return { success: false, error: "No template found" };
    }
    
    console.log(`[MEME] Template: ${template.name}, Top: "${topText}", Bottom: "${bottomText}"`);
    
    // Generate meme via Imgflip
    const memeUrl = await captionMeme(template.id, topText, bottomText);
    
    if (memeUrl) {
      // Send to chat via bridge
      try {
        await request(`${BRIDGE_URL}/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatId,
            imageUrl: memeUrl
          })
        });
        
        console.log(`[MEME] ✅ Sent: ${template.name}`);
        return { success: true, memeUrl, template: template.name };
      } catch (e: any) {
        console.error("[MEME] Send error:", e);
        return { success: false, error: e.message };
      }
    }
    
    return { success: false, error: "Generation failed" };
  }
);

// Handle sticker generation requests
fastify.post<{ Body: { chatId: string; userId: string; prompt: string; style?: string } }>(
  '/events/sticker-request',
  async (req, reply) => {
    const { chatId, userId, prompt, style = "cute" } = req.body;
    
    console.log(`[STICKER] Request from ${userId.slice(0, 15)}: "${prompt}" (${style})`);
    
    // Generate sticker using DALL-E 3
    const stickerUrl = await generateSticker(prompt, style as "cute" | "funny" | "sad" | "excited");
    
    if (stickerUrl) {
      // Send to chat via bridge
      try {
        await request(`${BRIDGE_URL}/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatId,
            imageUrl: stickerUrl
          })
        });
        
        console.log(`[STICKER] ✅ Sent sticker: ${prompt}`);
        return { success: true, stickerUrl };
      } catch (e: any) {
        console.error("[STICKER] Send error:", e);
        return { success: false, error: e.message };
      }
    }
    
    return { success: false, error: "Generation failed" };
  }
);

// Manual sticker generation - react to the latest message
fastify.post<{ Body: { chatId: string; userId: string } }>(
  '/events/send-sticker',
  async (req, reply) => {
    const { chatId, userId } = req.body;
    
    console.log(`[SEND STICKER] Manual request from ${userId}`);
    
    // Get the most recent message (not including the @moji send sticker command)
    const recentMessages: any[] = db.prepare(
      "SELECT text, userId FROM messages WHERE chatId = ? ORDER BY ts DESC LIMIT 2"
    ).all(chatId);
    
    // Get the previous message (skip the @moji send sticker command)
    const targetMessage = recentMessages.find(m => !/@moji\s+send\s+sticker/i.test(m.text));
    
    if (!targetMessage || !targetMessage.text) {
      console.log(`[SEND STICKER] No previous message found to react to`);
      return { success: false, error: "No message to react to" };
    }
    
    console.log(`[SEND STICKER] Reacting to: "${targetMessage.text.slice(0, 50)}..."`);
    
    // Get user mood for context
    const user: any = db.prepare("SELECT * FROM users WHERE userId = ?").get(targetMessage.userId);
    const userMood = user?.lastMood || "neutral";
    
    // Call agent to decide sticker
    const stickerDecision = await agent.callAgent("sticker_decision", {
      messageText: targetMessage.text,
      userId: targetMessage.userId,
      userMood
    });
    
    if (!stickerDecision.shouldGenerateSticker || !stickerDecision.stickerPrompt) {
      console.log(`[SEND STICKER] Agent decided not to generate sticker`);
      return { success: false, error: "Agent declined" };
    }
    
    const stickerStyle = stickerDecision.stickerStyle || "cute";
    const stickerPrompt = stickerDecision.stickerPrompt;
    const text = targetMessage.text;
    
    console.log(`[SEND STICKER] 🎨 Generating: "${stickerPrompt}" (${stickerStyle})`);
    
    // Convert to meme template
    let templateHint = "drake";
    let topText = "";
    let bottomText = "";
    
    const cleanPrompt = stickerPrompt.replace(/^a /, "").replace(/ with .*$/, "").replace(/ animal.*$/, "");
    
    if (stickerStyle === "funny" || stickerPrompt.includes("laughing")) {
      templateHint = "drake hotline bling";
      topText = "Not reacting";
      bottomText = cleanPrompt.charAt(0).toUpperCase() + cleanPrompt.slice(1);
    } else if (stickerStyle === "excited" || stickerPrompt.includes("celebrating")) {
      templateHint = "distracted boyfriend";
      topText = text.slice(0, 40) || "Normal messages";
      bottomText = cleanPrompt.charAt(0).toUpperCase() + cleanPrompt.slice(1) + "! 🎉";
    } else if (stickerStyle === "sad" || stickerPrompt.includes("stressed")) {
      templateHint = "this is fine";
      topText = text.slice(0, 40) || "Everything";
      bottomText = "This is fine";
    } else {
      templateHint = "drake hotline bling";
      topText = text.slice(0, 40) || "Not " + cleanPrompt;
      bottomText = cleanPrompt.charAt(0).toUpperCase() + cleanPrompt.slice(1);
    }
    
    const template = findTemplate(templateHint) || Object.values(MEME_CATALOG)[0];
    
    if (!template) {
      console.log(`[SEND STICKER] ❌ No meme template found`);
      return { success: false, error: "No template" };
    }
    
    const memeUrl = await captionMeme(template.id, topText, bottomText);
    
    if (memeUrl) {
      try {
        await request(`${BRIDGE_URL}/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatId,
            imageUrl: memeUrl
          })
        });
        
        console.log(`[SEND STICKER] ✅ Sent reaction meme`);
        return { success: true, memeUrl };
      } catch (e: any) {
        console.error("[SEND STICKER] Send error:", e.message || e);
        return { success: false, error: e.message };
      }
    }
    
    return { success: false, error: "Generation failed" };
  }
);

// Upload and send audio to iMessage
fastify.post('/upload/audio', async (req, reply) => {
  try {
    const data = await req.file();
    if (!data) {
      return reply.status(400).send({ error: 'No file uploaded' });
    }

    const buffer = await data.toBuffer();
    const webmFilename = `audio_${Date.now()}.webm`;
    const webmPath = `${import.meta.dir}/../uploads/${webmFilename}`;
    
    // Get chat ID and user ID from query or use defaults
    const chatId = (req.query as any).chatId || process.env.TARGET_CHAT_ID;
    const userId = (req.query as any).userId || process.env.USER_PHONE;
    
    // Save WebM first
    await Bun.write(webmPath, buffer);
    
    // Convert to MP3 using ffmpeg
    const mp3Filename = webmFilename.replace('.webm', '.mp3');
    const mp3Path = `${import.meta.dir}/../uploads/${mp3Filename}`;
    
    let filepath = webmPath; // Default to WebM
    let filename = webmFilename;
    
    console.log(`[UPLOAD AUDIO] Converting ${webmFilename} to MP3...`);
    
    try {
      // Use ffmpeg to convert WebM to MP3
      const proc = Bun.spawn(['ffmpeg', '-i', webmPath, '-codec:a', 'libmp3lame', '-qscale:a', '2', mp3Path], {
        stdout: 'pipe',
        stderr: 'pipe'
      });
      
      await proc.exited;
      
      // Get MP3 file size
      const mp3File = Bun.file(mp3Path);
      const mp3Size = await mp3File.size;
      const sizeKB = Math.max(1, Math.round(mp3Size / 1024));
      const duration = Math.round(buffer.length / 16000); // Rough estimate
      
      console.log(`[UPLOAD AUDIO] Converted to ${mp3Filename} (${sizeKB}KB)`);
      console.log(`[UPLOAD AUDIO] Sending MP3 to iMessage...`);
      
      // Send MP3 file to iMessage via bridge
      await request(`${BRIDGE_URL}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          filePath: mp3Path,
          text: `🎤 Audio (${sizeKB}KB, ~${duration}s)`
        })
      });
      
      // Clean up WebM file (optional)
      // await Bun.write(webmPath, '');
      
      // Use MP3 path for moment storage
      filepath = mp3Path;
      filename = mp3Filename;
    } catch (conversionError: any) {
      console.error(`[UPLOAD AUDIO] Conversion failed: ${conversionError.message}`);
      console.log(`[UPLOAD AUDIO] Falling back to WebM...`);
      
      // Fall back to WebM if conversion fails
      const sizeKB = Math.max(1, Math.round(buffer.length / 1024));
      const duration = Math.round(buffer.length / 16000);
      
      await request(`${BRIDGE_URL}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          filePath: webmPath,
          text: `🎤 Audio WebM (${sizeKB}KB, ~${duration}s)`
        })
      });
      
      // filepath already set to webmPath above
    }
    
    // Save as moment
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    db.prepare(`
      INSERT INTO moments (eventId, groupId, userId, type, s3Url, durationSec, shortDesc, ts, shareable)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(eventId, "main", userId, 'audio', filepath, 10, 'Voice note from desktop', new Date().toISOString(), 1);
    
    console.log(`[UPLOAD AUDIO] ✅ Sent notification to iMessage`);
    
    return { success: true, filename, eventId, message: 'Audio saved and notification sent' };
  } catch (e: any) {
    console.error('[UPLOAD AUDIO] Error:', e);
    return reply.status(500).send({ error: e.message });
  }
});

// Upload and send image to iMessage
fastify.post('/upload/image', async (req, reply) => {
  try {
    const data = await req.file();
    if (!data) {
      return reply.status(400).send({ error: 'No file uploaded' });
    }

    const buffer = await data.toBuffer();
    const ext = data.mimetype.split('/')[1] || 'jpg';
    const filename = `image_${Date.now()}.${ext}`;
    const filepath = `${import.meta.dir}/../uploads/${filename}`;
    
    // Create uploads directory if it doesn't exist
    await Bun.write(filepath, buffer);
    
    // Get chat ID from query or use default
    const chatId = (req.query as any).chatId || process.env.TARGET_CHAT_ID;
    const userId = (req.query as any).userId || process.env.USER_PHONE;
    
    console.log(`[UPLOAD IMAGE] Saved ${filename}, sending to iMessage...`);
    
    // Send image file to iMessage via bridge
    await request(`${BRIDGE_URL}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId,
        filePath: filepath
      })
    });
    
    // Save as moment
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    db.prepare(`
      INSERT INTO moments (eventId, groupId, userId, type, s3Url, durationSec, shortDesc, ts, shareable)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(eventId, "main", userId, 'image', filepath, null, 'Image from desktop', new Date().toISOString(), 1);
    
    console.log(`[UPLOAD IMAGE] ✅ Sent to iMessage`);
    
    return { success: true, filename, eventId, filepath };
  } catch (e: any) {
    console.error('[UPLOAD IMAGE] Error:', e);
    return reply.status(500).send({ error: e.message });
  }
});

// Share audio/image moment (legacy endpoint, now just saves to DB)
fastify.post<{ Body: { userId: string; type: string; s3Url: string; durationSec?: number; shortDesc: string } }>(
  '/events/shareable',
  async (req, reply) => {
    const { userId, type, s3Url, durationSec, shortDesc } = req.body;
    
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    
    db.prepare(`
      INSERT INTO moments (eventId, groupId, userId, type, s3Url, durationSec, shortDesc, ts, shareable)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(eventId, "main", userId, type, s3Url, durationSec || null, shortDesc, new Date().toISOString(), 1);
    
    console.log(`[MOMENT] ${type} from ${userId.slice(0, 15)}: ${shortDesc}`);
    
    return { success: true, eventId };
  }
);

// Get pet state for desktop app
fastify.get<{ Querystring: { userId: string } }>(
  '/pet/state',
  async (req, reply) => {
    const { userId } = req.query;
    
    console.log(`[PET STATE] Request for userId: "${userId}"`);
    
    const group: any = db.prepare("SELECT * FROM groups WHERE groupId = ?").get("main");
    const utterance: any = db.prepare("SELECT * FROM utterances WHERE userId = ?").get(userId);
    
    console.log(`[PET STATE] Utterance found:`, utterance ? `"${utterance.text}"` : 'null');
    
    let lastUtterance = null;
    if (utterance) {
      lastUtterance = {
        text: utterance.text,
        voiceKind: utterance.voiceKind,
        voiceDurationHint: utterance.voiceDurationHint,
        audioMomentToPlay: utterance.audioMomentId ? getRandomMoment("audio") : null,
        imageMomentToShow: utterance.imageMomentId ? getRandomMoment("image") : null,
      };
    }
    
    const response = {
      petMood: group?.petMood || "chill",
      headline: getPetHeadline(group?.petMood),
      lastUtterance
    };
    
    console.log(`[PET STATE] Returning:`, JSON.stringify(response, null, 2));
    
    return response;
  }
);

// User preferences
fastify.get<{ Querystring: { userId: string } }>(
  '/user/preferences',
  async (req, reply) => {
    const { userId } = req.query;
    const user: any = db.prepare("SELECT * FROM users WHERE userId = ?").get(userId);
    
    if (!user) {
      return {
        shareWins: true,
        shareAudio: true,
        shareImages: true,
        shareMemes: true,
        askBeforeShare: false
      };
    }
    
    return {
      shareWins: Boolean(user.shareWins),
      shareAudio: Boolean(user.shareAudio),
      shareImages: Boolean(user.shareImages),
      shareMemes: Boolean(user.shareMemes),
      askBeforeShare: Boolean(user.askBeforeShare)
    };
  }
);

fastify.post<{ Body: { userId: string; prefs: any } }>(
  '/user/preferences',
  async (req, reply) => {
    const { userId, prefs } = req.body;
    
    db.prepare(`
      INSERT INTO users (userId, shareWins, shareAudio, shareImages, shareMemes, askBeforeShare)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(userId) DO UPDATE SET
        shareWins = excluded.shareWins,
        shareAudio = excluded.shareAudio,
        shareImages = excluded.shareImages,
        shareMemes = excluded.shareMemes,
        askBeforeShare = excluded.askBeforeShare
    `).run(
      userId,
      prefs.shareWins ? 1 : 0,
      prefs.shareAudio ? 1 : 0,
      prefs.shareImages ? 1 : 0,
      prefs.shareMemes ? 1 : 0,
      prefs.askBeforeShare ? 1 : 0
    );
    
    return { success: true };
  }
);

// Presigned URL for S3 upload
fastify.post<{ Body: { type: string; userId: string } }>(
  '/media/presign',
  async (req, reply) => {
    const { type, userId } = req.body;
    
    if (!process.env.AWS_BUCKET_NAME) {
      return { uploadUrl: `/mock-upload/${type}`, finalUrl: `/mock-media/${type}` };
    }
    
    const s3 = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });
    const key = `${userId}/${Date.now()}.${type === 'audio' ? 'webm' : 'jpg'}`;
    
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    });
    
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
    const finalUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    
    return { uploadUrl, finalUrl };
  }
);

fastify.get('/health', async () => ({ status: 'ok' }));

// Helper functions - mood and meme logic now handled by Dedalus Agent

async function captionMeme(templateId: string, topText: string, bottomText: string): Promise<string | null> {
  if (!IMGFLIP_USERNAME || !IMGFLIP_PASSWORD) return null;
  
  const form = new URLSearchParams();
  form.set("template_id", templateId);
  form.set("username", IMGFLIP_USERNAME);
  form.set("password", IMGFLIP_PASSWORD);
  form.set("boxes[0][text]", topText);
  form.set("boxes[1][text]", bottomText);
  
  try {
    const res = await request("https://api.imgflip.com/caption_image", {
      method: "POST",
      body: form.toString(),
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });
    const j: any = await res.body.json();
    return j?.success ? j.data.url : null;
  } catch (e) {
    console.error("Imgflip error:", e);
    return null;
  }
}

function getPetHeadline(mood: string): string {
  const headlines: Record<string, string> = {
    chill: "Moji is relaxing...",
    excited: "Moji is bouncing around!",
    concerned: "Moji looks worried about the group",
    sleepy: "Moji is taking a nap... 💤"
  };
  return headlines[mood] || "Moji is here!";
}

function getRandomMoment(type: string): any | null {
  const moment: any = db.prepare(`
    SELECT eventId, s3Url, shortDesc 
    FROM moments 
    WHERE type = ? AND shareable = 1 
    ORDER BY RANDOM() 
    LIMIT 1
  `).get(type);
  
  return moment ? {
    eventId: moment.eventId,
    s3Url: moment.s3Url,
    label: moment.shortDesc
  } : null;
}

// Tick endpoint for periodic agent decisions (uses Dedalus Agent)
fastify.post('/tick', async (req, reply) => {
  console.log("[TICK] Running pet decision cycle...");
  
  // Get summary
  const userMoods: any[] = db.prepare("SELECT userId, lastMood FROM users").all();
  const pendingMoments: any[] = db.prepare("SELECT * FROM moments WHERE shareable = 1 LIMIT 5").all();
  const group: any = db.prepare("SELECT * FROM groups WHERE groupId = ?").get("main");
  
  // Call Dedalus Agent for pet decision
  try {
    const agentResponse = await agent.callAgent("pet_decision", {
      userMoods,
      shareableMoments: pendingMoments,
      petXP: group?.xp || 0,
      petLevel: group?.level || 1
    });
    
    if (agentResponse.action === "speak_to_user" && agentResponse.utterance) {
      const { targetUserId, utterance } = agentResponse;
      
      // Generate voice audio using ElevenLabs
      let audioUrl: string | null = null;
      if (process.env.ELEVENLABS_API_KEY) {
        try {
          const audioBuffer = await generateAnimalVoice(
            utterance.text,
            utterance.voiceKind,
            utterance.voiceDurationHint
          );
          
          if (audioBuffer) {
            // Upload to S3 or save locally
            // For now, we'll store it as a moment
            const eventId = `voice_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
            
            // If S3 is configured, upload there
            if (process.env.AWS_BUCKET_NAME && process.env.AWS_BUCKET_NAME.trim() !== "") {
              try {
                const s3 = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });
                const key = `voices/${targetUserId}/${eventId}.mp3`;
                
                await s3.send(new PutObjectCommand({
                  Bucket: process.env.AWS_BUCKET_NAME,
                  Key: key,
                  Body: audioBuffer,
                  ContentType: "audio/mpeg",
                }));
                
                audioUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
                console.log(`[TICK] ✅ Uploaded audio to S3: ${audioUrl}`);
              } catch (s3Error) {
                console.error("[TICK] S3 upload failed, falling back to local save:", s3Error);
                // Fall through to local save
              }
            }
            
            // Save to local file (always, or as fallback if S3 failed)
            if (!audioUrl || !audioUrl.startsWith("https://")) {
              const fs = await import("fs/promises");
              const path = await import("path");
              const audioDir = path.join(process.cwd(), "audio");
              try {
                await fs.mkdir(audioDir, { recursive: true });
                const filename = path.join(audioDir, `voice_${Date.now()}_${Math.random().toString(36).slice(2, 9)}.mp3`);
                await fs.writeFile(filename, audioBuffer);
                audioUrl = `file://${filename}`;
                console.log(`[TICK] ✅ Saved audio to ${filename}`);
                console.log(`[TICK] Audio file size: ${audioBuffer.length} bytes`);
              } catch (e) {
                console.error("[TICK] ❌ Failed to save audio file:", e);
                console.error("[TICK] Error details:", e instanceof Error ? e.stack : e);
                // Fallback to base64 if file save fails
                audioUrl = `data:audio/mpeg;base64,${audioBuffer.toString("base64").slice(0, 100)}...`;
              }
            }
            
            console.log(`[TICK] ✅ Generated voice audio for ${targetUserId?.slice(0, 15)}`);
          }
        } catch (e) {
          console.error("[TICK] Voice generation error:", e);
        }
      }
      
      db.prepare(`
        INSERT OR REPLACE INTO utterances (userId, text, voiceKind, voiceDurationHint, ts)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        targetUserId,
        utterance.text,
        utterance.voiceKind,
        utterance.voiceDurationHint,
        new Date().toISOString()
      );
      
      // If audio was generated, store it as a moment
      if (audioUrl) {
        db.prepare(`
          INSERT INTO moments (eventId, groupId, userId, type, s3Url, durationSec, shortDesc, ts, shareable)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          `voice_${Date.now()}`,
          "main",
          targetUserId,
          "audio",
          audioUrl,
          utterance.voiceDurationHint === "short" ? 3 : utterance.voiceDurationHint === "medium" ? 5 : 8,
          `Voice: ${utterance.text.slice(0, 50)}`,
          new Date().toISOString(),
          0 // Not shareable, private to user
        );
      }
      
      console.log(`[TICK] ✅ Utterance for ${targetUserId?.slice(0, 15)}: "${utterance.text}"`);
    } else if (agentResponse.action === "broadcast_in_chat" && agentResponse.chatMessage) {
      // Broadcast to group
      const chatId = group?.chatId || process.env.TARGET_CHAT_ID;
      if (chatId) {
        await request(`${BRIDGE_URL}/bridge/say-text`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatId,
            text: agentResponse.chatMessage
          })
        });
        console.log(`[TICK] ✅ Broadcast: "${agentResponse.chatMessage}"`);
      }
    } else {
      console.log(`[TICK] Agent action: ${agentResponse.action || "silent"}`);
    }
  } catch (e) {
    console.error("[TICK] Agent error:", e);
  }
  
  return { success: true };
});

await fastify.listen({ port: PORT, host: '0.0.0.0' });
console.log(`🧠 Pet Brain listening on port ${PORT}`);

// Start tick loop
setInterval(async () => {
  try {
    await request(`http://localhost:${PORT}/tick`, { method: "POST" });
  } catch (e) {
    // Ignore
  }
}, 60000); // Every minute


