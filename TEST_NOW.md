# 🧪 Test Now - Step by Step

## ✅ Current Setup

- **Bridge**: Running on port 3000 ✅
- **Pet Brain**: Running on port 3001 ✅
- **Watching chat**: `chat289531176792193956` ✅
- **Database polling**: Active (checking every 2 seconds) ✅

---

## 🚀 Step 1: Open Monitor Terminal

**Open a new terminal and run:**

```bash
tail -f /tmp/moji-bridge-final.log /tmp/moji-brain.log
```

**Keep this terminal open** - you'll see logs in real-time!

---

## 🧪 Step 2: Send Sticker Command

**In your iMessage group chat (`chat289531176792193956`), send:**

```
@moji sticker: a cute cat with big eyes
```

---

## 👀 Step 3: Watch the Logs

**You should see in the monitor terminal:**

### Bridge Logs:
```
[DB] ✅ Found 1 NEW messages (ROWID > 5727)
[DB] Processing message ROWID 5728: "@moji sticker: a cute cat..."
[iMessage] +14458005280: "@moji sticker: a cute cat with big eyes..."
[STICKER REQ] Prompt: a cute cat with big eyes, Style: cute
```

### Pet Brain Logs:
```
[STICKER] Request from +14458005280: "a cute cat with big eyes" (cute)
[STICKER] Generated sticker: https://oaidalleapiprodscus.blob.core.windows.net/...
[STICKER] ✅ Sent sticker: a cute cat with big eyes
```

---

## ✅ Step 4: Check iMessage

**The sticker should appear in your group chat within 10-20 seconds!**

---

## 🧪 Step 5: Test Meme Command

**Send:**

```
@moji meme: finals stress
```

**Expected:**
- Meme appears in chat within 2-5 seconds
- Logs show meme generation

---

## 🔍 Troubleshooting

### No Logs Appearing?

**Check:**
1. Are services running?
   ```bash
   curl http://localhost:3000/health
   curl http://localhost:3001/health
   ```

2. Is the correct chat ID set?
   ```bash
   cd imessage-bridge && grep TARGET_CHAT_ID .env
   ```
   Should show: `chat289531176792193956`

3. Check if messages are being written to database:
   ```bash
   sqlite3 ~/Library/Messages/chat.db "SELECT MAX(ROWID) FROM message WHERE ROWID IN (SELECT message_id FROM chat_message_join WHERE chat_id = 122);"
   ```

### Messages Not Detected?

**Possible reasons:**
- Message not in database yet (wait 2-5 seconds)
- Wrong chat (verify chat ID)
- Message has no text (attachments only)

### Sticker Not Generating?

**Check:**
- OpenAI API key set correctly?
- Rate limits?
- Check Pet Brain logs for errors

---

## 📋 Quick Test Checklist

- [ ] Monitor terminal open with `tail -f`
- [ ] Services running (both ports respond)
- [ ] Send `@moji sticker: a cute cat` in group chat
- [ ] See logs show message detection
- [ ] See logs show sticker request
- [ ] See logs show sticker generation
- [ ] Sticker appears in iMessage chat

---

## 🎯 Success Criteria

✅ **Message detected** - Bridge logs show `[iMessage]`
✅ **Command parsed** - Bridge logs show `[STICKER REQ]`
✅ **Sticker generated** - Pet Brain logs show `[STICKER] Generated sticker`
✅ **Sticker sent** - Pet Brain logs show `[STICKER] ✅ Sent`
✅ **Sticker appears** - You see it in iMessage!

---

## 🚀 Ready to Test!

1. Open monitor terminal: `tail -f /tmp/moji-bridge-final.log /tmp/moji-brain.log`
2. Send command: `@moji sticker: a cute cat with big eyes`
3. Watch the magic happen! 🎨

---

**Good luck! Let me know what you see in the logs!** 🚀
