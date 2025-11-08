# 🎉 Services Are Running! Ready to Test!

## ✅ Current Status

- ✅ **Pet Brain** running on port 3001
- ✅ **iMessage Bridge** running on port 3000
- ✅ **Watching chat:** `chat55023045752223532`
- ✅ **API keys configured**
- ✅ **Services responding to health checks**

---

## 🧪 Test Now!

### Test 1: Sticker Generation

**In your iMessage group chat (`chat55023045752223532`), send:**
```
@moji sticker: a cute cat with big eyes
```

**Expected:**
- ✅ Bridge detects command
- ✅ Pet Brain generates sticker via DALL-E 3
- ✅ Sticker appears in group chat within 10-20 seconds

**Watch the logs:**
```bash
# Terminal 1 - Watch Pet Brain
tail -f /tmp/moji-brain.log

# Terminal 2 - Watch Bridge  
tail -f /tmp/moji-bridge.log
```

---

### Test 2: Meme Generation

**In your iMessage group chat, send:**
```
@moji meme: finals stress
```

**Expected:**
- ✅ Bridge detects command
- ✅ Pet Brain generates meme via Imgflip
- ✅ Meme appears in group chat within 2-5 seconds

---

### Test 3: Voice Generation

**In a terminal, run:**
```bash
curl -X POST http://localhost:3001/tick
```

**Expected:**
- ✅ Pet Brain runs decision cycle
- ✅ If agent decides to speak, voice is generated via ElevenLabs
- ✅ Audio stored in database

**Watch Pet Brain logs:**
- Should show: `[TICK] Running pet decision cycle...`
- If voice generated: `[TICK] ✅ Generated voice audio`

---

## 📊 Monitor Services

### Check Service Status

```bash
# Pet Brain
curl http://localhost:3001/health

# Bridge
curl http://localhost:3000/health
```

### Watch Logs

```bash
# Pet Brain logs
tail -f /tmp/moji-brain.log

# Bridge logs
tail -f /tmp/moji-bridge.log

# Both logs (in one terminal)
tail -f /tmp/moji-*.log
```

---

## 🛑 Stop Services

**Option 1: Kill by PID**
```bash
kill $(cat /tmp/moji-brain.pid 2>/dev/null) $(cat /tmp/moji-bridge.pid 2>/dev/null)
```

**Option 2: Kill by process name**
```bash
pkill -f "bun run.*pet-brain"
pkill -f "bun run.*imessage-bridge"
```

**Option 3: Restart services**
```bash
cd /Users/hanszhu/Desktop/hackprinceton/moji
./START_TEST.sh
```

---

## 🔍 Troubleshooting

### Commands Not Working?

**Check:**
1. Are services running?
   ```bash
   curl http://localhost:3001/health
   curl http://localhost:3000/health
   ```

2. Is chat ID correct?
   - Should be: `chat55023045752223532`
   - Check Bridge logs: `📱 Watching chat: ...`

3. Do you have Full Disk Access?
   - System Settings > Privacy & Security > Full Disk Access
   - Enable for Terminal/Cursor

4. Check logs for errors:
   ```bash
   tail -20 /tmp/moji-brain.log
   tail -20 /tmp/moji-bridge.log
   ```

### Stickers/Memes Not Appearing?

**Check:**
1. API keys valid?
   ```bash
   cd pet-brain && grep -E "(OPENAI|ELEVENLABS)" .env
   ```

2. Rate limits?
   - DALL-E 3 may have rate limits
   - Wait a few minutes and try again

3. Check logs for API errors:
   ```bash
   grep -i "error" /tmp/moji-brain.log
   ```

---

## 🎯 Success Checklist

- [ ] Services running (both ports responding)
- [ ] Bridge watching correct chat
- [ ] Sticker command works: `@moji sticker: ...`
- [ ] Meme command works: `@moji meme: ...`
- [ ] Responses appear in group chat
- [ ] Logs show successful operations

---

## 📝 Next Steps

1. **Test more scenarios:**
   - Different sticker prompts
   - Different meme topics
   - Voice generation triggers

2. **Customize:**
   - Create custom Moji voice
   - Adjust voice settings
   - Update meme templates

3. **Monitor:**
   - Check API usage
   - Monitor rate limits
   - Optimize settings

---

## 🆘 Need Help?

**Check logs:**
```bash
# Pet Brain
tail -50 /tmp/moji-brain.log

# Bridge
tail -50 /tmp/moji-bridge.log
```

**Restart services:**
```bash
cd /Users/hanszhu/Desktop/hackprinceton/moji
./START_TEST.sh
```

**Verify configuration:**
```bash
# Check chat ID
cd pet-brain && grep TARGET_CHAT_ID .env
cd ../imessage-bridge && grep TARGET_CHAT_ID .env

# Check API keys
cd pet-brain && grep -E "(OPENAI|ELEVENLABS)" .env | head -2
```

---

## 🎉 You're Ready!

**Services are running and ready to test!**

**Go to your iMessage group chat and try:**
```
@moji sticker: a cute cat
@moji meme: finals stress
```

**Watch the magic happen!** 🚀🎨🎭

---

## 📚 Quick Reference

**Start services:**
```bash
cd /Users/hanszhu/Desktop/hackprinceton/moji
./START_TEST.sh
```

**Test commands:**
```
@moji sticker: a cute cat
@moji meme: finals stress
```

**Check status:**
```bash
curl http://localhost:3001/health
curl http://localhost:3000/health
```

**Watch logs:**
```bash
tail -f /tmp/moji-brain.log
tail -f /tmp/moji-bridge.log
```

**Stop services:**
```bash
pkill -f "bun run.*pet-brain"
pkill -f "bun run.*imessage-bridge"
```

---

**Happy testing!** 🎉

