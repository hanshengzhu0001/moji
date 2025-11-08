# 🎤🎨 ElevenLabs & Sticker Generation Setup

## ✅ What's Been Added

### 1. **ElevenLabs TTS Integration** (`pet-brain/src/elevenlabs.ts`)
- Animal voice generation (cat, dog, bird)
- Configurable voice settings per animal type
- Automatic voice generation when pet speaks
- Audio stored in S3 (or database fallback)

### 2. **AI Sticker Generation** (`pet-brain/src/sticker.ts`)
- DALL-E 3 integration for sticker creation
- Multiple styles: cute, funny, sad, excited
- Optimized prompts for iMessage sticker style
- Automatic posting to group chat

### 3. **Test Scripts**
- `pet-brain/test-elevenlabs.ts` - Test voice generation
- `pet-brain/test-sticker.ts` - Test sticker generation

### 4. **Integration**
- Pet Brain automatically generates voices when pet speaks
- iMessage Bridge detects `@moji sticker:` commands
- Stickers posted directly to group chat

---

## 🚀 Quick Start

### Step 1: Get API Keys

**ElevenLabs:**
1. Sign up at https://elevenlabs.io
2. Go to Profile > API Key
3. Copy your API key

**OpenAI (for DALL-E 3):**
1. Sign up at https://platform.openai.com
2. Go to API Keys
3. Create a new key (requires DALL-E 3 access)

### Step 2: Add to `.env`

```bash
cd pet-brain
cat >> .env << EOF

# ElevenLabs (for animal voice generation)
ELEVENLABS_API_KEY=your_elevenlabs_key_here

# OpenAI (already should be there for Dedalus Agent)
OPENAI_API_KEY=your_openai_key_here
EOF
```

### Step 3: Test Components

**Test ElevenLabs:**
```bash
cd pet-brain
bun run test:elevenlabs
```

**Test Sticker Generation:**
```bash
cd pet-brain
bun run test:sticker
```

---

## 🎮 Usage

### Generate Sticker in iMessage

In your group chat:
```
@moji sticker: a cute cat with big eyes
@moji make a sticker of a happy friend group
@moji generate sticker: a stressed student (funny style)
```

### Voice Generation (Automatic)

Voices are generated automatically when:
1. Pet Brain calls `/tick` endpoint
2. Agent decides to `speak_to_user`
3. ElevenLabs generates audio
4. Audio stored in S3 (or database)
5. Desktop app plays audio

---

## 📝 Files Added/Modified

### New Files
- `pet-brain/src/elevenlabs.ts` - ElevenLabs TTS integration
- `pet-brain/src/sticker.ts` - DALL-E 3 sticker generation
- `pet-brain/test-elevenlabs.ts` - ElevenLabs test script
- `pet-brain/test-sticker.ts` - Sticker generation test script
- `TESTING.md` - Comprehensive testing guide
- `QUICK_TEST.md` - Quick test guide

### Modified Files
- `pet-brain/src/index.ts` - Integrated voice & sticker generation
- `pet-brain/package.json` - Added test scripts
- `imessage-bridge/src/index.ts` - Added sticker command detection
- `README.md` - Updated with new features
- `SETUP.md` - Updated with API keys

---

## 🔧 Configuration

### Voice Settings

Edit `pet-brain/src/elevenlabs.ts` to customize:
- Voice IDs for each animal type
- Voice stability and similarity settings
- Duration hints (short, medium, long)

### Sticker Styles

Edit `pet-brain/src/sticker.ts` to customize:
- Sticker prompt enhancement
- Style options (cute, funny, sad, excited)
- Image size (DALL-E 3 only supports 1024x1024)

---

## 🐛 Troubleshooting

### ElevenLabs Issues

**Error: `ELEVENLABS_API_KEY not found`**
- Add key to `pet-brain/.env`
- Restart Pet Brain service

**Error: `401 Unauthorized`**
- Check API key is valid
- Verify account has credits

**No audio generated:**
- Check API key
- Verify network connection
- Check logs for errors

### Sticker Generation Issues

**Error: `OPENAI_API_KEY not found`**
- Add key to `pet-brain/.env`
- Restart Pet Brain service

**Error: `429 Rate Limit`**
- Too many requests
- Wait a few minutes
- Check OpenAI usage limits

**Stickers not appearing:**
- Check bridge is running
- Verify `TARGET_CHAT_ID` is correct
- Check bridge logs

---

## 📊 API Endpoints

### New Endpoints

**POST** `/events/sticker-request`
- Request body: `{ chatId, userId, prompt, style }`
- Generates sticker via DALL-E 3
- Posts to group chat

### Modified Endpoints

**POST** `/tick`
- Now generates voice audio when pet speaks
- Stores audio in S3 (or database)
- Updates utterances with audio URL

---

## 🎯 Next Steps

1. ✅ **Test both components independently**
2. ✅ **Verify audio/sticker quality**
3. ✅ **Test integration with iMessage**
4. ✅ **Update voice IDs if needed**
5. ✅ **Configure S3 for audio storage (optional)**

---

## 📚 Documentation

- **Detailed Testing:** See [TESTING.md](./TESTING.md)
- **Quick Test:** See [QUICK_TEST.md](./QUICK_TEST.md)
- **Full Setup:** See [SETUP.md](./SETUP.md)
- **Main README:** See [README.md](./README.md)

---

## 🎉 You're Ready!

Both components are fully integrated and ready to test. Run the test scripts to verify everything works, then try the commands in your group chat!

