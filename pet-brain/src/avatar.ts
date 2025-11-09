import "dotenv/config";
import { request } from "undici";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const OPENAI_API_URL = "https://api.openai.com/v1";
const USE_PLACEHOLDER_AVATARS = process.env.USE_PLACEHOLDER_AVATARS === "true" || process.env.NODE_ENV === "development";

interface PersonalityTraits {
  humor_level?: number;
  empathy_level?: number;
  energy_level?: number;
  curiosity_level?: number;
  [key: string]: number | undefined;
}

// Placeholder avatar URLs for development
const PLACEHOLDER_AVATARS = [
  "https://via.placeholder.com/1024x1024/FFB6C1/FFFFFF?text=🐱+Moji",
  "https://via.placeholder.com/1024x1024/FFD700/FFFFFF?text=😺+Pet",
  "https://via.placeholder.com/1024x1024/98D8C8/FFFFFF?text=🐾+Avatar",
  "https://via.placeholder.com/1024x1024/FFA07A/FFFFFF?text=✨+Cute",
];

/**
 * Generate a cute pet avatar using DALL-E 3
 * Avatar reflects personality traits and current mood
 * Uses placeholder images if USE_PLACEHOLDER_AVATARS=true or in development mode
 */
export async function generatePetAvatar(
  personalityTraits?: PersonalityTraits,
  mood: string = "chill",
  interests: string[] = []
): Promise<string | null> {
  // Use placeholder images for development/testing
  if (USE_PLACEHOLDER_AVATARS) {
    const placeholder = PLACEHOLDER_AVATARS[Math.floor(Math.random() * PLACEHOLDER_AVATARS.length)];
    console.log(`[AVATAR] Using placeholder image: ${placeholder}`);
    return placeholder;
  }

  if (!OPENAI_API_KEY) {
    console.warn("[AVATAR] No OpenAI API key provided, skipping avatar generation");
    return null;
  }

  // Build prompt based on personality and mood
  let styleDescription = "cute, adorable, friendly";
  
  if (personalityTraits) {
    const energy = personalityTraits.energy_level || 5;
    const humor = personalityTraits.humor_level || 5;
    
    if (energy > 7) styleDescription += ", energetic, playful";
    if (energy < 4) styleDescription += ", calm, gentle";
    if (humor > 7) styleDescription += ", mischievous, fun-loving";
  }

  // Mood-based styling
  const moodStyles: Record<string, string> = {
    excited: "bouncing, bright eyes, happy expression",
    chill: "relaxed, peaceful, content",
    concerned: "thoughtful, caring, gentle",
    sleepy: "tired, cozy, peaceful",
    happy: "smiling, bright, cheerful",
    sad: "gentle, empathetic, soft"
  };

  const moodStyle = moodStyles[mood] || "friendly, cute";

  // Interest-based details
  let interestDetails = "";
  if (interests.length > 0) {
    interestDetails = `, maybe with subtle hints of ${interests.slice(0, 2).join(" and ")} interests`;
  }

  const prompt = `A cute digital pet avatar, ${styleDescription}, ${moodStyle}${interestDetails}. 
Cartoon style, simple and clean design, pastel colors, friendly expression, suitable for a group chat pet. 
No text, no background, just the pet character.`;

  try {
    const response = await request(`${OPENAI_API_URL}/images/generations`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
        response_format: "url",
      }),
    });

    if (response.statusCode !== 200) {
      const error = await response.body.text();
      console.error(`[AVATAR] Error ${response.statusCode}:`, error);
      return null;
    }

    const data: any = await response.body.json();
    const imageUrl = data.data?.[0]?.url;

    if (!imageUrl) {
      console.error("[AVATAR] No image URL in response");
      return null;
    }

    console.log(`[AVATAR] Generated avatar: ${imageUrl}`);
    return imageUrl;
  } catch (error: any) {
    console.error("[AVATAR] Generation error:", error.message);
    return null;
  }
}

