# 🔑 Quick Guide: Get ElevenLabs API Key

## The agent ID you have is NOT the API key!

**Agent ID** (`agent_9301k9jann9cexrvq8p7fkagw5zq`) = For Conversations API (different feature)

**API Key** = For Text-to-Speech API (what we need)

## Steps:

1. **Go to**: https://elevenlabs.io/app/settings/api-keys
   - Or: Sign in → Profile → API Keys

2. **Click**: "Create API Key" or "Generate New Key"

3. **Name it**: "Moji Project" (or any name)

4. **Copy the key** (starts with something like `sk-...` or similar)

5. **Add to `.env` file**:
   ```bash
   cd pet-brain
   echo "ELEVENLABS_API_KEY=your_key_here" >> .env
   ```

6. **Test it**:
   ```bash
   bun run test:elevenlabs
   ```

## Direct Link:
https://elevenlabs.io/app/settings/api-keys

## Free Tier:
- 10,000 characters per month
- Perfect for testing!
- All voices available

