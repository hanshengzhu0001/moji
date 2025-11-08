import "dotenv/config";
import { IMessageSDK } from "@photon-ai/imessage-kit";

const sdk = new IMessageSDK();
const TARGET_CHAT_ID = process.env.TARGET_CHAT_ID || "chat55023045752223532";

async function test() {
  console.log("Testing iMessage SDK...");
  console.log("Target chat:", TARGET_CHAT_ID);
  
  try {
    const unread = await sdk.getUnreadMessages();
    console.log(`Found ${unread.length} unread message groups`);
    
    for (const group of unread) {
      console.log("Group:", JSON.stringify(group, null, 2));
    }
  } catch (e) {
    console.error("Error:", e);
  }
}

test();
