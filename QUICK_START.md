# ⚡ Quick Start - Test in Production

## 🎯 One-Command Setup

Choose one of your group chats and run:

```bash
cd /Users/hanszhu/Desktop/hackprinceton/moji
./SETUP_AND_TEST.sh chat55023045752223532
```

Replace `chat55023045752223532` with your actual group chat ID.

**Available group chats:**
- `chat55023045752223532`
- `chat468963351427550706`
- `chat9330280114812651`

---

## 🚀 Start Services

### Terminal 1 - Pet Brain:
```bash
cd /Users/hanszhu/Desktop/hackprinceton/moji/pet-brain
bun run dev
```

**Wait for:**
```
🧠 Pet Brain listening on port 3001
```

### Terminal 2 - iMessage Bridge:
```bash
cd /Users/hanszhu/Desktop/hackprinceton/moji/imessage-bridge
bun run dev
```

**Wait for:**
```
🌉 iMessage Bridge listening on port 3000
📱 Watching chat: chat55023045752223532
```

---

## 🧪 Test Commands

### Test 1: Sticker
**In your iMessage group chat:**
```
@moji sticker: a cute cat with big eyes
```

**Expected:** Sticker appears in 10-20 seconds! 🎨

### Test 2: Meme
**In your iMessage group chat:**
```
@moji meme: finals stress
```

**Expected:** Meme appears in 2-5 seconds! 🎭

---

## ✅ Success Checklist

- [ ] Pet Brain running (port 3001)
- [ ] Bridge running (port 3000)
- [ ] Chat ID configured in both .env files
- [ ] Sticker command works
- [ ] Meme command works
- [ ] Responses appear in group chat

---

## 🔍 Troubleshooting

### Services Won't Start
```bash
# Check if ports are available
lsof -i :3000
lsof -i :3001
```

### Commands Not Working
1. Check both services are running
2. Verify chat ID is correct
3. Check Full Disk Access permissions
4. Look at terminal logs for errors

### Need Different Chat?
```bash
./SETUP_AND_TEST.sh <your_chat_id>
```

---

## 📝 Full Guide

See `PRODUCTION_TEST_STEPS.md` for detailed instructions.

---

**Ready? Let's test!** 🚀

