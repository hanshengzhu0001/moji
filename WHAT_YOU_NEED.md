# ✅ What You Still Need To Do

## 🎯 Quick Checklist

### 1. **API Keys** (Required)

#### ElevenLabs API Key
- [ ] Sign up at https://elevenlabs.io
- [ ] Go to Profile > API Key
- [ ] Copy your API key
- [ ] Add to `pet-brain/.env`:
  ```bash
  ELEVENLABS_API_KEY=your_key_here
  ```

#### OpenAI API Key (if not already done)
- [ ] Sign up at https://platform.openai.com
- [ ] Go to API Keys > Create new key
- [ ] Make sure you have DALL-E 3 access
- [ ] Add to `pet-brain/.env`:
  ```bash
  OPENAI_API_KEY=your_key_here
  ```

### 2. **Create `.env` File** (if missing)

```bash
cd pet-brain
cat > .env << 'EOF'
PORT=3001
BRIDGE_URL=http://localhost:3000

# Imgflip (for memes)
IMGFLIP_USERNAME=HansZHU1
IMGFLIP_PASSWORD=@1World1Dream

# OpenAI (for Dedalus Agent + Sticker Generation)
OPENAI_API_KEY=your_openai_key_here

# ElevenLabs (for animal voice generation)
ELEVENLABS_API_KEY=your_elevenlabs_key_here

# Optional: AWS S3 for audio storage
AWS_BUCKET_NAME=
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

TARGET_CHAT_ID=your_group_chat_id_here
EOF
```

### 3. **Test Components**

#### Test ElevenLabs TTS
```bash
cd pet-brain
bun run test:elevenlabs
```
**Expected:** 3 MP3 files generated (cat, dog, bird voices)

#### Test Sticker Generation
```bash
cd pet-brain
bun run test:sticker
```
**Expected:** 4 sticker images generated via DALL-E 3

### 4. **Optional: Create Custom Moji Voice**

If you want a custom voice for Moji (recommended):

1. **Go to ElevenLabs:**
   - Visit https://elevenlabs.io/app/voice-cloning
   - Create a new voice
   - Use the prompt I provided earlier
   - Upload sample audio or use text-to-speech samples

2. **Update Voice ID:**
   - Copy your new voice ID
   - Update `pet-brain/src/elevenlabs.ts`:
     ```typescript
     const ANIMAL_VOICES: Record<string, string> = {
       cat: "your_moji_voice_id_here",
       dog: "your_moji_voice_id_here",
       bird: "your_moji_voice_id_here",
     };
     ```

### 5. **Optional: Configure AWS S3** (for audio storage)

If you want to store generated audio in S3:

1. **Create S3 Bucket:**
   - Go to AWS Console > S3
   - Create a new bucket
   - Enable public read access (or use presigned URLs)

2. **Get AWS Credentials:**
   - Go to AWS Console > IAM
   - Create a user with S3 access
   - Get Access Key ID and Secret Access Key

3. **Add to `.env`:**
   ```bash
   AWS_BUCKET_NAME=your_bucket_name
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your_access_key
   AWS_SECRET_ACCESS_KEY=your_secret_key
   ```

### 6. **Test End-to-End**

#### Start Services
```bash
# Terminal 1: Pet Brain
cd pet-brain && bun run dev

# Terminal 2: iMessage Bridge
cd imessage-bridge && bun run dev
```

#### Test Sticker Command
In your group chat:
```
@moji sticker: a cute cat with big eyes
```

#### Test Meme Command
In your group chat:
```
@moji meme: finals stress
```

---

## 📋 Current Status

### ✅ Already Done
- [x] ElevenLabs integration code
- [x] Sticker generation code
- [x] Test scripts created
- [x] Integration into pet-brain
- [x] iMessage bridge integration
- [x] Documentation updated

### ❌ Still Needed
- [ ] ElevenLabs API key
- [ ] OpenAI API key (if not already)
- [ ] Create `.env` file with API keys
- [ ] Test ElevenLabs TTS
- [ ] Test sticker generation
- [ ] (Optional) Create custom Moji voice
- [ ] (Optional) Configure AWS S3
- [ ] Test end-to-end in iMessage

---

## 🚀 Quick Start (5 minutes)

1. **Get API Keys:**
   - ElevenLabs: https://elevenlabs.io (free tier available)
   - OpenAI: https://platform.openai.com (need DALL-E 3 access)

2. **Add to `.env`:**
   ```bash
   cd pet-brain
   echo "ELEVENLABS_API_KEY=your_key" >> .env
   echo "OPENAI_API_KEY=your_key" >> .env
   ```

3. **Test:**
   ```bash
   bun run test:elevenlabs
   bun run test:sticker
   ```

4. **Done!** 🎉

---

## 🔧 Troubleshooting

### "ELEVENLABS_API_KEY not found"
- Add key to `pet-brain/.env`
- Restart Pet Brain service

### "OPENAI_API_KEY not found"
- Add key to `pet-brain/.env`
- Make sure you have DALL-E 3 access

### Test scripts fail
- Check API keys are correct
- Verify network connection
- Check API account has credits/access

### Stickers not generating
- Check OpenAI API key
- Verify DALL-E 3 access
- Check rate limits

### Voices not generating
- Check ElevenLabs API key
- Verify account has credits
- Check network connection

---

## 📚 Next Steps After Setup

1. **Customize Voice:**
   - Create custom Moji voice in ElevenLabs
   - Update voice IDs in `elevenlabs.ts`

2. **Test in Production:**
   - Start all services
   - Test commands in group chat
   - Verify audio plays in desktop app

3. **Monitor Usage:**
   - Check API usage/credits
   - Monitor rate limits
   - Optimize voice settings if needed

---

## 🎯 Summary

**Minimum Required:**
1. ElevenLabs API key
2. OpenAI API key (if not already)
3. Add both to `pet-brain/.env`
4. Run test scripts

**Optional but Recommended:**
- Create custom Moji voice
- Configure AWS S3 for audio storage
- Test end-to-end in iMessage

**Time Required:**
- Getting API keys: 5-10 minutes
- Testing: 5 minutes
- Custom voice: 10-15 minutes (optional)
- Total: ~20 minutes

---

You're almost there! Just need the API keys and you're ready to test! 🚀

