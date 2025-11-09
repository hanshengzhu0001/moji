# 🎬 Moji - Video Demo Script

**Duration:** 3-4 minutes  
**Target:** HackPrinceton judges and attendees

---

## 🎯 Opening (0:00 - 0:30)

**[Screen: Desktop UI with animated pet]**

> "Hi! Meet Moji - your AI pet that lives inside iMessage."

**[Show pet floating animation]**

> "Moji isn't just another chatbot. It's an intelligent companion that understands emotions, generates memes, creates custom stickers, and responds with actual animal voices."

**[Quick montage: meme generation, sticker creation, voice response]**

> "Let me show you what makes Moji special."

---

## 🏗️ The Challenge (0:30 - 1:00)

**[Screen: iMessage app]**

> "We wanted to build something that lives where people actually communicate - iMessage. But there's a problem..."

**[Show code/terminal]**

> "Apple doesn't provide an official API for iMessage. You can't just send messages programmatically."

**[Screen: Photon AI logo/website]**

> "That's where **Photon AI** comes in. Photon provides the only reliable way to integrate with iMessage on macOS through their iMessage Kit."

**[Show code snippet]**

```typescript
import { IMessageSDK } from "@photon-ai/imessage-kit";
const sdk = new IMessageSDK();
await sdk.send(chatId, { images: [memeUrl] });
```

> "With Photon, we can read messages from the iMessage database and send responses - including text, images, and even audio files."

---

## 🧠 The Brain (1:00 - 1:45)

**[Screen: Architecture diagram]**

> "Moji's intelligence comes from **Dedalus Labs** - an AI agent framework that powers decision-making."

**[Show Dedalus Agent code]**

```typescript
const agentResponse = await agent.callAgent("mood_classification", {
  messages: recentMessages
});
// Returns: { mood: "stressed", encouragement: "Hang in there!" }
```

> "Dedalus analyzes your messages and classifies emotions - happy, stressed, excited, or sleepy."

**[Show mood classification in action]**

> "When you say 'I'm so stressed about finals', Dedalus detects the stress and decides to respond with a supportive meme."

**[Show sticker decision logic]**

```typescript
const stickerDecision = await agent.callAgent("sticker_decision", {
  messageText: text,
  userMood: userMood
});
// Returns: { shouldGenerateSticker: true, prompt: "stressed", style: "supportive" }
```

> "It doesn't just randomly generate content - it makes intelligent decisions about when and what to send."

---

## 🎨 Content Generation (1:45 - 2:30)

**[Screen: Split view - Imgflip vs DALL-E]**

> "Moji uses two different approaches for visual content."

**[Left side: Imgflip memes]**

> "For memes, we use **Imgflip** - a free API with 100+ popular templates like Drake, Distracted Boyfriend, and This Is Fine."

**[Show meme generation]**

```bash
User: "@moji meme: finals stress"
```

**[Show process: template selection → text generation → final meme]**

> "Dedalus picks the perfect template and generates contextual text."

**[Right side: DALL-E stickers]**

> "For custom stickers, we use **OpenAI's DALL-E 3** - the most advanced image generation model."

**[Show sticker generation]**

```bash
User: "@moji sticker: cute cat studying"
```

**[Show generated sticker appearing]**

> "DALL-E creates completely unique, high-quality images from your descriptions."

---

## 🎵 Voice & Audio (2:30 - 3:00)

**[Screen: Desktop UI - audio recording]**

> "But Moji doesn't just send memes - it can speak!"

**[Show recording interface]**

> "Record a voice note in the UI..."

**[Click record, speak, stop]**

> "...and Moji converts it to MP3 using ffmpeg, then sends it to iMessage."

**[Show audio message in iMessage]**

> "But here's the cool part - Moji responds back with **actual animal sounds**."

**[Show pet responding with voice]**

> "Watch this - when I say 'I'm stressed', Moji detects my mood..."

**[Type "I'm so stressed"]**

> "...and transforms into a supportive dog."

**[Pet morphs from cat to dog 🐶]**

**[Play dog bark sound]**

> "It responds with a real dog bark and a supportive message."

**[Show speech bubble: "Hang in there! 🐱"]**

> "Say you're sad? Moji becomes a comforting bird."

**[Type "I'm feeling sad", pet transforms to bird 🐦, plays chirp]**

> "Excited? An energetic cat!"

**[Type "I'm so excited!", pet transforms to cat 🐱💫, plays meow]**

> "The pet doesn't just respond - it transforms to match your emotions with real animal sounds."

---

## 🖥️ The Experience (3:00 - 3:30)

**[Screen: Full UI walkthrough]**

> "Everything comes together in a beautiful desktop interface."

**[Show each feature quickly:]**

1. **Talk to Moji** - Type message, pet responds with voice
2. **Generate Meme** - Enter topic, instant meme
3. **Create Sticker** - Custom DALL-E generation
4. **React to Message** - One-click reaction
5. **Record Audio** - Voice notes with MP3 conversion
6. **Share Images** - Drag and drop

**[Show pet mood changing]**

> "The pet's mood changes based on your messages - excited, concerned, sleepy, or chill."

**[Show speech bubble with voice]**

> "And it responds with both text and voice, making it feel like a real companion."

---

## 🎯 Technical Highlights (3:30 - 3:50)

**[Screen: Code/architecture]**

> "Here's what makes Moji technically impressive:"

**[Bullet points appear:]**

