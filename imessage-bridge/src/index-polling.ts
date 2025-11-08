import "dotenv/config";
import { IMessageSDK } from "@photon-ai/imessage-kit";
import Fastify from "fastify";
import { request } from "undici";

const BRAIN_URL = process.env.BRAIN_URL || "http://localhost:3001";
const TARGET_CHAT_ID = process.env.TARGET_CHAT_ID!;
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

// Track processed messages to avoid duplicates
const processedMessages = new Set<string>();

async function processMessage(message: any) {
  const messageId = message.guid || message.id;
  if (processedMessages.has(messageId)) {
    return; // Already processed
  }
  processedMessages.add(messageId);

  // Only process messages from target chat
  if (message.chatId !== TARGET_CHAT_ID) {
    return;
  }

  const text = message.text ?? "";
  if (!text) {
    return;
  }

  const userId = message.sender || "unknown";
  console.log(`[iMessage] ${userId.slice(0, 20)}: "${text.slice(0, 60)}..."`);

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

// Manual polling loop
async function pollMessages() {
  while (true) {
    try {
      const unreadMessages = await sdk.getUnreadMessages();
      
      for (const messageGroup of unreadMessages) {
        if (messageGroup.messages && Array.isArray(messageGroup.messages)) {
          for (const message of messageGroup.messages) {
            await processMessage(message);
          }
        } else {
          // Handle single message format
          await processMessage(messageGroup);
        }
      }
    } catch (e) {
      console.error("[POLL] Error:", e);
    }
    
    // Poll every 3 seconds
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
}

// Start polling
console.log(`[POLL] Starting message polling for chat: ${TARGET_CHAT_ID}`);
pollMessages().catch(console.error);

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

