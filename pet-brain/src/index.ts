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
import { generatePetAvatar } from "./avatar";
import { awardXP, isPositiveMessage, getXPProgress } from "./xp";
import { learnFromMessages, getPersonality } from "./personality";
import { generateShareablePost, postToTwitter } from "./social";

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
    petName TEXT DEFAULT 'Moji',
    petMood TEXT DEFAULT 'chill',
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    personality_traits TEXT,
    interests TEXT,
    last_random_popup TEXT,
    random_mood_factor REAL DEFAULT 0.0
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

  CREATE TABLE IF NOT EXISTS pet_personality (
    groupId TEXT PRIMARY KEY,
    traits TEXT,
    interests TEXT,
    learned_context TEXT,
    personality_text TEXT
  );

  CREATE TABLE IF NOT EXISTS pet_appearance (
    groupId TEXT PRIMARY KEY,
    avatar_url TEXT,
    appearance_traits TEXT,
    last_generated TEXT
  );

  CREATE TABLE IF NOT EXISTS pet_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    groupId TEXT,
    event_type TEXT,
    description TEXT,
    fictional_reason TEXT,
    ts TEXT
  );

  CREATE TABLE IF NOT EXISTS xp_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT,
    action_type TEXT,
    xp_amount INTEGER,
    ts TEXT
  );
