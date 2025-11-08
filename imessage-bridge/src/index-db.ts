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

// Track processed messages
const processedMessages = new Set<number>();

// Track messages that need retry (those with empty text)
// Key: ROWID, Value: { row: message, retryCount: number, firstSeen: timestamp }
const pendingMessages = new Map<number, { row: any; retryCount: number; firstSeen: number }>();
const MAX_RETRIES = 10; // Retry for up to 20 seconds (10 retries * 2 seconds)
const RETRY_WINDOW_MS = 20000; // Stop retrying after 20 seconds

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

async function processMessage(row: any, isRetry: boolean = false) {
  const messageId = row.ROWID;
  
  // Skip if already processed successfully
  if (processedMessages.has(messageId) && !isRetry) {
    return;
  }

  let text = row.text || "";
  
  // If text is empty, mark for retry (text might appear later in database)
  if (!text || text.trim().length === 0) {
    if (!isRetry) {
      // First time seeing this message - add to pending retry list
      pendingMessages.set(messageId, {
        row,
        retryCount: 0,
        firstSeen: Date.now()
      });
      console.log(`[DB] ⚠️  Message ROWID ${row.ROWID} has no text, will retry...`);
    }
    return false; // Return false to indicate not processed
  }
  
  // Text is available - process it
  processedMessages.add(messageId);
  pendingMessages.delete(messageId); // Remove from pending if it was there
  
  // Clean up text
  text = text.trim();

  // Get sender info
  const handleId = row.handle_id;
  let sender = "unknown";
  if (handleId) {
    const handle = db.prepare("SELECT id FROM handle WHERE ROWID = ?").get(handleId) as any;
    if (handle) {
      sender = handle.id || `handle_${handleId}`;
    }
  }

  const isFromMe = row.is_from_me === 1;
  const chatId = TARGET_CHAT_ID;

  console.log(`[iMessage] ${sender}: "${text.slice(0, 60)}..."`);

  // Check for sticker commands
  const stickerReq = extractStickerRequest(text);
  if (stickerReq) {
    console.log(`[STICKER REQ] Prompt: ${stickerReq.prompt}, Style: ${stickerReq.style}`);
    try {
      await request(`${BRAIN_URL}/events/sticker-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId,
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
          chatId,
          userId: sender,
          topic: memeTopic
        })
      });
    } catch (e) {
      console.error("[MEME REQ] Error:", e);
    }
    return;
  }

  // Forward all messages to Brain
  try {
    await request(`${BRAIN_URL}/events/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatId,
        userId: sender,
        text,
        ts: new Date(row.date / 1000000000 + 978307200).toISOString()
      })
    });
  } catch (e) {
    console.error("[FORWARD] Error:", e);
  }
  
  return true; // Return true to indicate successful processing
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
    const chats = db.prepare("SELECT ROWID, chat_identifier, display_name FROM chat LIMIT 10").all() as any[];
    chats.forEach(c => console.log(`  - ${c.chat_identifier} (${c.display_name || 'no name'})`));
    return;
  }
  
  console.log(`[DB] ✅ Found chat ROWID: ${chatRowId}`);
  
  // Initialize lastMessageRowId to current max (only process NEW messages from now on)
  lastMessageRowId = getCurrentMaxRowId(chatRowId);
  console.log(`[DB] Starting from ROWID: ${lastMessageRowId} (only processing NEW messages)`);

  while (true) {
    try {
      // Get messages newer than last processed (only NEW messages)
      const messages = db.prepare(`
        SELECT m.ROWID, m.text, m.handle_id, m.is_from_me, m.date
        FROM message m
        INNER JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
        WHERE m.cache_has_attachments = 0
          AND m.ROWID > ?
          AND cmj.chat_id = ?
          AND m.text IS NOT NULL
          AND m.text != ''
        ORDER BY m.ROWID ASC
        LIMIT 50
      `).all(lastMessageRowId, chatRowId) as any[];

      if (messages.length > 0) {
        console.log(`[DB] ✅ Found ${messages.length} NEW messages (ROWID > ${lastMessageRowId})`);
        for (const msg of messages) {
          console.log(`[DB] Processing message ROWID ${msg.ROWID}: "${msg.text?.slice(0, 50) || '(no text)'}..."`);
          const processed = await processMessage(msg);
          if (processed !== false) {
            lastMessageRowId = Math.max(lastMessageRowId, msg.ROWID);
          }
        }
        console.log(`[DB] Updated lastMessageRowId to ${lastMessageRowId}`);
      }
      
      // Retry pending messages (those with empty text)
      const now = Date.now();
      const toRetry: number[] = [];
      
      for (const [rowId, pending] of pendingMessages.entries()) {
        // Stop retrying if too old
        if (now - pending.firstSeen > RETRY_WINDOW_MS) {
          console.log(`[DB] ⏭️  Giving up on message ROWID ${rowId} after ${RETRY_WINDOW_MS}ms`);
          pendingMessages.delete(rowId);
          continue;
        }
        
        // Stop retrying if max retries reached
        if (pending.retryCount >= MAX_RETRIES) {
          console.log(`[DB] ⏭️  Giving up on message ROWID ${rowId} after ${MAX_RETRIES} retries`);
          pendingMessages.delete(rowId);
          continue;
        }
        
        toRetry.push(rowId);
      }
      
      // Retry pending messages by re-querying the database
      if (toRetry.length > 0) {
        // Use parameterized query to avoid SQL injection
        const placeholders = toRetry.map(() => "?").join(",");
        const retryMessages = db.prepare(`
          SELECT m.ROWID, m.text, m.handle_id, m.is_from_me, m.date
          FROM message m
          WHERE m.ROWID IN (${placeholders})
        `).all(...toRetry) as any[];
        
        for (const msg of retryMessages) {
          const pending = pendingMessages.get(msg.ROWID);
          if (pending) {
            pending.retryCount++;
            console.log(`[DB] 🔄 Retry ${pending.retryCount}/${MAX_RETRIES} for message ROWID ${msg.ROWID}...`);
            const processed = await processMessage(msg, true);
            if (processed !== false) {
              // Successfully processed - remove from pending
              pendingMessages.delete(msg.ROWID);
              lastMessageRowId = Math.max(lastMessageRowId, msg.ROWID);
            }
          }
        }
      }
      
      // Log status
      if (pendingMessages.size > 0) {
        console.log(`[DB] ⏳ ${pendingMessages.size} messages pending text...`);
      } else if (messages.length === 0 && Math.random() < 0.1) {
        console.log(`[DB] Polling... (last ROWID: ${lastMessageRowId}, waiting for new messages)`);
      }
    } catch (e) {
      console.error("[DB] Polling error:", e);
    }

    // Poll every 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// Start polling
pollDatabase().catch(console.error);

// HTTP API for Brain to send messages back
fastify.post<{ Body: { chatId: string; text: string } }>('/bridge/say-text', async (req, reply) => {
  const { chatId, text } = req.body;
  try {
    await sdk.send(chatId, text);
    return { success: true };
  } catch (e: any) {
    reply.code(500);
    return { success: false, error: e.message };
  }
});

fastify.post<{ Body: { chatId: string; imageUrl: string; text?: string } }>('/bridge/say-meme', async (req, reply) => {
  const { chatId, imageUrl, text } = req.body;
  try {
    await sdk.send(chatId, { images: [imageUrl], text });
    return { success: true };
  } catch (e: any) {
    reply.code(500);
    return { success: false, error: e.message };
  }
});

fastify.get('/health', async () => ({ status: 'ok', watching: TARGET_CHAT_ID }));

await fastify.listen({ port: PORT, host: '0.0.0.0' });
console.log(`🌉 iMessage Bridge listening on port ${PORT}`);
console.log(`📱 Watching chat: ${TARGET_CHAT_ID}`);

process.stdin.resume();

