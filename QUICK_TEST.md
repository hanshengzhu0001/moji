# 🚀 Quick Test Guide

## Test ElevenLabs TTS

```bash
cd pet-brain
bun run test:elevenlabs
```

**Prerequisites:**
- Add `ELEVENLABS_API_KEY=your_key` to `pet-brain/.env`
- Get key from https://elevenlabs.io

**Expected:** 3 MP3 files generated (cat, dog, bird voices)

---

## Test Sticker Generation

```bash
cd pet-brain
bun run test:sticker
```

**Prerequisites:**
- Add `OPENAI_API_KEY=your_key` to `pet-brain/.env`
- Get key from https://platform.openai.com (requires DALL-E 3 access)

**Expected:** 4 sticker images generated via DALL-E 3

---

## Test in iMessage

### 1. Start Services

```bash
# Terminal 1
cd pet-brain && bun run dev

# Terminal 2
cd imessage-bridge && bun run dev
```

### 2. Test Sticker Command

In your group chat:
```
@moji sticker: a cute cat with big eyes
```

**Expected:** Sticker appears in chat within 10-20 seconds

### 3. Test Meme Command

In your group chat:
```
@moji meme: finals stress
```

**Expected:** Meme appears in chat

---

## Troubleshooting

**ElevenLabs not working?**
- Check API key in `.env`
- Verify account has credits
- Check network connection

**Sticker generation failing?**
- Check OpenAI API key
- Verify DALL-E 3 access
- Check rate limits

**Commands not detected?**
- Check `TARGET_CHAT_ID` in `.env`
- Verify bridge is watching correct chat
- Check bridge logs

---

For detailed testing, see [TESTING.md](./TESTING.md)

