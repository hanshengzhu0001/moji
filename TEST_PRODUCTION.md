# 🧪 Production Testing Guide

## Step 1: Check Configuration

### Verify .env Files

**Pet Brain (`pet-brain/.env`):**
```bash
cd pet-brain
cat .env | grep -E "(OPENAI_API_KEY|ELEVENLABS_API_KEY|TARGET_CHAT_ID|IMGFLIP)"
```

Should show:
- ✅ `OPENAI_API_KEY=sk-...`
- ✅ `ELEVENLABS_API_KEY=sk_...`
- ✅ `IMGFLIP_USERNAME=...`
- ✅ `IMGFLIP_PASSWORD=...`
- ⚠️ `TARGET_CHAT_ID=...` (your group chat ID)

**iMessage Bridge (`imessage-bridge/.env`):**
```bash
cd imessage-bridge
cat .env | grep -E "(TARGET_CHAT_ID|BRAIN_URL)"
```

Should show:
- ✅ `TARGET_CHAT_ID=...` (your group chat ID)
- ✅ `BRAIN_URL=http://localhost:3001`

### Get Your Group Chat ID (if not set)

```bash
sqlite3 ~/Library/Messages/chat.db "SELECT chat_identifier, display_name FROM chat WHERE display_name IS NOT NULL ORDER BY display_name LIMIT 20;"
```

Look for your group chat and copy the `chat_identifier`.

---

## Step 2: Start Services

### Option A: Manual (Recommended for Testing)

**Terminal 1 - Pet Brain:**
```bash
cd pet-brain
bun run dev
```

You should see:
```
🧠 Pet Brain listening on port 3001
```

**Terminal 2 - iMessage Bridge:**
```bash
cd imessage-bridge
bun run dev
```

You should see:
```
🌉 iMessage Bridge listening on port 3000
📱 Watching chat: YOUR_CHAT_ID
```

### Option B: Automated Script

```bash
cd /Users/hanszhu/Desktop/hackprinceton/moji
./START_SERVICES.sh
```

---

## Step 3: Test Commands

### Test 1: Sticker Generation

**In your iMessage group chat, send:**
```
@moji sticker: a cute cat with big eyes
```

**Expected Result:**
- Bridge detects command
- Pet Brain generates sticker via DALL-E 3
- Sticker appears in group chat within 10-20 seconds

**Check Logs:**
- Pet Brain: `[STICKER] Request from...` → `[STICKER] ✅ Sent sticker`
- Bridge: `[STICKER REQ] Prompt: ...` → `[iMessage] Sent message`

### Test 2: Meme Generation

**In your iMessage group chat, send:**
```
@moji meme: finals stress
```

**Expected Result:**
- Bridge detects command
- Pet Brain generates meme via Imgflip
- Meme appears in group chat within 2-5 seconds

**Check Logs:**
- Pet Brain: `[MEME] Request from...` → `[MEME] ✅ Sent`
- Bridge: `[MEME REQ] Topic: ...` → `[iMessage] Sent message`

### Test 3: Voice Generation

**Trigger pet decision:**
```bash
curl -X POST http://localhost:3001/tick
```

**Expected Result:**
- Pet Brain generates voice audio via ElevenLabs
- Audio stored in database
- Utterance saved for desktop app

**Check Logs:**
- Pet Brain: `[TICK] Running pet decision cycle...` → `[TICK] ✅ Generated voice audio`

---

## Step 4: Verify Everything Works

### Check Service Health

**Pet Brain:**
```bash
curl http://localhost:3001/health
```
Should return: `{"status":"ok"}`

**iMessage Bridge:**
```bash
curl http://localhost:3000/health
```
Should return: `{"status":"ok","watching":"YOUR_CHAT_ID"}`

### Check Logs

**Pet Brain logs should show:**
- ✅ Server started on port 3001
- ✅ Database initialized
- ✅ Meme catalog loaded
- ✅ Ready to receive requests

**Bridge logs should show:**
- ✅ Server started on port 3000
- ✅ Watching chat: YOUR_CHAT_ID
- ✅ Ready to receive messages

---

## Step 5: Troubleshooting

### Stickers Not Appearing

**Check:**
1. Is Pet Brain running? (`curl http://localhost:3001/health`)
2. Is Bridge running? (`curl http://localhost:3000/health`)
3. Check OpenAI API key in `.env`
4. Check rate limits (DALL-E 3 may have limits)
5. Check logs for errors

**Common Issues:**
- `401 Unauthorized` → Invalid API key
- `429 Rate Limit` → Too many requests, wait a bit
- `Timeout` → API too slow, check network

### Memes Not Appearing

**Check:**
1. Is Pet Brain running?
2. Is Bridge running?
3. Check Imgflip credentials in `.env`
4. Check logs for errors

**Common Issues:**
- `Invalid credentials` → Check Imgflip username/password
- `Template not found` → Check meme catalog loaded

### Voices Not Generating

**Check:**
1. Is ElevenLabs API key set?
2. Check account has credits
3. Check logs for errors

**Common Issues:**
- `401 Unauthorized` → Invalid API key
- `Insufficient credits` → Add credits to ElevenLabs account
- `Voice not found` → Check voice IDs in `elevenlabs.ts`

### Commands Not Detected

**Check:**
1. Is `TARGET_CHAT_ID` correct?
2. Is Bridge watching the right chat?
3. Check message format (must include `@moji`)
4. Check logs for message reception

**Common Issues:**
- Wrong chat ID → Update `TARGET_CHAT_ID` in `.env`
- Messages not received → Check Full Disk Access permissions
- Pattern not matching → Check command format

---

## Step 6: Test Scenarios

### Scenario 1: Happy Moment
1. Send message: "Just aced my exam! 🎉"
2. Wait for mood classification
3. Check if pet responds with encouragement

### Scenario 2: Stressed Moment
1. Send message: "I'm so stressed about finals 😭"
2. Wait for mood classification
3. Check if pet responds with support

### Scenario 3: Sticker Request
1. Send: `@moji sticker: a happy friend group`
2. Wait 10-20 seconds
3. Verify sticker appears in chat

### Scenario 4: Meme Request
1. Send: `@moji meme: deadline stress`
2. Wait 2-5 seconds
3. Verify meme appears in chat

---

## Success Criteria

✅ **Services Start:**
- Pet Brain on port 3001
- Bridge on port 3000
- Both show "listening" messages

✅ **Commands Work:**
- Sticker generation works
- Meme generation works
- Commands detected correctly

✅ **Integration Works:**
- Messages forwarded to Brain
- Responses sent back to chat
- Logs show successful operations

---

## Next Steps After Testing

1. **Monitor Performance:**
   - Check API usage
   - Monitor rate limits
   - Optimize settings

2. **Customize:**
   - Create custom Moji voice
   - Adjust voice settings
   - Update meme templates

3. **Scale:**
   - Add more users
   - Expand features
   - Optimize performance

---

## Quick Reference

**Start Services:**
```bash
# Terminal 1
cd pet-brain && bun run dev

# Terminal 2
cd imessage-bridge && bun run dev
```

**Test Commands:**
```
@moji sticker: a cute cat
@moji meme: finals stress
```

**Check Health:**
```bash
curl http://localhost:3001/health
curl http://localhost:3000/health
```

**Stop Services:**
- Press `Ctrl+C` in each terminal
- Or use: `pkill -f "bun run dev"`

---

Ready to test! Follow the steps above and let me know if you encounter any issues! 🚀

