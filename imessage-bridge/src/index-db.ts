import "dotenv/config";
import { Database } from "bun:sqlite";
import Fastify from "fastify";
import { request } from "undici";
import { IMessageSDK } from "@photon-ai/imessage-kit";
import { getLastMessageTextFromChat } from "./applescript-helper";

const BRAIN_URL = process.env.BRAIN_URL || "http://localhost:3001";
const TARGET_CHAT_ID = process.env.TARGET_CHAT_ID!;
const USER_PHONE = process.env.USER_PHONE; // User's own phone number for messages they send
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
  const isFromMe = row.is_from_me === 1;
  
  // If text is empty, try to get it from AppleScript (for sent messages) or retry
  if (!text || text.trim().length === 0) {
    if (isFromMe) {
      // For messages sent by user, text often never appears in the database
      // Try to get it from AppleScript as a fallback
      console.log(`[DB] 📤 Message ROWID ${row.ROWID} sent by user (is_from_me=1) has no text. Trying AppleScript...`);
      try {
        const appleScriptText = await getLastMessageTextFromChat(TARGET_CHAT_ID);
        if (appleScriptText && appleScriptText.trim().length > 0) {
          text = appleScriptText.trim();
          console.log(`[DB] ✅ Got text from AppleScript: "${text.slice(0, 50)}..."`);
        } else {
          console.log(`[DB] ⚠️  AppleScript also returned empty. Message text may not be available.`);
          text = ""; // Will still process with empty text for tracking
        }
      } catch (e) {
        console.error(`[DB] ❌ AppleScript error:`, e);
        text = ""; // Fallback to empty
      }
      // Process it even if empty (for tracking purposes)
    } else {
      // For messages from others, retry as text usually appears
      if (!isRetry) {
        pendingMessages.set(messageId, {
          row,
          retryCount: 0,
          firstSeen: Date.now()
        });
        console.log(`[DB] ⚠️  Message ROWID ${row.ROWID} from other user has no text, will retry...`);
      }
      return false; // Return false to indicate not processed
    }
  }
  
  // Text is available - process it
  processedMessages.add(messageId);
  pendingMessages.delete(messageId); // Remove from pending if it was there
  
  // Clean up text (but don't trim empty strings for sent messages)
  if (text) {
    text = text.trim();
  }

  // Get sender info
  const handleId = row.handle_id;
  let sender = "unknown";
  
  if (isFromMe) {
    // For messages sent by the user, handle_id points to the RECIPIENT, not the sender
    // So we need to use the user's own phone number
    if (USER_PHONE) {
      sender = USER_PHONE;
    } else {
      // Try to find user's phone by looking at handles in messages they received (is_from_me = 0)
      // in OTHER chats - but that's complex. For now, use a fallback.
      // TODO: Could query for account info or infer from other chats
      sender = "user_self";
      console.log(`[DB] 📤 Message from user (is_from_me=1). Set USER_PHONE env var for your phone number, or using "user_self"`);
    }
  } else {
    // For messages from others, use the handle_id (which points to the sender)
    if (handleId) {
      const handle = db.prepare("SELECT id FROM handle WHERE ROWID = ?").get(handleId) as any;
      if (handle) {
        sender = handle.id || `handle_${handleId}`;
      }
    }
  }

  const chatId = TARGET_CHAT_ID;

  // Skip processing if text is empty and not from user (user messages we process even if empty)
  if (!text && !isFromMe) {
    console.log(`[DB] ⏭️  Skipping message from ${sender} with no text`);
    return false;
  }

  console.log(`[iMessage] ${isFromMe ? '📤 YOU' : '📥 FRIEND'} ${sender}: "${text || '(empty)'}"`);
  if (text) {
    console.log(`[iMessage] Full text length: ${text.length} characters`);
  }

  // Check for sticker commands
  const stickerReq = extractStickerRequest(text);
  if (stickerReq) {
    console.log(`[DEBUG] Sticker pattern matched! Prompt: "${stickerReq.prompt}", Style: "${stickerReq.style}"`);
  }
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

  // Forward all messages to Brain (including empty text for user messages)
  // Skip if text is completely empty for non-user messages (shouldn't happen after checks above)
  if (text || isFromMe) {
    try {
      await request(`${BRAIN_URL}/events/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId,
          userId: sender,
          text: text || "", // Send empty string if no text (for user sent messages)
          ts: new Date(row.date / 1000000000 + 978307200).toISOString(),
          isFromMe // Pass this flag so Brain knows if message is from user
        })
      });
      console.log(`[FORWARD] ✅ Forwarded message from ${sender} to Brain (isFromMe: ${isFromMe})`);
    } catch (e) {
      console.error("[FORWARD] Error:", e);
    }
  } else {
    console.log(`[FORWARD] ⏭️  Skipping forward (no text and not from user)`);
  }
  
  return true; // Return true to indicate successful processing
}

// Find the chat ROWID for the target chat
function getChatRowId(): number | null {
  try {
    // First, try to find by chat_identifier or guid (for group chats or exact matches)
    let chat = db.prepare(`
      SELECT ROWID FROM chat 
      WHERE chat_identifier = ? OR guid LIKE ?
    `).get(TARGET_CHAT_ID, `%${TARGET_CHAT_ID}%`) as any;
    
    if (chat?.ROWID) {
      return chat.ROWID;
    }
    
    // If not found and TARGET_CHAT_ID looks like a phone/email (not a chat ID),
    // find the chat by matching the handle (phone/email)
    if (!TARGET_CHAT_ID.startsWith("chat") && !TARGET_CHAT_ID.startsWith("iMessage")) {
      console.log(`[DB] Looking up 1-on-1 chat for: ${TARGET_CHAT_ID}`);
      chat = db.prepare(`
        SELECT DISTINCT c.ROWID
        FROM chat c
        INNER JOIN chat_handle_join chj ON c.ROWID = chj.chat_id
        INNER JOIN handle h ON chj.handle_id = h.ROWID
        WHERE h.id = ? OR h.id LIKE ?
        LIMIT 1
      `).get(TARGET_CHAT_ID, `%${TARGET_CHAT_ID}%`) as any;
      
      if (chat?.ROWID) {
        console.log(`[DB] ✅ Found 1-on-1 chat ROWID: ${chat.ROWID} for ${TARGET_CHAT_ID}`);
        return chat.ROWID;
      }
    }
    
    return null;
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
  // BUT: For now, let's start from a bit earlier to catch user sent messages that were missed
  const currentMax = getCurrentMaxRowId(chatRowId);
  // Start from 10 messages back to catch any missed messages (especially user sent ones with empty text)
  lastMessageRowId = Math.max(0, currentMax - 10);
  console.log(`[DB] Starting from ROWID: ${lastMessageRowId} (current max: ${currentMax}, processing recent backlog)`);

  while (true) {
    try {
      // Get messages newer than last processed (only NEW messages)
      // Include messages with empty text so we can retry them (especially for messages sent by user)
      const messages = db.prepare(`
        SELECT m.ROWID, m.text, m.handle_id, m.is_from_me, m.date
        FROM message m
        INNER JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
        WHERE m.cache_has_attachments = 0
          AND m.ROWID > ?
          AND cmj.chat_id = ?
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
    // For group chats, send to all participants
    if (chatId.startsWith("chat")) {
      // Get chat ROWID from chatId
      const chatRow = db.prepare("SELECT ROWID FROM chat WHERE chat_identifier LIKE ? OR guid LIKE ? LIMIT 1")
        .get(`%${chatId}%`, `%${chatId}%`) as any;
      
      if (chatRow && chatRow.ROWID) {
        // Get all participants (handles) in the group
        const participants = db.prepare(`
          SELECT h.id 
          FROM handle h 
          INNER JOIN chat_handle_join chj ON h.ROWID = chj.handle_id 
          WHERE chj.chat_id = ?
        `).all(chatRow.ROWID) as any[];
        
        if (participants.length > 0) {
          console.log(`[BRIDGE] Sending text to ${participants.length} group participants: ${participants.map(p => p.id).join(", ")}`);
          
          // Try sending to all participants as an array (if SDK supports it)
          const participantIds = participants.map(p => p.id);
          
          try {
            // Try sending as array first (some SDKs support this)
            await sdk.send(participantIds, text);
            console.log(`[BRIDGE] ✅ Sent text to group (all participants)`);
            return { success: true };
          } catch (arrayError: any) {
            console.log(`[BRIDGE] Array send failed, trying individual send: ${arrayError.message}`);
            
            // Fallback: Send to first participant
            const recipient = participantIds[0];
            await sdk.send(recipient, text);
            console.log(`[BRIDGE] ✅ Sent text to ${recipient} (may appear as 1-on-1)`);
            return { success: true };
          }
        } else {
          console.error("[BRIDGE] No participants found for group chat");
          reply.code(500);
          return { success: false, error: "No participants found for group chat" };
        }
      }
    }
    
    // For 1-on-1 chats, send directly
    await sdk.send(chatId, text);
    console.log(`[BRIDGE] ✅ Sent text to ${chatId}`);
    return { success: true };
  } catch (e: any) {
    console.error("[BRIDGE] Error sending text:", e);
    reply.code(500);
    return { success: false, error: e.message };
  }
});

