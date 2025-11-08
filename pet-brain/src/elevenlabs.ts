import "dotenv/config";
import { request } from "undici";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!;
const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1";

interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style?: number;
  use_speaker_boost?: boolean;
}

// Predefined animal voice IDs (you'll need to replace these with actual ElevenLabs voice IDs)
// Or use voice cloning to create custom animal voices
const ANIMAL_VOICES: Record<string, string> = {
  cat: "21m00Tcm4TlvDq8ikWAM", // Example: Rachel (adjustable)
  dog: "pNInz6obpgDQGcFmaJgB", // Example: Adam
  bird: "EXAVITQu4vr4xnSDxMaL", // Example: Bella
};

// Default voice settings for animal-like sounds
const ANIMAL_VOICE_SETTINGS: Record<string, VoiceSettings> = {
  cat: {
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0.3,
    use_speaker_boost: true,
  },
  dog: {
    stability: 0.6,
    similarity_boost: 0.8,
    style: 0.4,
    use_speaker_boost: true,
  },
  bird: {
    stability: 0.4,
    similarity_boost: 0.7,
    style: 0.5,
    use_speaker_boost: true,
  },
};

/**
 * Generate animal voice audio using ElevenLabs TTS
 */
export async function generateAnimalVoice(
  text: string,
  voiceKind: "cat" | "dog" | "bird" = "cat",
  durationHint: "short" | "medium" | "long" = "medium"
): Promise<Buffer | null> {
  if (!ELEVENLABS_API_KEY) {
    console.warn("[ELEVENLABS] No API key provided, skipping voice generation");
    return null;
  }

  const voiceId = ANIMAL_VOICES[voiceKind] || ANIMAL_VOICES.cat;
  const voiceSettings = ANIMAL_VOICE_SETTINGS[voiceKind] || ANIMAL_VOICE_SETTINGS.cat;
  
  // Adjust voice settings based on duration hint
  if (durationHint === "short") {
    voiceSettings.stability = Math.max(0.3, voiceSettings.stability - 0.2);
  } else if (durationHint === "long") {
    voiceSettings.stability = Math.min(0.8, voiceSettings.stability + 0.2);
  }

  try {
    const response = await request(`${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2", // or "eleven_turbo_v2" for faster generation
        voice_settings: voiceSettings,
      }),
    });

    if (response.statusCode !== 200) {
      const error = await response.body.text();
      console.error(`[ELEVENLABS] Error ${response.statusCode}:`, error);
      return null;
    }

    const audioBuffer = await response.body.arrayBuffer();
    return Buffer.from(audioBuffer);
  } catch (error: any) {
    console.error("[ELEVENLABS] Generation error:", error.message);
    return null;
  }
}

/**
 * List available voices (for testing)
 */
export async function listVoices(): Promise<any[]> {
  if (!ELEVENLABS_API_KEY) {
    return [];
  }

  try {
    const response = await request(`${ELEVENLABS_API_URL}/voices`, {
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
      },
    });

    const data: any = await response.body.json();
    return data.voices || [];
  } catch (error: any) {
    console.error("[ELEVENLABS] List voices error:", error.message);
    return [];
  }
}

/**
 * Save audio buffer to file (for testing)
 */
export async function saveAudioToFile(audioBuffer: Buffer, filename: string): Promise<void> {
  const fs = await import("fs/promises");
  await fs.writeFile(filename, audioBuffer);
  console.log(`[ELEVENLABS] Saved audio to ${filename}`);
}