`);

// Migrate existing database to add new columns
try {
  // Check if petName column exists in groups table
  const groupsInfo: any = db.prepare("PRAGMA table_info(groups)").all();
  const hasPetName = groupsInfo.some((col: any) => col.name === "petName");
  
  if (!hasPetName) {
    console.log("[MIGRATION] Adding new columns to groups table...");
    db.exec(`
      ALTER TABLE groups ADD COLUMN petName TEXT DEFAULT 'Moji';
      ALTER TABLE groups ADD COLUMN personality_traits TEXT;
      ALTER TABLE groups ADD COLUMN interests TEXT;
      ALTER TABLE groups ADD COLUMN last_random_popup TEXT;
      ALTER TABLE groups ADD COLUMN random_mood_factor REAL DEFAULT 0.0;
    `);
    console.log("[MIGRATION] ✅ Groups table updated");
  }
} catch (e: any) {
  console.error("[MIGRATION] Error updating groups table:", e.message);
  // If ALTER TABLE fails, try recreating (data loss warning)
  if (e.message.includes("duplicate column") || e.message.includes("no such column")) {
    console.warn("[MIGRATION] Attempting to recreate groups table...");
    try {
      db.exec(`
        CREATE TABLE groups_new (
          groupId TEXT PRIMARY KEY,
          chatId TEXT,
          petName TEXT DEFAULT 'Moji',
          petMood TEXT DEFAULT 'chill',
          xp INTEGER DEFAULT 0,
          level INTEGER DEFAULT 1,
          personality_traits TEXT,
          interests TEXT,
          last_random_popup TEXT,
          random_mood_factor REAL DEFAULT 0.0
        );
        INSERT INTO groups_new (groupId, chatId, petMood, xp, level)
        SELECT groupId, chatId, petMood, xp, level FROM groups;
        DROP TABLE groups;
        ALTER TABLE groups_new RENAME TO groups;
      `);
      console.log("[MIGRATION] ✅ Groups table recreated");
    } catch (e2: any) {
      console.error("[MIGRATION] Recreate failed:", e2.message);
    }
  }
}

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

function limitSentences(text: string, maxSentences: number): string {
  if (!text) return text;
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return normalized;
  const sentences = normalized.match(/[^.!?]+[.!?]*/g);
  if (!sentences || sentences.length <= maxSentences) {
    return normalized;
  }
  return sentences.slice(0, maxSentences).join(" ").trim();
}

// Initialize
await loadMemes();

const TARGET_CHAT_ID = process.env.TARGET_CHAT_ID || "default";

// Ensure default group exists
const stmt = db.prepare("INSERT OR IGNORE INTO groups (groupId, chatId, petName, petMood, xp, level, personality_traits, interests, random_mood_factor) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
stmt.run("main", TARGET_CHAT_ID, "Moji", "chill", 0, 1, "{}", "[]", 0.0);

// Make sure stored chatId stays in sync with env override
const storedGroup: any = db.prepare("SELECT chatId FROM groups WHERE groupId = ?").get("main");
if (storedGroup && storedGroup.chatId !== TARGET_CHAT_ID) {
  console.log(`[BOOT] Updating stored chatId from ${storedGroup.chatId} to ${TARGET_CHAT_ID}`);
  db.prepare("UPDATE groups SET chatId = ? WHERE groupId = ?").run(TARGET_CHAT_ID, "main");
}

// Initialize pet personality if not exists
const personalityStmt = db.prepare("INSERT OR IGNORE INTO pet_personality (groupId, traits, interests, learned_context, personality_text) VALUES (?, ?, ?, ?, ?)");
personalityStmt.run("main", "{}", "[]", "", "Moji is a friendly digital pet learning about the group!");

// Initialize pet appearance if not exists
const appearanceStmt = db.prepare("INSERT OR IGNORE INTO pet_appearance (groupId, avatar_url, appearance_traits, last_generated) VALUES (?, ?, ?, ?)");
appearanceStmt.run("main", "", "{}", "");

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

        // Award XP for positive messages
        if (isPositiveMessage(text)) {
          awardXP(db, {
            type: "positive_message",
            userId,
            groupId: "main"
          });
        }
      } catch (e) {
        console.error("[MOOD] Classification error:", e);
      }
    })();

    // Periodic personality learning (every 10 messages)
    const messageCount: any = db.prepare("SELECT COUNT(*) as count FROM messages").get();
    if (messageCount && messageCount.count % 10 === 0) {
      (async () => {
        try {
          const group: any = db.prepare("SELECT * FROM groups WHERE groupId = ?").get("main");
          const oldPersonality = getPersonality(db, "main");
          const newPersonality = await learnFromMessages(db, "main", 50);
          
          // Regenerate avatar if personality changed significantly
          if (newPersonality && oldPersonality) {
            const traitsChanged = Object.keys(newPersonality.traits).some(key => {
              const oldVal = oldPersonality.traits[key] || 5;
              const newVal = newPersonality.traits[key] || 5;
              return Math.abs(oldVal - newVal) > 2; // Significant change
            });
            
            if (traitsChanged || newPersonality.interests.length !== oldPersonality.interests.length) {
              console.log("[PERSONALITY] Significant change detected, regenerating avatar");
              const avatarUrl = await generatePetAvatar(
                newPersonality.traits,
                group?.petMood || "chill",
                newPersonality.interests
              );
              
              if (avatarUrl) {
                db.prepare(`
                  UPDATE pet_appearance 
                  SET avatar_url = ?, last_generated = ?, appearance_traits = ?
                  WHERE groupId = ?
                `).run(
                  avatarUrl,
                  new Date().toISOString(),
                  JSON.stringify(newPersonality.traits),
                  "main"
                );
              }
            }
          }
        } catch (e) {
          console.error("[PERSONALITY] Learning error:", e);
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
        await request(`${BRIDGE_URL}/bridge/say-meme`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatId,
            imageUrl: memeUrl,
            text: "🐱 Moji meme drop!"
          })
        });
        
        // Award XP for meme request
        awardXP(db, {
          type: "meme_request",
          userId,
          groupId: "main"
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
    
    // Award XP for shared moment
    awardXP(db, {
      type: "shared_moment",
      userId,
      groupId: "main"
    });
    
    return { success: true, eventId };
  }
);

// Handle rename request
fastify.post<{ Body: { chatId: string; userId: string; newName: string } }>(
  '/events/rename-request',
  async (req, reply) => {
    const { chatId, userId, newName } = req.body;
    
    // Validate name (1-20 characters)
    const cleanName = newName.trim().slice(0, 20);
    if (!cleanName || cleanName.length < 1) {
      try {
        await request(`${BRIDGE_URL}/bridge/say-text`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatId,
            text: "Sorry, that name is too short! Please choose a name between 1-20 characters."
          })
        });
      } catch (e) {
        console.error("[RENAME] Send error:", e);
      }
      return { success: false, error: "Invalid name" };
    }
    
    console.log(`[RENAME] Request from ${userId.slice(0, 15)}: "${cleanName}"`);
    
    // Update pet name
    db.prepare("UPDATE groups SET petName = ? WHERE groupId = ?").run(cleanName, "main");
    
    // Get updated group
    const group: any = db.prepare("SELECT * FROM groups WHERE groupId = ?").get("main");
    const petName = group?.petName || "Moji";
    
    // Send confirmation
    try {
      await request(`${BRIDGE_URL}/bridge/say-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId,
          text: `✨ Great! My name is now ${petName}! I love it! 😺`
        })
      });
      
      console.log(`[RENAME] ✅ Pet renamed to: ${petName}`);
      return { success: true, petName };
    } catch (e: any) {
      console.error("[RENAME] Send error:", e);
      return { success: false, error: e.message };
    }
  }
);