fastify.post<{ Body: { chatId: string; imageUrl: string; text?: string } }>('/bridge/say-meme', async (req, reply) => {
  const { chatId, imageUrl, text } = req.body;
  console.log(`[BRIDGE] say-meme called with chatId: ${chatId}`);
  
  try {
    // For group chats, send to all participants
    if (chatId && chatId.startsWith("chat")) {
      console.log(`[BRIDGE] Group chat detected: ${chatId}`);
      
      // Get chat ROWID - try exact match first
      let chatRow = db.prepare("SELECT ROWID FROM chat WHERE chat_identifier = ? LIMIT 1")
        .get(chatId) as any;
      
      if (!chatRow) {
        chatRow = db.prepare("SELECT ROWID FROM chat WHERE chat_identifier LIKE ? LIMIT 1")
          .get(`%${chatId}%`) as any;
      }
      
      console.log(`[BRIDGE] Chat ROWID lookup result:`, chatRow);
      
      if (chatRow && chatRow.ROWID) {
        // Get all participants (handles) in the group
        const participants = db.prepare(`
          SELECT h.id 
          FROM handle h 
          INNER JOIN chat_handle_join chj ON h.ROWID = chj.handle_id 
          WHERE chj.chat_id = ?
        `).all(chatRow.ROWID) as any[];
        
        console.log(`[BRIDGE] Found ${participants.length} participants:`, participants.map(p => p.id));
        
        if (participants.length > 0) {
          // Send to first participant (this will send to that person, not the group)
          // Note: This is a limitation - SDK doesn't support group chat IDs
          const recipient = participants[0].id;
          console.log(`[BRIDGE] Sending meme to participant: ${recipient}`);
          
          await sdk.send(recipient, { images: [imageUrl], text });
          console.log(`[BRIDGE] ✅ Sent meme to ${recipient}`);
          return { success: true, note: "Sent to first participant (SDK limitation)" };
        } else {
          console.error("[BRIDGE] No participants found for group chat");
          reply.code(500);
          return { success: false, error: "No participants found for group chat" };
        }
      } else {
        console.error(`[BRIDGE] Chat not found: ${chatId}`);
        reply.code(500);
        return { success: false, error: `Chat not found: ${chatId}` };
      }
    }
    
    // For 1-on-1 chats, send directly
    console.log(`[BRIDGE] Sending to 1-on-1 chat: ${chatId}`);
    await sdk.send(chatId, { images: [imageUrl], text });
    console.log(`[BRIDGE] ✅ Sent meme to ${chatId}`);
    return { success: true };
  } catch (e: any) {
    console.error("[BRIDGE] Error sending meme:", e);
    reply.code(500);
    return { success: false, error: e.message };
  }
});

fastify.get('/health', async () => ({ status: 'ok', watching: TARGET_CHAT_ID }));

await fastify.listen({ port: PORT, host: '0.0.0.0' });
console.log(`🌉 iMessage Bridge listening on port ${PORT}`);
console.log(`📱 Watching chat: ${TARGET_CHAT_ID}`);

process.stdin.resume();

