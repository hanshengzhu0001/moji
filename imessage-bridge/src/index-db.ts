import "dotenv/config";
import { Database } from "bun:sqlite";
import Fastify from "fastify";
import { request } from "undici";
import { IMessageSDK } from "@photon-ai/imessage-kit";

const BRAIN_URL = process.env.BRAIN_URL || "http://localhost:3001";
const TARGET_CHAT_ID = process.env.TARGET_CHAT_ID!;
const PORT = parseInt(process.env.PORT || "3000");

const fastify = Fastify({ logger: true });
const sdk = new IMessageSDK();

// Open iMessage database
const db = new Database(`${process.env.HOME}/Library/Messages/chat.db`, { readonly: true });

// Command patterns
const MOJI_MEME_PATTERNS = [
  /@moji\s+share\s+a\s+meme\s+about\s+(.+)/i,
  /@moji\s+meme\s+me[:\s]+(.+)/i,
  /moji\s+meme[:\s]+(.+)/i,
];

const MOJI_STICKER_PATTERNS = [
  /@moji\s+sticker[:\s]+(.+)/i,
  /@moji\s+make\s+a\s+sticker\s+of\s+(.+)/i,
  /@moji\s+generate\s+sticker[:\s]+(.+)/i,
];

const MOJI_SEND_STICKER_PATTERN = /@moji\s+send\s+sticker/i;

function extractMemeRequest(text: string): string | null {
  for (const pattern of MOJI_MEME_PATTERNS) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}

function extractStickerRequest(text: string): { prompt: string; style?: string } | null {
  for (const pattern of MOJI_STICKER_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const prompt = match[1].trim();
      const styleMatch = prompt.match(/(cute|funny|sad|excited)/i);
      const style = styleMatch ? styleMatch[1].toLowerCase() : "cute";
      return { prompt, style };
    }
  }
  return null;
}

// Track processed messages by ROWID
const processedMessages = new Set<number>();

// Get the current max ROWID to start from (only process NEW messages)
function getCurrentMaxRowId(chatRowId: number): number {
  try {
    const result = db.prepare(`
      SELECT MAX(m.ROWID) as max_id
      FROM message m
      INNER JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
      WHERE cmj.chat_id = ?
    `).get(chatRowId) as any;
    return result?.max_id || 0;
  } catch (e) {
    console.error("[DB] Error getting max ROWID:", e);
    return 0;
  }
}

let lastMessageRowId = 0;