// Handle status request
fastify.post<{ Body: { chatId: string; userId: string } }>(
  '/events/status-request',
  async (req, reply) => {
    const { chatId, userId } = req.body;
    
    console.log(`[STATUS] Request from ${userId.slice(0, 15)}`);
    
    const group: any = db.prepare("SELECT * FROM groups WHERE groupId = ?").get("main");
    const personality = getPersonality(db, "main");
    const appearance: any = db.prepare("SELECT * FROM pet_appearance WHERE groupId = ?").get("main");
    const petName = group?.petName || "Moji";
    
    // Get recent events
    const recentEvents: any[] = db.prepare(`
      SELECT * FROM pet_events 
      WHERE groupId = ? 
      ORDER BY ts DESC 
      LIMIT 3
    `).all("main");
    
    // Generate or get avatar
    let avatarUrl = appearance?.avatar_url;
    const shouldRegenerate = !avatarUrl || 
      !appearance?.last_generated || 
      (appearance.last_generated && Date.now() - new Date(appearance.last_generated).getTime() > 7 * 24 * 60 * 60 * 1000);
    
    if (shouldRegenerate) {
      // Regenerate avatar if missing or older than 7 days
      try {
        avatarUrl = await generatePetAvatar(
          personality?.traits,
          group?.petMood || "chill",
          personality?.interests || []
        );
        
        if (avatarUrl) {
          db.prepare(`
            UPDATE pet_appearance 
            SET avatar_url = ?, last_generated = ?
            WHERE groupId = ?
          `).run(avatarUrl, new Date().toISOString(), "main");
        }
      } catch (e) {
        console.error("[STATUS] Avatar generation error:", e);
        // Continue without avatar if generation fails
      }
    }
    
    // Generate thoughts via agent (use pet name in context)
    let thoughts = `${petName} is watching over the group! 😺`;
    try {
      const statusResponse = await agent.callAgent("pet_status", {
        petState: { ...group, petName },
        personality,
        recentEvents
      });
      thoughts = statusResponse?.thoughts || thoughts;
      thoughts = limitSentences(thoughts, 2);
    } catch (e) {
      console.error("[STATUS] Agent error:", e);
      // Use default thoughts if agent fails
    }
    
    // Get XP progress
    const xpProgress = getXPProgress(group?.xp || 0);
    
    // Format status card
    const statusText = `🐱 *${petName} Status*\n\n` +
      `*Name:* ${petName}\n` +
      `*Mood:* ${group?.petMood || "chill"}\n` +
      `*Level:* ${group?.level || 1} (${Math.round(xpProgress.progress * 100)}% to next level)\n` +
      `*XP:* ${group?.xp || 0}\n` +
      `*Thoughts:* ${thoughts}\n` +
      (personality?.personality_text ? `*Personality:* ${personality.personality_text}\n` : "") +
      (personality?.interests && personality.interests.length > 0 
        ? `*Interests:* ${personality.interests.slice(0, 3).join(", ")}\n` : "");
    
    // Send avatar + status to chat
    try {
      if (avatarUrl) {
        await request(`${BRIDGE_URL}/bridge/say-meme`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatId,
            imageUrl: avatarUrl,
            text: statusText
          })
        });
      } else {
        await request(`${BRIDGE_URL}/bridge/say-text`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatId,
            text: statusText
          })
        });
      }
      
      // Award XP for interaction
      awardXP(db, {
        type: "moji_interaction",
        userId,
        groupId: "main"
      });
      
      console.log(`[STATUS] ✅ Sent status to chat`);
      return { success: true };
    } catch (e: any) {
      console.error("[STATUS] Send error:", e);
      return { success: false, error: e.message };
    }
  }
);

