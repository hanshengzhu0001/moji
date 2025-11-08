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

// SQLite database
const db = new Database("nori.db");

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

// Receive messages from iMessage
fastify.post<{ Body: { chatId: string; userId: string; text: string; ts: string } }>(
  '/events/message',
  async (req, reply) => {
    const { chatId, userId, text, ts } = req.body;
    
    // Store message
    db.prepare("INSERT INTO messages (chatId, userId, text, ts) VALUES (?, ?, ?, ?)")
      .run(chatId, userId, text, ts);
    
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
        }
      } catch (e) {
        console.error("[MOOD] Classification error:", e);
      }
    })();
    
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
        await request(`${BRIDGE_URL}/bridge/say-meme`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatId,
            imageUrl: memeUrl,
            text: "🐱 Moji meme drop!"
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
        await request(`${BRIDGE_URL}/bridge/say-meme`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatId,
            imageUrl: stickerUrl,
            text: "🎨 Moji sticker!"
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

// Share audio/image moment
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
    
    const group: any = db.prepare("SELECT * FROM groups WHERE groupId = ?").get("main");
    const utterance: any = db.prepare("SELECT * FROM utterances WHERE userId = ?").get(userId);
    
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
    
    return {
      petMood: group?.petMood || "chill",
      headline: getPetHeadline(group?.petMood),
      lastUtterance
    };
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
            if (process.env.AWS_BUCKET_NAME) {
              const s3 = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });
              const key = `voices/${targetUserId}/${eventId}.mp3`;
              
              await s3.send(new PutObjectCommand({
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: key,
                Body: audioBuffer,
                ContentType: "audio/mpeg",
              }));
              
              audioUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
            } else {
              // Fallback: save to local file for testing
              const fs = await import("fs/promises");
              const path = await import("path");
              const audioDir = path.join(process.cwd(), "audio");
              try {
                await fs.mkdir(audioDir, { recursive: true });
                const filename = path.join(audioDir, `voice_${Date.now()}_${Math.random().toString(36).slice(2, 9)}.mp3`);
                await fs.writeFile(filename, audioBuffer);
                audioUrl = `file://${filename}`;
                console.log(`[TICK] ✅ Saved audio to ${filename}`);
              } catch (e) {
                console.error("[TICK] Failed to save audio file:", e);
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


