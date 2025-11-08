#!/usr/bin/env bun
import "dotenv/config";
import { generateAnimalVoice, listVoices, saveAudioToFile } from "./src/elevenlabs";

const ANIMAL_VOICES: Record<string, string> = {
  cat: "21m00Tcm4TlvDq8ikWAM",
  dog: "pNInz6obpgDQGcFmaJgB",
  bird: "EXAVITQu4vr4xnSDxMaL",
};

async function testElevenLabs() {
  console.log("🎤 Testing ElevenLabs TTS Integration\n");

  // Check API key
  if (!process.env.ELEVENLABS_API_KEY) {
    console.error("❌ ELEVENLABS_API_KEY not found in .env");
    console.log("\nTo get an API key:");
    console.log("1. Sign up at https://elevenlabs.io");
    console.log("2. Go to Profile > API Key");
    console.log("3. Copy your API key");
    console.log("4. Add to pet-brain/.env: ELEVENLABS_API_KEY=your_key_here");
    process.exit(1);
  }

  console.log("✅ API Key found\n");

  // List available voices
  console.log("📋 Listing available voices...");
  const voices = await listVoices();
  if (voices.length > 0) {
    console.log(`Found ${voices.length} voices:\n`);
    voices.slice(0, 5).forEach((voice: any) => {
      console.log(`  - ${voice.name} (${voice.voice_id})`);
    });
    console.log("");
  } else {
    console.log("⚠️  No voices found (this is okay if API key is invalid)\n");
  }
  
  // Show current voice IDs being used
  console.log("🎤 Current voice IDs in use:\n");
  console.log(`  - Cat: ${ANIMAL_VOICES.cat}`);
  console.log(`  - Dog: ${ANIMAL_VOICES.dog}`);
  console.log(`  - Bird: ${ANIMAL_VOICES.bird}`);
  console.log("");

  // Test cat voice
  console.log("🐱 Testing cat voice (short)...");
  const catShort = await generateAnimalVoice(
    "Meow! I'm Moji, your friendly desktop pet!",
    "cat",
    "short"
  );
  if (catShort) {
    await saveAudioToFile(catShort, "test-cat-short.mp3");
    console.log("✅ Cat voice generated successfully!\n");
  } else {
    console.log("❌ Failed to generate cat voice\n");
  }

  // Test dog voice
  console.log("🐶 Testing dog voice (medium)...");
  const dogMedium = await generateAnimalVoice(
    "Woof! Take a deep breath, you've got this!",
    "dog",
    "medium"
  );
  if (dogMedium) {
    await saveAudioToFile(dogMedium, "test-dog-medium.mp3");
    console.log("✅ Dog voice generated successfully!\n");
  } else {
    console.log("❌ Failed to generate dog voice\n");
  }

  // Test bird voice
  console.log("🐦 Testing bird voice (long)...");
  const birdLong = await generateAnimalVoice(
    "Chirp chirp! Your energy is contagious! Keep shining!",
    "bird",
    "long"
  );
  if (birdLong) {
    await saveAudioToFile(birdLong, "test-bird-long.mp3");
    console.log("✅ Bird voice generated successfully!\n");
  } else {
    console.log("❌ Failed to generate bird voice\n");
  }

  console.log("🎉 Test complete!");
  console.log("\nNext steps:");
  console.log("1. Play the generated MP3 files to verify quality");
  console.log("2. Update ANIMAL_VOICES in src/elevenlabs.ts with your preferred voice IDs");
  console.log("3. Integrate with pet-brain/src/index.ts for real-time voice generation");
}

testElevenLabs().catch(console.error);