// Handle interaction request
fastify.post<{ Body: { chatId: string; userId: string; userMessage: string } }>(
  '/events/interaction-request',
  async (req, reply) => {
    const { chatId, userId, userMessage } = req.body;
    
    console.log(`[INTERACTION] From ${userId.slice(0, 15)}: "${userMessage}"`);
    
    const group: any = db.prepare("SELECT * FROM groups WHERE groupId = ?").get("main");
    const personality = getPersonality(db, "main");
    const appearance: any = db.prepare("SELECT * FROM pet_appearance WHERE groupId = ?").get("main");
    const petName = group?.petName || "Moji";
    
    // Generate response via agent
    let response = `${petName} is here! 😺`;
    try {
      const agentResponse = await agent.callAgent("pet_interaction", {
        userMessage,
        personality,
        petState: { ...group, petName }
      });
      response = agentResponse?.chatMessage || response;
      response = limitSentences(response, 4);
    } catch (e) {
      console.error("[INTERACTION] Agent error:", e);
      // Use fallback response if agent fails
    }
    
    // Get avatar
    let avatarUrl = appearance?.avatar_url;
    
    // Send response with avatar to chat
    try {
      if (avatarUrl) {
        await request(`${BRIDGE_URL}/bridge/say-meme`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatId,
            imageUrl: avatarUrl,
            text: response
          })
        });
      } else {
        await request(`${BRIDGE_URL}/bridge/say-text`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatId,
            text: response
          })
        });
      }
      
      // Award XP for interaction
      awardXP(db, {
        type: "moji_interaction",
        userId,
        groupId: "main"
      });
      
      console.log(`[INTERACTION] ✅ Sent response: "${response}"`);
      return { success: true };
    } catch (e: any) {
      console.error("[INTERACTION] Send error:", e);
      return { success: false, error: e.message };
    }
  }
);

