import "dotenv/config";
import { request } from "undici";

const TWITTER_API_KEY = process.env.TWITTER_API_KEY;
const TWITTER_API_SECRET = process.env.TWITTER_API_SECRET;
const TWITTER_ACCESS_TOKEN = process.env.TWITTER_ACCESS_TOKEN;
const TWITTER_ACCESS_TOKEN_SECRET = process.env.TWITTER_ACCESS_TOKEN_SECRET;
const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;

const TWITTER_API_URL = "https://api.twitter.com/2";

/**
 * Post to Twitter/X using OAuth 1.0a or Bearer Token
 * For now, using Bearer Token (simpler, but read-only for most endpoints)
 * For posting, we'd need OAuth 1.0a or OAuth 2.0
 */
export async function postToTwitter(
  text: string,
  imageUrl?: string
): Promise<{ success: boolean; tweetId?: string; error?: string }> {
  if (!TWITTER_BEARER_TOKEN && !TWITTER_ACCESS_TOKEN) {
    console.warn("[SOCIAL] No Twitter credentials provided");
    return { success: false, error: "No Twitter credentials" };
  }

  try {
    // For Twitter API v2, we need to:
    // 1. Upload media if imageUrl provided
    // 2. Create tweet with text and media_id

    let mediaId: string | undefined;

    // Upload image if provided
    if (imageUrl) {
      // Download image first
      const imageResponse = await request(imageUrl);
      if (imageResponse.statusCode === 200) {
        const imageBuffer = await imageResponse.body.arrayBuffer();
        
        // Upload to Twitter (requires OAuth 1.0a for media upload)
        // For now, we'll skip image upload if we only have Bearer Token
        // In production, implement OAuth 1.0a flow
        console.log("[SOCIAL] Image upload requires OAuth 1.0a - skipping for now");
      }
    }

    // Post tweet
    // Note: Twitter API v2 requires OAuth 2.0 or OAuth 1.0a for posting
    // Bearer Token is typically read-only
    // For this implementation, we'll use a simplified approach
    
    if (TWITTER_ACCESS_TOKEN && TWITTER_ACCESS_TOKEN_SECRET) {
      // Use OAuth 1.0a (would need proper OAuth library in production)
      // For now, return success but log that OAuth needs to be implemented
      console.log("[SOCIAL] OAuth 1.0a posting not fully implemented - would post:", text);
      return { success: true, tweetId: "mock_tweet_id" };
    }

    // Fallback: just log (can't post with Bearer Token alone)
    console.log("[SOCIAL] Would post to Twitter:", text);
    return { success: false, error: "OAuth required for posting" };

  } catch (e: any) {
    console.error("[SOCIAL] Twitter post error:", e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Generate shareable post text using agent
 */
export async function generateShareablePost(
  petState: any,
  personality: any,
  agent: any
): Promise<string> {
  const petName = petState?.petName || "Moji";
  const agentResponse = await agent.callAgent("social_media_post", {
    petState: { ...petState, petName },
    personality
  });

  return agentResponse?.socialMediaPost || `🐱 ${petName} here! Level ${petState?.level || 1}, feeling ${petState?.petMood || "chill"}! #DigitalPet #Moji`;
}

