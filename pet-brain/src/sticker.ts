import "dotenv/config";
import { request } from "undici";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const OPENAI_API_URL = "https://api.openai.com/v1";

/**
 * Generate a sticker image using DALL-E 3
 * Note: DALL-E 3 only supports 1024x1024 size
 */
export async function generateSticker(
  prompt: string,
  style: "cute" | "funny" | "sad" | "excited" = "cute",
  size: "256x256" | "512x512" | "1024x1024" = "1024x1024"
): Promise<string | null> {
  if (!OPENAI_API_KEY) {
    console.warn("[STICKER] No OpenAI API key provided, skipping sticker generation");
    return null;
  }

  // Enhance prompt for sticker style
  const enhancedPrompt = `A cute animated sticker of ${prompt}, ${style} style, transparent background, simple design, bold colors, iMessage sticker style, high quality, vector art`;

  try {
    const response = await request(`${OPENAI_API_URL}/images/generations`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: enhancedPrompt,
        n: 1,
        size: "1024x1024", // DALL-E 3 only supports 1024x1024 (size parameter ignored)
        quality: "standard",
        response_format: "url",
      }),
    });

    if (response.statusCode !== 200) {
      const error = await response.body.text();
      console.error(`[STICKER] Error ${response.statusCode}:`, error);
      return null;
    }

    const data: any = await response.body.json();
    const imageUrl = data.data?.[0]?.url;

    if (!imageUrl) {
      console.error("[STICKER] No image URL in response");
      return null;
    }

    console.log(`[STICKER] Generated sticker: ${imageUrl}`);
    return imageUrl;
  } catch (error: any) {
    console.error("[STICKER] Generation error:", error.message);
    return null;
  }
}

/**
 * Generate sticker with transparent background (using DALL-E 3 with prompt engineering)
 */
export async function generateTransparentSticker(
  prompt: string,
  style: "cute" | "funny" | "sad" | "excited" = "cute"
): Promise<string | null> {
  // DALL-E 3 doesn't natively support transparency, but we can:
  // 1. Generate with white background and remove it
  // 2. Use a different model that supports transparency
  // 3. Post-process with image editing
  
  // For now, we'll generate with a prompt that suggests transparent-friendly design
  const enhancedPrompt = `A cute animated sticker of ${prompt}, ${style} style, white or transparent background, simple design, bold colors, iMessage sticker style, high quality, vector art, no shadows, clean edges`;

  const imageUrl = await generateSticker(enhancedPrompt, style, "1024x1024");
  
  // TODO: Add image processing to remove white background and make transparent
  // This would require a library like sharp or jimp
  
  return imageUrl;
}

/**
 * Download image from URL and convert to base64 (for iMessage)
 */
export async function downloadImageAsBase64(imageUrl: string): Promise<string | null> {
  try {
    const response = await request(imageUrl);
    const buffer = await response.body.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    return base64;
  } catch (error: any) {
    console.error("[STICKER] Download error:", error.message);
    return null;
  }
}