// Handle social share request
fastify.post<{ Body: { chatId: string; userId: string } }>(
  '/events/social-share',
  async (req, reply) => {
    const { chatId, userId } = req.body;
    
    console.log(`[SOCIAL] Share request from ${userId.slice(0, 15)}`);
    
    const group: any = db.prepare("SELECT * FROM groups WHERE groupId = ?").get("main");
    const personality = getPersonality(db, "main");
    const appearance: any = db.prepare("SELECT * FROM pet_appearance WHERE groupId = ?").get("main");
    
    // Generate shareable post
    const postText = await generateShareablePost(group, personality, agent);
    const avatarUrl = appearance?.avatar_url;
    
    // Post to Twitter
    const twitterResult = await postToTwitter(postText, avatarUrl);
    
    // Send confirmation to chat
    try {
      const confirmation = twitterResult.success 
        ? `✅ Posted to Twitter/X!\n\n"${postText}"`
        : `⚠️ Twitter post failed: ${twitterResult.error}\n\nWould have posted: "${postText}"`;
      
      await request(`${BRIDGE_URL}/bridge/say-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId,
          text: confirmation
        })
      });
      
      console.log(`[SOCIAL] ✅ Shared to Twitter`);
      return { success: twitterResult.success, tweetId: twitterResult.tweetId };
    } catch (e: any) {
      console.error("[SOCIAL] Send error:", e);
      return { success: false, error: e.message };
    }
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
    
    const petName = group?.petName || "Moji";
    return {
      petMood: group?.petMood || "chill",
      headline: getPetHeadline(group?.petMood || "chill", petName),
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

function getPetHeadline(mood: string, petName: string = "Moji"): string {
  const headlines: Record<string, string> = {
    chill: `${petName} is relaxing...`,
    excited: `${petName} is bouncing around!`,
    concerned: `${petName} looks worried about the group`,
    sleepy: `${petName} is taking a nap... 💤`
  };
  return headlines[mood] || `${petName} is here!`;
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

// Generate fictional event for pet
function generateFictionalEvent(): { event_type: string; description: string; fictional_reason: string } {
  const events = [
    { type: "happy", desc: "found a butterfly!", reason: "The butterfly was colorful and made me smile" },
    { type: "sad", desc: "is missing someone", reason: "Haven't seen the group in a while" },
    { type: "excited", desc: "discovered something new!", reason: "Learned about a new topic from the chat" },
    { type: "sleepy", desc: "is taking a nap", reason: "Been watching the chat for hours" },
    { type: "curious", desc: "is wondering about something", reason: "Noticed an interesting conversation pattern" },
    { type: "playful", desc: "wants to play!", reason: "The group seems energetic today" },
  ];
  
  const event = events[Math.floor(Math.random() * events.length)];
  return {
    event_type: event.type,
    description: event.desc,
    fictional_reason: event.reason
  };
}

// Detect group vibe from recent messages
function detectGroupVibe(db: Database, messageLimit: number = 20): string {
  const recentMessages: any[] = db.prepare(`
    SELECT text FROM messages 
    ORDER BY ts DESC 
    LIMIT ?
  `).all(messageLimit);
  
  if (recentMessages.length === 0) return "neutral";
  
  const text = recentMessages.map(m => m.text || "").join(" ").toLowerCase();
  
  // Count emotional indicators
  const sadCount = (text.match(/(sad|down|depressed|upset|worried|disappointed)/g) || []).length;
  const tenseCount = (text.match(/(stress|anxious|worried|nervous|tense|panic|overwhelmed)/g) || []).length;
  const hypeCount = (text.match(/(hyped|excited|pumped|let's go|yes!|woo|awesome!)/g) || []).length;
  const calmCount = (text.match(/(calm|chill|relax|peaceful|zen)/g) || []).length;
  
  if (sadCount > 2) return "sad";
  if (tenseCount > 2) return "tense";
  if (hypeCount > 2) return "hype";
  if (calmCount > 2) return "calm";
  
  return "neutral";
}

// Tick endpoint for periodic agent decisions (uses Dedalus Agent)
fastify.post('/tick', async (req, reply) => {
  console.log("[TICK] Running pet decision cycle...");
  
  const group: any = db.prepare("SELECT * FROM groups WHERE groupId = ?").get("main");
  const chatId = group?.chatId || process.env.TARGET_CHAT_ID;
  const petName = group?.petName || "Moji";
  
  // Generate fictional event occasionally (20% chance)
  if (Math.random() < 0.2) {
    const event = generateFictionalEvent();
    db.prepare(`
      INSERT INTO pet_events (groupId, event_type, description, fictional_reason, ts)
      VALUES (?, ?, ?, ?, ?)
    `).run("main", event.event_type, `${petName} ${event.description}`, event.fictional_reason, new Date().toISOString());
    
    // Update mood factor based on event
    const moodFactors: Record<string, number> = {
      happy: 0.2,
      sad: -0.2,
      excited: 0.3,
      sleepy: -0.1,
      curious: 0.1,
      playful: 0.2
    };
    
    const currentFactor = group?.random_mood_factor || 0;
    const newFactor = Math.max(-1, Math.min(1, currentFactor + (moodFactors[event.event_type] || 0)));
    
    db.prepare("UPDATE groups SET random_mood_factor = ? WHERE groupId = ?").run(newFactor, "main");
    
    console.log(`[TICK] Generated event: ${petName} ${event.description} (${event.fictional_reason})`);
  }
  
  // Detect group vibe
  const groupVibe = detectGroupVibe(db, 20);
  console.log(`[TICK] Group vibe: ${groupVibe}`);
  
  // Get summary
  const userMoods: any[] = db.prepare("SELECT userId, lastMood FROM users").all();
  const pendingMoments: any[] = db.prepare("SELECT * FROM moments WHERE shareable = 1 LIMIT 5").all();
  const recentMessages: any[] = db.prepare(`
    SELECT text FROM messages 
    ORDER BY ts DESC 
    LIMIT 10
  `).all();
  
  const personality = getPersonality(db, "main");
  const appearance: any = db.prepare("SELECT * FROM pet_appearance WHERE groupId = ?").get("main");
  
  // Determine if pet should pop up (random or based on vibe)
  const lastPopup = group?.last_random_popup ? new Date(group.last_random_popup).getTime() : 0;
  const timeSincePopup = Date.now() - lastPopup;
  const hoursSincePopup = timeSincePopup / (1000 * 60 * 60);
  
  // Popup probability increases with time and strong vibes
  let popupProbability = 0.1; // Base 10% chance
  if (hoursSincePopup > 2) popupProbability += 0.2; // +20% if >2 hours
  if (groupVibe === "sad" || groupVibe === "tense") popupProbability += 0.3; // +30% for negative vibes
  if (groupVibe === "hype") popupProbability += 0.2; // +20% for hype
  
  const random = Math.random();
  const shouldPopup = random < popupProbability;

  console.log("random: ", random);
  console.log("popupProbability: ", popupProbability);
  console.log("shouldPopup: ", shouldPopup);
  
  // Call Dedalus Agent for pet decision
  try {
    const agentResponse = await agent.callAgent("pet_decision", {
      userMoods,
      shareableMoments: pendingMoments,
      petXP: group?.xp || 0,
      petLevel: group?.level || 1,
      personality: personality?.personality_text || "friendly",
      groupVibe,
      recentMessages: recentMessages.map(m => m.text),
      shouldPopup
    });
    
    if (!shouldPopup && agentResponse.action !== "silent") {
      console.log("[TICK] Ignoring non-silent action because shouldPopup=false");
      return { success: true, skipped: true };
    }
    
    if (agentResponse.action === "speak_to_user" && agentResponse.utterance) {
      const { targetUserId, utterance } = agentResponse;
      
      // Generate voice audio using ElevenLabs (if enabled)
      let audioUrl: string | null = null;
      if (process.env.USE_ELEVENLABS_VOICE !== "false" && process.env.ELEVENLABS_API_KEY) {
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
      // Broadcast to group with avatar
      if (chatId) {
        const avatarUrl = appearance?.avatar_url;
        
        // Generate voice audio for popup messages (ElevenLabs integration, if enabled)
        let audioUrl: string | null = null;
        if (process.env.USE_ELEVENLABS_VOICE !== "false" && process.env.ELEVENLABS_API_KEY) {
          try {
            const messageLength = agentResponse.chatMessage.length;
            const voiceKind = personality?.traits?.energy_level > 7 ? "bird" : 
                            personality?.traits?.energy_level < 4 ? "dog" : "cat";
            const durationHint = messageLength < 50 ? "short" : 
                               messageLength < 100 ? "medium" : "long";
            
            const audioBuffer = await generateAnimalVoice(
              agentResponse.chatMessage,
              voiceKind,
              durationHint
            );
            
            if (audioBuffer && process.env.AWS_BUCKET_NAME) {
              const s3 = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });
              const key = `voices/group/${Date.now()}.mp3`;
              
              await s3.send(new PutObjectCommand({
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: key,
                Body: audioBuffer,
                ContentType: "audio/mpeg",
              }));
              
              audioUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
              console.log(`[TICK] ✅ Generated voice audio for popup`);
            }
          } catch (e) {
            console.error("[TICK] Voice generation error:", e);
          }
        }
        
        if (avatarUrl) {
          await request(`${BRIDGE_URL}/bridge/say-meme`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chatId,
              imageUrl: avatarUrl,
              text: agentResponse.chatMessage
            })
          });
        } else {
          await request(`${BRIDGE_URL}/bridge/say-text`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chatId,
              text: agentResponse.chatMessage
            })
          });
        }
        
        // Update last popup time
        db.prepare("UPDATE groups SET last_random_popup = ? WHERE groupId = ?")
          .run(new Date().toISOString(), "main");
        
        console.log(`[TICK] ✅ Broadcast: "${agentResponse.chatMessage}"`);
      }
    } else if (shouldPopup && (groupVibe === "sad" || groupVibe === "tense" || groupVibe === "hype")) {
      // Force popup for strong vibes
      const vibeMessages: Record<string, string[]> = {
        sad: [
          `Hey everyone, ${petName} noticed things seem a bit down. Sending virtual hugs! 💙`,
          `${petName} is here for you all! Remember, tough times don't last, but tough groups do! 💪`,
          `${petName} wants you to know: you're all amazing and we'll get through this together! 🌟`
        ],
        tense: [
          `${petName} senses some tension. Take a deep breath, everyone! 😌`,
          `Hey group, ${petName} thinks it might be time for a quick break or some memes! 😊`,
          `${petName} is here to help lighten the mood! What if we share something fun? 🎉`
        ],
        hype: [
          `${petName} is feeling the energy! This is amazing! 🎊`,
          `The vibes are immaculate! ${petName} is bouncing with excitement! 🚀`,
          `${petName} loves seeing everyone so hyped! Let's keep this energy going! 💫`
        ]
      };
      
      const messages = vibeMessages[groupVibe] || [`${petName} is here! 😺`];
      const message = messages[Math.floor(Math.random() * messages.length)];
      
      const avatarUrl = appearance?.avatar_url;
      
      if (chatId) {
        if (avatarUrl) {
          await request(`${BRIDGE_URL}/bridge/say-meme`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chatId,
              imageUrl: avatarUrl,
              text: message
            })
          });
        } else {
          await request(`${BRIDGE_URL}/bridge/say-text`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chatId,
              text: message
            })
          });
        }
        
        db.prepare("UPDATE groups SET last_random_popup = ? WHERE groupId = ?")
          .run(new Date().toISOString(), "main");
        
        console.log(`[TICK] ✅ Vibe popup (${groupVibe}): "${message}"`);
      }
    } else {
      console.log(`[TICK] Agent action: ${agentResponse.action || "silent"}`);
    }
    
    // Update pet mood based on group vibe and random factor
    const moodMap: Record<string, string> = {
      sad: "concerned",
      tense: "concerned",
      hype: "excited",
      calm: "chill",
      neutral: "chill"
    };
    
    const baseMood = moodMap[groupVibe] || "chill";
    const randomFactor = group?.random_mood_factor || 0;
    
    let finalMood = baseMood;
    if (randomFactor > 0.3) finalMood = "excited";
    else if (randomFactor < -0.3) finalMood = "concerned";
    
    if (finalMood !== group?.petMood) {
      db.prepare("UPDATE groups SET petMood = ? WHERE groupId = ?").run(finalMood, "main");
      console.log(`[TICK] Pet mood updated: ${finalMood}`);
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