- ✅ **Photon AI** - Reliable iMessage integration
- ✅ **Dedalus Labs** - Intelligent decision-making
- ✅ **OpenAI DALL-E 3** - Custom image generation
- ✅ **ElevenLabs** - Natural voice synthesis
- ✅ **Imgflip** - 100+ meme templates
- ✅ **Real-time polling** - Database monitoring every 2 seconds
- ✅ **Audio conversion** - WebM → MP3 with ffmpeg
- ✅ **Smart deduplication** - Never sends the same meme twice
- ✅ **Rate limiting** - Intelligent message filtering

---

## 🎉 Closing (3:50 - 4:00)

**[Screen: All features montage]**

> "Moji is more than a chatbot - it's an AI pet that understands you, makes you laugh, and lives where you already communicate."

**[Show GitHub repo]**

> "Built at HackPrinceton 2025. Check out the code on GitHub!"

**[Show final demo: Send message → Pet responds with meme and voice]**

> "Thanks for watching! 🐱✨"

**[End screen: GitHub link, team names]**

---

## 📝 Demo Script Notes

### Key Points to Emphasize

1. **Photon AI Integration**
   - Only reliable iMessage API
   - Direct database access
   - File attachment support

2. **Dedalus Agent Intelligence**
   - Not random - makes smart decisions
   - Context-aware responses
   - Mood classification

3. **Multi-API Orchestration**
   - 5 different APIs working together
   - Seamless integration
   - Fallback mechanisms

4. **User Experience**
   - Beautiful UI
   - Real-time responses
   - Voice + text feedback

### Demo Flow

1. **Start with UI** - Show the interface first
2. **Show iMessage integration** - Send command from phone
3. **Explain architecture** - How it all connects
4. **Live demo** - Generate meme, sticker, voice note
5. **Show pet responding** - Voice + mood change
6. **End with impact** - Why it matters

### Technical Details to Mention

- Database polling (not webhooks - more reliable)
- MP3 conversion for compatibility
- Smart caching and deduplication
- Rate limiting for spam prevention
- Mood-based voice selection

### Backup Demos (if live fails)

- Pre-recorded screen captures
- Screenshots of key features
- Code walkthrough
- Architecture diagram explanation

---

## 🎥 Recording Tips

1. **Clean desktop** - Close unnecessary apps
2. **Good lighting** - Face visible if on camera
3. **Clear audio** - Use good microphone
4. **Smooth transitions** - Practice the flow
5. **Show enthusiasm** - This is cool tech!

### Screen Recording Setup

- **Resolution**: 1920x1080 or 1280x720
- **Frame rate**: 60fps for smooth animations
- **Cursor**: Show cursor for clicks
- **Audio**: Record system audio + voiceover

### Editing

- Add captions for key terms (Photon, Dedalus, etc.)
- Highlight code sections
- Zoom in on important UI elements
- Add background music (subtle)
- Include team credits at end

---

## 📊 Talking Points

### Why Photon AI?

> "Photon AI's iMessage Kit is the only production-ready solution for iMessage integration. We tried other approaches, but Photon's direct database access and reliable SDK made it possible to build a real product, not just a proof of concept."

### Why Dedalus Labs?

> "Dedalus Labs provides an agent framework that goes beyond simple prompts. It understands context, makes decisions, and can orchestrate multiple tools. This is what makes Moji feel intelligent, not scripted."

### Why Multiple APIs?

> "We combined the best tools for each job: Imgflip for speed and variety, DALL-E for custom creativity, and ElevenLabs for natural voices. The result is a system that's both fast and high-quality."

### Technical Achievement

> "We built a complete AI system that integrates 5 different APIs, processes audio/video, manages state, and delivers a beautiful user experience - all in 48 hours."

---

## 🏆 Judging Criteria Alignment

### Innovation
- First AI pet for iMessage
- Multi-API orchestration
- Voice + visual responses

### Technical Complexity
- 5 API integrations
- Real-time database polling
- Audio conversion pipeline
- Smart agent decision-making

### User Experience
- Beautiful, intuitive UI
- Real-time feedback
- Multiple interaction modes
- Seamless iMessage integration

### Completeness
- Fully functional
- Production-ready code
- Comprehensive documentation
- Error handling & fallbacks

---

## 🎤 Sample Narration

### Opening

> "Imagine having an AI pet that lives in your messages - one that understands your emotions, generates memes on demand, and responds with actual animal voices. That's Moji."

### Technical Deep Dive

> "Under the hood, Moji orchestrates five different AI services. Photon AI handles iMessage integration, Dedalus Labs powers the decision-making, OpenAI generates custom stickers, ElevenLabs creates animal voices, and Imgflip provides meme templates. Each API plays a crucial role in creating a seamless experience."

### Impact

> "We built Moji to make communication more fun and expressive. Whether you're stressed about finals, celebrating a win, or just want to share a laugh, Moji is there with the perfect meme, sticker, or voice response."

### Closing

> "Moji shows what's possible when you combine multiple AI services into a cohesive product. It's not just about using AI - it's about creating an experience that feels magical."

---

## ✅ Pre-Demo Checklist

- [ ] All services running (Brain, Bridge, UI)
- [ ] Test each command beforehand
- [ ] Have backup recordings ready
- [ ] Check audio levels
- [ ] Verify screen recording works
- [ ] Practice timing (under 4 minutes)
- [ ] Prepare for Q&A

---

## 🎯 Key Takeaways for Judges

1. **Photon AI** - Solved the "impossible" iMessage integration problem
2. **Dedalus Labs** - Made the AI actually intelligent, not random
3. **Multi-API** - Orchestrated 5 services seamlessly
4. **Complete Product** - Not just a demo, but a working system
5. **Great UX** - Beautiful UI + voice feedback + real-time responses

---

## 🎬 Action!

Ready to record? Let's show the world what Moji can do! 🐱✨

