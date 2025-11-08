# 🚀 Production Testing - Step by Step

## ✅ Step 1: Get Your Group Chat ID

Run this command to find your group chat:

```bash
sqlite3 ~/Library/Messages/chat.db "SELECT chat_identifier, display_name FROM chat WHERE display_name IS NOT NULL ORDER BY display_name LIMIT 20;"
```

**Look for:**
- Group chats start with `chat` followed by numbers (e.g., `chat166363708526724594`)
- Or use a phone number/email for 1-on-1 chats

**Copy the `chat_identifier` for your group chat.**

---

## ✅ Step 2: Configure .env Files

### Update Pet Brain .env

```bash
cd pet-brain
# Edit .env and set TARGET_CHAT_ID
nano .env
# OR
open -e .env
```

Make sure it has:
```
TARGET_CHAT_ID=your_chat_id_here
```

### Update iMessage Bridge .env

```bash
cd imessage-bridge
# The .env file was just created - add your chat ID
echo "TARGET_CHAT_ID=your_chat_id_here" >> .env
# OR edit manually
nano .env
```

Make sure it has:
```
PORT=3000
BRAIN_URL=http://localhost:3001
TARGET_CHAT_ID=your_chat_id_here
```

---

## ✅ Step 3: Start Pet Brain (Terminal 1)

```bash
cd /Users/hanszhu/Desktop/hackprinceton/moji/pet-brain
bun run dev
```

**Expected output:**
```
🧠 Pet Brain listening on port 3001
📚 Loaded X meme templates
```

**Keep this terminal open!**

---

## ✅ Step 4: Start iMessage Bridge (Terminal 2)

Open a **NEW terminal window** and run:

```bash
cd /Users/hanszhu/Desktop/hackprinceton/moji/imessage-bridge
bun run dev
```

**Expected output:**
```
🌉 iMessage Bridge listening on port 3000
📱 Watching chat: your_chat_id_here
```

**Keep this terminal open!**

---

## ✅ Step 5: Test Sticker Generation

**In your iMessage group chat, send:**
```
@moji sticker: a cute cat with big eyes
```

**Watch the terminals:**
- **Bridge terminal** should show: `[STICKER REQ] Prompt: a cute cat with big eyes`
- **Pet Brain terminal** should show: `[STICKER] Request from...` → `[STICKER] ✅ Sent sticker`

**Expected result:**
- Sticker appears in group chat within 10-20 seconds! 🎨

---

## ✅ Step 6: Test Meme Generation

**In your iMessage group chat, send:**
```
@moji meme: finals stress
```

**Watch the terminals:**
- **Bridge terminal** should show: `[MEME REQ] Topic: finals stress`
- **Pet Brain terminal** should show: `[MEME] Request from...` → `[MEME] ✅ Sent`

**Expected result:**
- Meme appears in group chat within 2-5 seconds! 🎭

---

## ✅ Step 7: Test Voice Generation

**In a new terminal, run:**
```bash
curl -X POST http://localhost:3001/tick
```

**Watch Pet Brain terminal:**
- Should show: `[TICK] Running pet decision cycle...`
- If voice is generated: `[TICK] ✅ Generated voice audio`

**Expected result:**
- Voice audio generated and stored (if agent decides to speak)

---

## 🔍 Troubleshooting

### Services Won't Start

**Check:**
1. Are ports 3000 and 3001 available?
   ```bash
   lsof -i :3000
   lsof -i :3001
   ```

2. Are API keys set correctly?
   ```bash
   cd pet-brain && grep -E "(OPENAI|ELEVENLABS)" .env
   ```

3. Are dependencies installed?
   ```bash
   cd pet-brain && bun install
   cd ../imessage-bridge && bun install
   ```

### Commands Not Detected

**Check:**
1. Is `TARGET_CHAT_ID` correct?
   ```bash
   cd imessage-bridge && grep TARGET_CHAT_ID .env
   ```

2. Is Bridge watching the right chat?
   - Check Bridge terminal: `📱 Watching chat: ...`

3. Do you have Full Disk Access?
   - System Settings > Privacy & Security > Full Disk Access
   - Enable for Terminal/Cursor

### Stickers/Memes Not Appearing

**Check:**
1. Are both services running?
   ```bash
   curl http://localhost:3001/health
   curl http://localhost:3000/health
   ```

2. Check logs for errors in terminals

3. Check API keys and rate limits

---

## 🎯 Quick Test Checklist

- [ ] Pet Brain running on port 3001
- [ ] iMessage Bridge running on port 3000
- [ ] TARGET_CHAT_ID set in both .env files
- [ ] Sticker command works: `@moji sticker: ...`
- [ ] Meme command works: `@moji meme: ...`
- [ ] Logs show successful operations
- [ ] Responses appear in group chat

---

## 📝 Next Steps

1. **Test more scenarios:**
   - Different sticker styles
   - Different meme topics
   - Voice generation triggers

2. **Monitor performance:**
   - Check API usage
   - Monitor rate limits
   - Optimize settings

3. **Customize:**
   - Create custom Moji voice
   - Adjust voice settings
   - Update meme templates

---

## 🆘 Need Help?

If something doesn't work:
1. Check the logs in both terminals
2. Verify .env files are correct
3. Check API keys are valid
4. Verify TARGET_CHAT_ID is correct
5. Check Full Disk Access permissions

---

**Ready to test! Follow the steps above and let me know what happens!** 🚀

