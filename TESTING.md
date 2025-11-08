# 🧪 Testing Guide: ElevenLabs & Sticker Generation

This guide walks you through testing the ElevenLabs TTS and AI sticker generation components.

---

## 🎤 Testing ElevenLabs TTS

### Prerequisites

1. **Get an ElevenLabs API Key:**
   - Sign up at https://elevenlabs.io
   - Go to Profile > API Key
   - Copy your API key

2. **Add to `.env`:**
   ```bash
   cd pet-brain
   echo "ELEVENLABS_API_KEY=your_key_here" >> .env
   ```

### Run Test

```bash
cd pet-brain
bun run test:elevenlabs
```

### Expected Output

```
🎤 Testing ElevenLabs TTS Integration

✅ API Key found

📋 Listing available voices...
Found 25 voices:
  - Rachel (21m00Tcm4TlvDq8ikWAM)
  - Adam (pNInz6obpgDQGcFmaJgB)
  - Bella (EXAVITQu4vr4xnSDxMaL)
  ...

🐱 Testing cat voice (short)...
[ELEVENLABS] Saved audio to test-cat-short.mp3
✅ Cat voice generated successfully!

🐶 Testing dog voice (medium)...
[ELEVENLABS] Saved audio to test-dog-medium.mp3
✅ Dog voice generated successfully!

🐦 Testing bird voice (long)...
[ELEVENLABS] Saved audio to test-bird-long.mp3
✅ Bird voice generated successfully!

🎉 Test complete!
```

### Verify Audio Files

1. Play the generated MP3 files:
   ```bash
   open test-cat-short.mp3
   open test-dog-medium.mp3
   open test-bird-long.mp3
   ```

2. **Update Voice IDs** (optional):
   - If you want different voices, update `ANIMAL_VOICES` in `src/elevenlabs.ts`
   - Use voice IDs from the test output

### Integration Test

Once the test passes, voice generation will work automatically when:
- Pet Brain calls `/tick` endpoint
- Agent decides to `speak_to_user`
- ElevenLabs generates audio → stored in S3 (or database fallback)

---

## 🎨 Testing Sticker Generation

### Prerequisites

1. **Get an OpenAI API Key:**
   - Sign up at https://platform.openai.com
   - Go to API Keys
   - Create a new key (requires DALL-E 3 access)

2. **Add to `.env` (if not already):**
   ```bash
   cd pet-brain
   echo "OPENAI_API_KEY=your_key_here" >> .env
   ```

### Run Test

```bash
cd pet-brain
bun run test:sticker
```

### Expected Output

```
🎨 Testing Sticker Generation (DALL-E 3)

✅ API Key found

1️⃣  Testing cute sticker: 'a happy cat with big eyes'
[STICKER] Generated sticker: https://oaidalleapiprodscus.blob.core.windows.net/...
✅ Generated: https://oaidalleapiprodscus.blob.core.windows.net/...
💾 Saved base64 to test-sticker-cute.txt

2️⃣  Testing funny sticker: 'a stressed student with coffee'
[STICKER] Generated sticker: https://oaidalleapiprodscus.blob.core.windows.net/...
✅ Generated: https://oaidalleapiprodscus.blob.core.windows.net/...

3️⃣  Testing excited sticker: 'a celebrating friend group'
[STICKER] Generated sticker: https://oaidalleapiprodscus.blob.core.windows.net/...
✅ Generated: https://oaidalleapiprodscus.blob.core.windows.net/...

4️⃣  Testing transparent sticker: 'Moji the desktop pet'
[STICKER] Generated sticker: https://oaidalleapiprodscus.blob.core.windows.net/...
✅ Generated: https://oaidalleapiprodscus.blob.core.windows.net/...

🎉 Test complete!
```

### Verify Stickers

1. **Open image URLs:**
   - Copy URLs from test output
   - Open in browser to view generated stickers

2. **Check quality:**
   - Stickers should be 1024x1024
   - Cute, simple design
   - Suitable for iMessage

### Integration Test

Once the test passes, sticker generation works when:
- User sends: `@moji sticker: a happy cat`
- Bridge detects command → `/events/sticker-request`
- DALL-E 3 generates sticker → sent to group chat

---

## 🚀 End-to-End Testing

### Test Sticker Generation in iMessage

1. **Start services:**
   ```bash
   # Terminal 1: Pet Brain
   cd pet-brain && bun run dev

   # Terminal 2: iMessage Bridge
   cd imessage-bridge && bun run dev
   ```

2. **Send command in group chat:**
   ```
   @moji sticker: a cute cat with big eyes
   ```

3. **Expected result:**
   - Bridge detects command
   - Pet Brain generates sticker via DALL-E 3
   - Sticker appears in group chat within 10-20 seconds

### Test Voice Generation

1. **Trigger pet decision:**
   ```bash
   curl -X POST http://localhost:3001/tick
   ```

2. **Check logs:**
   - Pet Brain should generate voice audio
   - Audio stored in S3 (or database)
   - Utterance saved for desktop app

3. **Desktop app:**
   - Open desktop app
   - Poll `/pet/state` endpoint
   - Should receive utterance with audio URL

---

## 🔧 Troubleshooting

### ElevenLabs Issues

**Error: `ELEVENLABS_API_KEY not found`**
- Add key to `pet-brain/.env`
- Restart Pet Brain service

**Error: `401 Unauthorized`**
- Check API key is valid
- Verify account has credits

**Error: `No voices found`**
- API key may be invalid
- Check network connection

### Sticker Generation Issues

**Error: `OPENAI_API_KEY not found`**
- Add key to `pet-brain/.env`
- Restart Pet Brain service

**Error: `429 Rate Limit`**
- Too many requests
- Wait a few minutes
- Check OpenAI usage limits

**Error: `Invalid image format`**
- DALL-E 3 only supports 1024x1024
- Check API response format

**Stickers not transparent:**
- DALL-E 3 doesn't support transparency natively
- Use post-processing to remove white background (optional)

---

## 📝 Next Steps

1. ✅ **Test both components independently**
2. ✅ **Verify audio/sticker quality**
3. ✅ **Test integration with iMessage**
4. ✅ **Update voice IDs if needed**
5. ✅ **Configure S3 for audio storage (optional)**

---

## 🎯 Production Checklist

- [ ] ElevenLabs API key configured
- [ ] OpenAI API key configured (DALL-E 3 access)
- [ ] Voice generation tested
- [ ] Sticker generation tested
- [ ] S3 configured for audio storage (optional)
- [ ] Voice IDs updated in `src/elevenlabs.ts`
- [ ] Rate limits monitored
- [ ] Error handling verified

---

## 📚 Additional Resources

- **ElevenLabs Docs:** https://elevenlabs.io/docs
- **OpenAI DALL-E 3:** https://platform.openai.com/docs/guides/images
- **Voice Cloning:** https://elevenlabs.io/voice-cloning (for custom animal voices)

