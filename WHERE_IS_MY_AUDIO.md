# 🎵 Where is My Audio?

## ✅ Audio Generation Status

Audio is being generated! You can see in the logs:
```
[TICK] ✅ Generated voice audio for +14848629354
[TICK] ✅ Utterance for +14848629354: "Moji is watching over the group! 😺"
```

## 📁 Where Audio Files Are Saved

### If AWS S3 is Configured:
- **Location**: AWS S3 bucket
- **Path**: `s3://your-bucket/voices/{userId}/{eventId}.mp3`
- **URL**: `https://your-bucket.s3.region.amazonaws.com/voices/{userId}/{eventId}.mp3`

### If AWS S3 is NOT Configured (Current Setup):
- **Location**: Local files in `pet-brain/audio/` directory
- **Filename**: `voice_{timestamp}_{random}.mp3`
- **Full path**: `/Users/hanszhu/Desktop/hackprinceton/moji/pet-brain/audio/voice_*.mp3`

## 🔍 How to Find Your Audio

### Option 1: Check the Directory
```bash
cd /Users/hanszhu/Desktop/hackprinceton/moji/pet-brain
ls -la audio/
```

### Option 2: Search for Recent Audio Files
```bash
find /Users/hanszhu/Desktop/hackprinceton/moji/pet-brain -name "*.mp3" -mtime -1
```

### Option 3: Check Database for Audio URLs
The audio URL is stored in the `moments` table:
```bash
cd /Users/hanszhu/Desktop/hackprinceton/moji/pet-brain
sqlite3 nori.db "SELECT eventId, s3Url, ts FROM moments WHERE type = 'audio' ORDER BY ts DESC LIMIT 5;"
```

## 🎧 How to Play Audio

### If Saved Locally:
```bash
# Play the most recent audio file
cd /Users/hanszhu/Desktop/hackprinceton/moji/pet-brain/audio
open voice_*.mp3

# Or use afplay (macOS)
afplay voice_*.mp3
```

### If in Database (Base64):
The audio is stored as base64 in the database. You can extract it:
```bash
cd /Users/hanszhu/Desktop/hackprinceton/moji/pet-brain
sqlite3 nori.db "SELECT s3Url FROM moments WHERE type = 'audio' ORDER BY ts DESC LIMIT 1;" | \
  sed 's/data:audio\/mpeg;base64,//' | \
  base64 -d > audio_output.mp3
```

## 🔧 Current Setup

**Audio files are now being saved locally** in `pet-brain/audio/` directory after the code update.

**Restart Pet Brain** to apply the changes:
```bash
pkill -f "bun.*pet-brain"
cd /Users/hanszhu/Desktop/hackprinceton/moji/pet-brain
bun run dev > /tmp/moji-brain.log 2>&1 &
```

## 📊 Check Audio Generation Logs

```bash
tail -f /tmp/moji-brain.log | grep -i "audio\|voice\|TICK"
```

You should see:
```
[TICK] ✅ Generated voice audio for +14848629354
[TICK] ✅ Saved audio to ./audio/voice_1234567890_abc123.mp3
```

## 🎯 Next Steps

1. **Restart Pet Brain** (to enable local file saving)
2. **Wait for next tick** (happens every 60 seconds)
3. **Check audio directory**: `ls -la pet-brain/audio/`
4. **Play the audio**: `open pet-brain/audio/voice_*.mp3`

---

**Audio files will be saved to:** `moji/pet-brain/audio/voice_*.mp3`

