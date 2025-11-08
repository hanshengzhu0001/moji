import "dotenv/config";
import { IMessageSDK } from "@photon-ai/imessage-kit";
import Fastify from "fastify";
import { request } from "undici";

const BRAIN_URL = process.env.BRAIN_URL || "http://localhost:3001";
const TARGET_CHAT_ID = process.env.TARGET_CHAT_ID!; // The group chat to monitor
const PORT = parseInt(process.env.PORT || "3000");

const fastify = Fastify({ logger: true });
const sdk = new IMessageSDK({
  watcher: { pollInterval: 2000, unreadOnly: false, excludeOwnMessages: false }
});

// Command patterns
const MOJI_MEME_PATTERNS = [
  /@moji\s+share\s+a\s+meme\s+about\s+(.+)/i,
  /@moji\s+meme\s+me[:\s]+(.+)/i,
  /moji\s+meme[:\s]+(.+)/i,
];

function extractMemeRequest(text: string): string | null {
  for (const pattern of MOJI_MEME_PATTERNS) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}

// Start watching iMessage
await sdk.startWatching({
  onNewMessage: async (message) => {
    // Only process messages from target group chat
    if (!TARGET_CHAT_ID || message.chatId !== TARGET_CHAT_ID) return;
    
    const text = message.text ?? "";
    if (!text) return;
    
    const userId = message.sender || "unknown";
    
    console.log(`[iMessage] ${userId.slice(0, 20)}: "${text.slice(0, 60)}..."`);
    
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
  },
  onError: (e) => console.error("[WATCHER]", e)
});

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


