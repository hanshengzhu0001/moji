import "dotenv/config";
import { IMessageSDK } from "@photon-ai/imessage-kit";
import Fastify from "fastify";
import { request } from "undici";

const BRAIN_URL = process.env.BRAIN_URL || "http://localhost:3001";
const TARGET_CHAT_ID = process.env.TARGET_CHAT_ID!; // The group chat to monitor
const PORT = parseInt(process.env.PORT || "3000");

const fastify = Fastify({ logger: true });
const sdk = new IMessageSDK();

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

const MOJI_STATUS_PATTERNS = [
  /@moji\s+status/i,
  /@moji\s+how\s+are\s+you/i,
  /@moji\s+info/i,
];

const MOJI_INTERACTION_PATTERNS = [
  /@moji\s+talk[:\s]*(.+)/i,
  /@moji\s+tell\s+me\s+about\s+yourself/i,
  /@moji\s+what\s+do\s+you\s+like/i,
];

const MOJI_SOCIAL_PATTERNS = [
  /@moji\s+share\s+update/i,
  /@moji\s+post\s+to\s+twitter/i,
  /@moji\s+share\s+to\s+x/i,
];

const MOJI_RENAME_PATTERNS = [
  /@moji\s+name\s+is\s+(.+)/i,
  /@moji\s+rename\s+to\s+(.+)/i,
  /@moji\s+call\s+me\s+(.+)/i,
  /@moji\s+my\s+name\s+is\s+(.+)/i,
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
      // Extract style if mentioned
      const styleMatch = prompt.match(/(cute|funny|sad|excited)/i);
      const style = styleMatch ? styleMatch[1].toLowerCase() : "cute";
      return { prompt, style };
    }
  }
  return null;
}

function isStatusRequest(text: string): boolean {
  return MOJI_STATUS_PATTERNS.some(pattern => pattern.test(text));
}

function extractInteractionRequest(text: string): string | null {
  for (const pattern of MOJI_INTERACTION_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
    // For patterns without capture group, return the full text
    if (match && !match[1]) {
      return text.replace(/@moji\s+/i, "").trim();
    }
  }
  return null;
}

function isSocialShareRequest(text: string): boolean {
  return MOJI_SOCIAL_PATTERNS.some(pattern => pattern.test(text));
}

function extractRenameRequest(text: string): string | null {
  for (const pattern of MOJI_RENAME_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
}

async function processMessage(message: any) {
  // Message ID tracking is now handled in pollMessages

  // Strictly check if message is from target chat
  const messageChatId = message.chatId || (message as any).chat?.id || (message as any).chatId || (message as any).chatId;
  
  // Only process if chatId exactly matches (no partial matching)
  if (messageChatId !== TARGET_CHAT_ID) {
    return; // Skip messages from other chats
  }
    
    const text = message.text ?? "";
  if (!text) {
    return;
  }
    
    const userId = message.sender || "unknown";
    console.log(`[iMessage] ${userId.slice(0, 20)}: "${text.slice(0, 60)}..."`);

  // Check for rename command (highest priority)
  const renameReq = extractRenameRequest(text);
  if (renameReq) {
    console.log(`[RENAME REQ] From ${userId.slice(0, 15)}: "${renameReq}"`);
    try {
      await request(`${BRAIN_URL}/events/rename-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: message.chatId,
          userId,
          newName: renameReq
        })
      });
    } catch (e) {
      console.error("[RENAME REQ] Error:", e);
    }
    return;
  }

  // Check for status command
  if (isStatusRequest(text)) {
    console.log(`[STATUS REQ] From ${userId.slice(0, 15)}`);
    try {
      await request(`${BRAIN_URL}/events/status-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: message.chatId,
          userId
        })
      });
    } catch (e) {
      console.error("[STATUS REQ] Error:", e);
    }
    return;
  }

  // Check for social share command
  if (isSocialShareRequest(text)) {
    console.log(`[SOCIAL REQ] From ${userId.slice(0, 15)}`);
    try {
      await request(`${BRAIN_URL}/events/social-share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: message.chatId,
          userId
        })
      });
    } catch (e) {
      console.error("[SOCIAL REQ] Error:", e);
    }
    return;
  }

  // Check for interaction commands
  const interactionReq = extractInteractionRequest(text);
  if (interactionReq) {
    console.log(`[INTERACTION REQ] From ${userId.slice(0, 15)}: "${interactionReq}"`);
    try {
      await request(`${BRAIN_URL}/events/interaction-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: message.chatId,
          userId,
          userMessage: interactionReq
        })
      });
    } catch (e) {
      console.error("[INTERACTION REQ] Error:", e);
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
          chatId: message.chatId,
          userId,
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
            chatId: message.chatId,
            userId,
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
          chatId: message.chatId,
          userId,
          text,
          ts: new Date().toISOString()
        })
      });
    } catch (e) {
      console.error("[FORWARD] Error:", e);
    }
}

// Manual polling loop (more reliable than startWatching)
const processedMessageIds = new Set<string>();

// Record the start time - only process messages after this timestamp
const PROCESS_START_TIME = Date.now();
console.log(`[POLL] Process start time: ${new Date(PROCESS_START_TIME).toISOString()}`);
console.log(`[POLL] Will only process messages received after this time`);