async function processMessage(row: any) {
  const messageId = row.ROWID;

  // Skip if already processed
  if (processedMessages.has(messageId)) {
    return;
  }

  // Skip messages from self (is_from_me = 1)
  if (row.is_from_me === 1) {
    processedMessages.add(messageId);
    return;
  }

  const text = row.text || "";

  // Skip empty messages
  if (!text || text.trim().length === 0) {
    console.log(`[DB] ⚠️  Message ROWID ${row.ROWID} has no text, skipping...`);
    processedMessages.add(messageId);
    return;
  }

  // Mark as processed
  processedMessages.add(messageId);

  const sender = String(row.sender || row.handle_id || "unknown");
  console.log(`[iMessage] 📥 FRIEND ${sender}: "${text}"`);

  // Check for "send sticker" command (react to previous message)
  if (MOJI_SEND_STICKER_PATTERN.test(text)) {
    console.log(`[SEND STICKER] Generating reaction sticker for latest message`);
    try {
      await request(`${BRAIN_URL}/events/send-sticker`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: TARGET_CHAT_ID,
          userId: sender
        })
      });
    } catch (e) {
      console.error("[SEND STICKER] Error:", e);
    }
    return;
  }

  // Check for sticker commands
  const stickerReq = extractStickerRequest(text);
  if (stickerReq) {
    console.log(`[STICKER REQ] Prompt: ${stickerReq.prompt}, Style: ${stickerReq.style}`);
    try {
      await request(`${BRAIN_URL}/events/sticker-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: TARGET_CHAT_ID,
          userId: sender,
          prompt: stickerReq.prompt,
          style: stickerReq.style
        })
      });
    } catch (e) {
      console.error("[STICKER REQ] Error:", e);
    }
    return;
  }

  // Check for meme commands
  const memeTopic = extractMemeRequest(text);
  if (memeTopic) {
    console.log(`[MEME REQ] Topic: ${memeTopic}`);
    try {
      await request(`${BRAIN_URL}/events/meme-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: TARGET_CHAT_ID,
          userId: sender,
          topic: memeTopic
        })
      });
    } catch (e) {
      console.error("[MEME REQ] Error:", e);
    }
    return;
  }

  // Forward message to Brain
  try {
    const timestamp = new Date(row.date / 1000000000 + 978307200 * 1000).toISOString();

    await request(`${BRAIN_URL}/events/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatId: TARGET_CHAT_ID,
        userId: sender,
        text: text,
        ts: timestamp,
        isFromMe: false
      })
    });
    console.log(`[FORWARD] ✅ Forwarded message from ${sender} to Brain`);
  } catch (e) {
    console.error("[FORWARD] Error:", e);
  }
}

// Find the chat ROWID for the target chat
function getChatRowId(): number | null {
  try {
    const chat = db.prepare(`
      SELECT ROWID FROM chat
      WHERE chat_identifier = ? OR guid = ?
    `).get(TARGET_CHAT_ID, TARGET_CHAT_ID) as any;
    return chat?.ROWID || null;
  } catch (e) {
    console.error("[DB] Error finding chat:", e);
    return null;
  }
}

// Poll database for new messages
async function pollDatabase() {
  console.log(`[DB] Starting database polling for chat: ${TARGET_CHAT_ID}`);

  const chatRowId = getChatRowId();
  if (!chatRowId) {
    console.error(`[DB] ❌ Chat not found: ${TARGET_CHAT_ID}`);
    console.log(`[DB] Available chats:`);
    const chats = db.prepare(`SELECT ROWID, chat_identifier, display_name FROM chat LIMIT 20`).all();
    chats.forEach((c: any) => console.log(`  - ROWID ${c.ROWID}: ${c.chat_identifier} (${c.display_name || 'no name'})`));
    return;
  }

  console.log(`[DB] ✅ Found chat ROWID: ${chatRowId}`);

  // Initialize lastMessageRowId to current max (only process NEW messages)
  lastMessageRowId = getCurrentMaxRowId(chatRowId);
  console.log(`[DB] Starting from ROWID: ${lastMessageRowId}`);

  while (true) {
    try {
      // Query for new messages (ONLY from others, is_from_me = 0)
      const rows = db.prepare(`
        SELECT m.ROWID, m.text, m.date, m.is_from_me, m.handle_id
        FROM message m
        INNER JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
        WHERE cmj.chat_id = ?
          AND m.ROWID > ?
          AND m.is_from_me = 0
        ORDER BY m.ROWID ASC
      `).all(chatRowId, lastMessageRowId) as any[];

      if (rows.length > 0) {
        console.log(`[DB] 📬 Found ${rows.length} new message(s) from others`);

        for (const row of rows) {
          await processMessage(row);
          lastMessageRowId = Math.max(lastMessageRowId, row.ROWID);
        }
      }

      // Poll every 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (e) {
      console.error("[DB] Polling error:", e);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// API endpoint: send message/sticker/meme/file
fastify.post("/send", async (request, reply) => {
  const { chatId, text, imageUrl, filePath } = request.body as any;

  if (!chatId) {
    return reply.status(400).send({ error: "chatId is required" });
  }

  try {
    // Use filePath if provided (for audio/video/files), otherwise imageUrl
    const fileToSend = filePath || imageUrl;
    
    if (fileToSend && text) {
      // Send file with text caption
      await sdk.send(chatId, { images: [fileToSend], text });
      console.log(`[SEND] ✅ Sent file with text to ${chatId}: ${fileToSend}`);
    } else if (fileToSend) {
      // Send file only
      await sdk.send(chatId, { images: [fileToSend] });
      console.log(`[SEND] ✅ Sent file to ${chatId}: ${fileToSend}`);
    } else if (text) {
      // Send text only
      await sdk.send(chatId, text);
      console.log(`[SEND] ✅ Sent text to ${chatId}: "${text}"`);
    } else {
      return reply.status(400).send({ error: "Either text, imageUrl, or filePath is required" });
    }

    return reply.send({ success: true });
  } catch (e: any) {
    console.error("[SEND] Error:", e);
    return reply.status(500).send({ error: e?.message || "Send failed" });
  }
});

// Health check
fastify.get("/health", async (request, reply) => {
  return reply.send({ status: "ok", service: "imessage-bridge" });
});

// Start server and polling
async function start() {
  try {
    await fastify.listen({ port: PORT, host: "0.0.0.0" });
    console.log(`[BRIDGE] 🚀 Server listening on port ${PORT}`);

    // Start database polling
    pollDatabase().catch(console.error);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
