#!/usr/bin/env bun
import "dotenv/config";
import { generateSticker, generateTransparentSticker, downloadImageAsBase64 } from "./src/sticker";
import { writeFile } from "fs/promises";

async function testStickerGeneration() {
  console.log("🎨 Testing Sticker Generation (DALL-E 3)\n");

  // Check API key
  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ OPENAI_API_KEY not found in .env");
    console.log("\nTo get an API key:");
    console.log("1. Sign up at https://platform.openai.com");
    console.log("2. Go to API Keys");
    console.log("3. Create a new key");
    console.log("4. Add to pet-brain/.env: OPENAI_API_KEY=your_key_here");
    process.exit(1);
  }

  console.log("✅ API Key found\n");

  // Test 1: Cute sticker
  console.log("1️⃣  Testing cute sticker: 'a happy cat with big eyes'");
  const cuteSticker = await generateSticker(
    "a happy cat with big eyes",
    "cute"
  );
  if (cuteSticker) {
    console.log(`✅ Generated: ${cuteSticker}\n`);
    
    // Download and save
    const base64 = await downloadImageAsBase64(cuteSticker);
    if (base64) {
      await writeFile("test-sticker-cute.txt", base64);
      console.log("💾 Saved base64 to test-sticker-cute.txt\n");
    }
  } else {
    console.log("❌ Failed to generate cute sticker\n");
  }

  // Test 2: Funny sticker
  console.log("2️⃣  Testing funny sticker: 'a stressed student with coffee'");
  const funnySticker = await generateSticker(
    "a stressed student with coffee",
    "funny"
  );
  if (funnySticker) {
    console.log(`✅ Generated: ${funnySticker}\n`);
  } else {
    console.log("❌ Failed to generate funny sticker\n");
  }

  // Test 3: Excited sticker
  console.log("3️⃣  Testing excited sticker: 'a celebrating friend group'");
  const excitedSticker = await generateSticker(
    "a celebrating friend group",
    "excited"
  );
  if (excitedSticker) {
    console.log(`✅ Generated: ${excitedSticker}\n`);
  } else {
    console.log("❌ Failed to generate excited sticker\n");
  }

  // Test 4: Transparent sticker (with enhanced prompt)
  console.log("4️⃣  Testing transparent sticker: 'Moji the desktop pet'");
  const transparentSticker = await generateTransparentSticker(
    "Moji the desktop pet, a cute cat character",
    "cute"
  );
  if (transparentSticker) {
    console.log(`✅ Generated: ${transparentSticker}\n`);
    console.log("ℹ️  Note: DALL-E 3 doesn't support transparency natively.");
    console.log("   You may need to post-process to remove white background.\n");
  } else {
    console.log("❌ Failed to generate transparent sticker\n");
  }

  console.log("🎉 Test complete!");
  console.log("\nNext steps:");
  console.log("1. Open the generated image URLs in your browser");
  console.log("2. Verify sticker quality and style");
  console.log("3. Integrate with pet-brain/src/index.ts for real-time sticker generation");
  console.log("4. Add post-processing for transparent backgrounds (optional)");
}

testStickerGeneration().catch(console.error);