// Helper function to extract timestamp from message
function getMessageTimestamp(message: any): number {
  // Try different timestamp fields
  if (message.date) {
    // Date object
    if (message.date instanceof Date) {
      return message.date.getTime();
    }
    // Timestamp number
    if (typeof message.date === 'number') {
      return message.date;
    }
  }
  
  if (message.ts) {
    // ISO string or timestamp
    if (typeof message.ts === 'string') {
      const parsed = Date.parse(message.ts);
      if (!isNaN(parsed)) return parsed;
    }
    if (typeof message.ts === 'number') {
      return message.ts;
    }
  }
  
  if (message.timestamp) {
    if (typeof message.timestamp === 'number') {
      return message.timestamp;
    }
    if (typeof message.timestamp === 'string') {
      const parsed = Date.parse(message.timestamp);
      if (!isNaN(parsed)) return parsed;
    }
  }
  
  // If no timestamp found, assume it's old (return 0)
  return 0;
}

async function pollMessages() {
  console.log(`[POLL] Starting message polling for chat: ${TARGET_CHAT_ID}`);
  while (true) {
    try {
      // Use getMessages to include own messages
      const result = await sdk.getMessages({ excludeOwnMessages: false });
      
      // Handle different return types - could be array or object with messages property
      const allMessages = Array.isArray(result) 
        ? result 
        : (result as any).messages || (result as any).data || [];
      
      let processedCount = 0;
      let skippedOldCount = 0;
      
      for (const message of allMessages) {
        // Extract chatId from message (try multiple possible fields)
        const messageChatId = message.chatId || (message as any).chat?.id || (message as any).chatId || (message as any).chat?.chatId;
        
        // STRICT filtering: Only process messages that exactly match target chat ID
        if (messageChatId !== TARGET_CHAT_ID) {
          // Skip messages from other chats (don't log to reduce noise)
          continue;
        }
        
        // Skip if already processed
        const messageId = message.guid || message.id || `${messageChatId}_${message.text}_${message.ts}`;
        if (processedMessageIds.has(messageId)) {
          continue;
        }
        
        // CRITICAL: Only process messages received AFTER process started
        const messageTimestamp = getMessageTimestamp(message);
        if (messageTimestamp < PROCESS_START_TIME) {
          // This is an old message - skip it
          skippedOldCount++;
          continue;
        }
        
        // This message is from the target chat and is new - process it
        console.log(`[POLL] ✅ Processing new message from target chat: chatId=${messageChatId}, text=${message.text?.slice(0, 30)}`);
        await processMessage(message);
        processedMessageIds.add(messageId);
        processedCount++;
        
        // Keep only last 1000 message IDs to prevent memory issues
        if (processedMessageIds.size > 1000) {
          const firstId = processedMessageIds.values().next().value;
          processedMessageIds.delete(firstId);
        }
      }
      
      if (processedCount > 0) {
        console.log(`[POLL] Processed ${processedCount} new messages from target chat`);
      }
      if (skippedOldCount > 0 && processedCount === 0) {
        // Only log skipped count if we're not processing anything (to reduce noise)
        // This helps debug if messages are being skipped unexpectedly
      }
    } catch (e: any) {
      console.error("[POLL] Error:", e.message || e);
    }
    
    // Poll every 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// Start polling in background
pollMessages().catch(console.error);

// HTTP API for Brain to send messages back
fastify.post<{ Body: { chatId: string; text: string } }>('/bridge/say-text', async (req, reply) => {
  const { chatId, text } = req.body;
  console.log(`[SEND] Attempting to send text to chatId: ${chatId}, text: "${text?.slice(0, 50)}..."`);
  try {
    const result = await sdk.send(chatId, text);
    console.log(`[SEND] ✅ Successfully sent text message. Result:`, result);
    return { success: true, result };
  } catch (e: any) {
    console.error(`[SEND] ❌ Failed to send text message:`, e.message || e);
    console.error(`[SEND] Error details:`, e);
    reply.code(500);
    return { success: false, error: e.message || String(e) };
  }
});

fastify.post<{ Body: { chatId: string; imageUrl: string; text?: string } }>('/bridge/say-meme', async (req, reply) => {
  const { chatId, imageUrl, text } = req.body;
  console.log(`[SEND] Attempting to send image to chatId: ${chatId}, imageUrl: ${imageUrl}, text: "${text?.slice(0, 50)}..."`);
  try {
      // Try different formats in case SDK expects different structure
      let result;
      try {
        result = await sdk.send(chatId, { images: [imageUrl], text });
      } catch (e1: any) {
        console.log(`[SEND] First format failed, trying alternative:`, e1.message);
        // Try alternative format - send text separately if image fails
        try {
          if (text) {
            await sdk.send(chatId, text);
          }
          result = await sdk.send(chatId, imageUrl);
        } catch (e2: any) {
          throw e1; // Throw original error
        }
      }
    console.log(`[SEND] ✅ Successfully sent image message. Result:`, result);
    return { success: true, result };
  } catch (e: any) {
    console.error(`[SEND] ❌ Failed to send image message:`, e.message || e);
    console.error(`[SEND] Error details:`, e);
    reply.code(500);
    return { success: false, error: e.message || String(e) };
  }
});

fastify.get('/health', async () => ({ status: 'ok', watching: TARGET_CHAT_ID }));

await fastify.listen({ port: PORT, host: '0.0.0.0' });
console.log(`🌉 iMessage Bridge listening on port ${PORT}`);
console.log(`📱 Watching chat: ${TARGET_CHAT_ID}`);

process.stdin.resume();


