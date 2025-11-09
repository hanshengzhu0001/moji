# 📖 About Moji - Our Project Story

## 🌟 What Inspired Us

The inspiration for Moji came from a simple observation: messaging apps are functional but lack emotional connection. We wanted to create something that transforms everyday conversations into an interactive, emotionally intelligent experience.

**The Core Idea:**
- What if your iMessage had a pet that actually understood how you felt?
- What if it could transform into different animals based on your emotions?
- What if it responded with natural voices that matched your mood?

We were inspired by:
- **Tamagotchi** - The nostalgia of caring for a digital pet
- **AI Companions** - The potential for emotionally intelligent AI
- **iMessage Integration** - The challenge of making something "impossible" work
- **Multi-API Orchestration** - Combining multiple AI services into one cohesive experience

The name "Moji" comes from "emoji" - representing the emotional, visual nature of our pet companion.

---

## 🎓 What We Learned

Building Moji was a crash course in several cutting-edge technologies:

### 1. **iMessage Integration (Photon AI)**
- Learned how to programmatically access iMessage on macOS (previously thought impossible)
- Mastered database polling techniques for real-time message detection
- Understood the complexities of macOS security and permissions
- Discovered the challenges of working with Apple's closed ecosystem

### 2. **AI Voice Synthesis (ElevenLabs)**
- Explored text-to-speech APIs for natural voice generation
- Learned how to create distinct animal voices (cat, dog, bird)
- Understood voice parameter tuning for emotional expression
- Discovered the balance between naturalness and character

### 3. **Image Generation (OpenAI DALL-E 3)**
- Mastered prompt engineering for consistent sticker generation
- Learned about image quality optimization
- Understood API rate limiting and cost management
- Discovered the art of generating contextually appropriate images

### 4. **Meme Generation (Imgflip)**
- Explored template-based content generation
- Learned about text placement and meme formatting
- Understood the psychology of humor in memes
- Discovered how to match topics to appropriate templates

### 5. **Full-Stack Development**
- **Backend (Bun + Fastify)**: Built high-performance APIs with TypeScript
- **Frontend (React + Vite)**: Created beautiful, responsive UIs with real-time updates
- **Database (SQLite)**: Managed state and message history efficiently
- **Audio Processing (ffmpeg)**: Converted WebM to MP3 for iMessage compatibility

### 6. **System Architecture**
- Learned about microservices communication
- Understood polling vs. webhooks trade-offs
- Discovered the importance of error handling and fallbacks
- Mastered the art of debugging distributed systems

### 7. **User Experience Design**
- Learned about browser audio autoplay policies
- Understood the importance of visual feedback
- Discovered how to make AI feel "alive" through animations
- Mastered the balance between functionality and delight

---

## 🛠️ How We Built It

### Phase 1: Foundation (Hours 0-12)

**iMessage Bridge**
- Set up Photon AI SDK integration
- Implemented database polling for message detection
- Built message parsing and command extraction
- Created API endpoints for sending messages and files

**Pet Brain Backend**
- Set up Fastify server with TypeScript
- Created SQLite database schema (users, messages, moments, utterances)
- Implemented mood classification system (pattern-based)
- Built API endpoints for message processing

### Phase 2: Core Features (Hours 12-24)

**Meme Generation**
- Integrated Imgflip API
- Built template selection logic
- Created text generation for meme captions
- Implemented meme sending to iMessage

**Sticker Generation**
- Integrated OpenAI DALL-E 3 API
- Built prompt engineering system
- Created sticker generation endpoint
- Implemented image sending to iMessage

**Voice System**
- Integrated ElevenLabs TTS API
- Created animal voice mapping (cat/dog/bird)
- Built voice generation pipeline
- Implemented audio file management

### Phase 3: Intelligence (Hours 24-36)

**Mood Classification**
- Built pattern-based emotion detection
- Implemented mood-to-animal mapping
- Created response generation system
- Built utterance storage and retrieval

**Animal Transformation**
- Implemented dynamic pet emoji selection
- Created visual feedback system
- Built mood-based appearance changes
- Added animation states

### Phase 4: User Interface (Hours 36-44)

**Desktop UI**
- Built React application with Vite
- Created beautiful gradient design
- Implemented real-time polling for pet state
- Added audio playback with user interaction handling
- Created command cards for all features
- Built recording and image upload functionality

**Audio/Image Sharing**
- Implemented WebM audio recording
- Built ffmpeg conversion pipeline (WebM → MP3)
- Created image upload system
- Integrated file sending to iMessage

### Phase 5: Polish (Hours 44-48)

**Error Handling**
- Added comprehensive error handling
- Implemented fallback mechanisms
- Created user-friendly error messages
- Built logging system

**Documentation**
- Wrote comprehensive README
- Created setup guides
- Built video script
- Documented API endpoints

**Testing & Debugging**
- Fixed audio autoplay issues
- Resolved TypeScript errors
- Optimized polling intervals
- Tested all features end-to-end

---

## 🚧 Challenges We Faced

### 1. **iMessage Integration - "The Impossible Problem"**

**Challenge:** iMessage has no official API. Apple doesn't allow third-party apps to access Messages.app programmatically.

**Solution:** 
- Used Photon AI SDK which provides a workaround through database polling
- Directly queried macOS `chat.db` SQLite database
- Implemented polling mechanism to detect new messages
- Had to handle macOS security permissions and database locking

**Learning:** Sometimes the "impossible" is just a matter of finding the right approach and persistence.

---

### 2. **Browser Audio Autoplay Policy**

**Challenge:** Modern browsers block audio autoplay without user interaction. This broke our voice response system.

**Solution:**
- Implemented user interaction tracking
- Created audio queuing system for pending audio
- Added visual indicators when audio is ready
- Built fallback mechanism for audio playback

**Learning:** Browser security policies can break seemingly simple features. Always test with real user interactions.

---

### 3. **Message Text Extraction**

**Challenge:** User-sent messages sometimes had empty text fields in the SDK response.

**Solution:**
- Built multi-layered text extraction system
- Checked multiple message fields (`text`, `body`, `textRaw`, `attributedBody.string`)
- Implemented database fallback queries
- Created message caching system

**Learning:** SDKs don't always work perfectly. Building robust fallbacks is essential.

---

### 4. **Audio Format Compatibility**

**Challenge:** Browser records WebM, but iMessage prefers MP3. Direct WebM sending failed.

**Solution:**
- Integrated `ffmpeg` for audio conversion
- Built WebM → MP3 conversion pipeline
- Created fallback to WebM if conversion fails
- Handled file size and duration calculations

**Learning:** Format compatibility is crucial for cross-platform systems. Always have conversion tools ready.

---

### 5. **Real-Time State Synchronization**

**Challenge:** Keeping UI in sync with backend state across multiple services (Bridge, Brain, UI).

**Solution:**
- Implemented polling mechanism (3-second intervals)
- Created state comparison logic to detect changes
- Built utterance deduplication system
- Added visual feedback for state changes

**Learning:** Real-time systems require careful state management. Polling is simple but effective.

---

### 6. **Multi-API Orchestration**

**Challenge:** Coordinating 4 different APIs (Photon, OpenAI, ElevenLabs, Imgflip) with different rate limits, error formats, and response times.

**Solution:**
- Built unified error handling system
- Implemented retry logic with exponential backoff
- Created API response normalization
- Added comprehensive logging

**Learning:** Multi-API systems require robust error handling and logging. One API failure shouldn't break the entire system.

---

### 7. **Mood Classification Accuracy**

**Challenge:** Pattern-based mood detection was too simplistic and missed nuanced emotions.

**Solution:**
- Refined regex patterns for better detection
- Added priority ordering (sad before stressed)
- Implemented context-aware classification
- Created fallback to neutral mood

**Learning:** Simple solutions can work, but they need careful tuning. Sometimes "good enough" is better than over-engineering.

---

### 8. **TypeScript Build Errors**

**Challenge:** Function hoisting issues and dependency array problems in React hooks.

**Solution:**
- Reorganized function declarations
- Used `React.useCallback` for stable references
- Fixed dependency arrays in `useEffect` hooks
- Added proper TypeScript type annotations

**Learning:** TypeScript catches errors early, but requires careful attention to function order and dependencies.

---

### 9. **File Path Handling**

**Challenge:** Sending local file paths to iMessage bridge required proper path resolution.

**Solution:**
- Used absolute file paths
- Implemented file existence checks
- Created proper path normalization
- Added error handling for missing files

**Learning:** File system operations are platform-dependent. Always use absolute paths and check file existence.

---

### 10. **Time Constraints**

**Challenge:** 48-hour hackathon timeline with ambitious feature set.

**Solution:**
- Prioritized core features first
- Built MVP, then iterated
- Focused on one feature at a time
- Used existing libraries instead of building from scratch

**Learning:** Scope management is crucial. Ship working features, not perfect ones.

---

## 💡 Key Technical Decisions

### 1. **Database Polling vs. Webhooks**
- **Chose:** Database polling
- **Why:** Simpler to implement, no webhook infrastructure needed
- **Trade-off:** Slightly higher latency, but acceptable for our use case

### 2. **Pattern-Based Mood Detection vs. ML Model**
- **Chose:** Pattern-based (regex)
- **Why:** Fast, no training data needed, works well for common patterns
- **Trade-off:** Less nuanced than ML, but sufficient for MVP

### 3. **React Polling vs. WebSockets**
- **Chose:** Polling (3-second intervals)
- **Why:** Simpler, no WebSocket server needed, works with any backend
- **Trade-off:** Slightly more network traffic, but negligible for our scale

### 4. **Bun vs. Node.js**
- **Chose:** Bun
- **Why:** Faster startup, better TypeScript support, built-in test runner
- **Trade-off:** Newer runtime, but stable enough for our needs

### 5. **SQLite vs. PostgreSQL**
- **Chose:** SQLite
- **Why:** No database server needed, perfect for single-user MVP
- **Trade-off:** Not suitable for production scale, but fine for demo

---

## 🎯 What Makes Moji Special

1. **Multi-API Orchestration** - Seamlessly combines 4 different AI services
2. **Emotional Intelligence** - Understands and responds to user emotions
3. **Animal Transformation** - Pet morphs based on context (cat/dog/bird)
4. **Natural Voice Synthesis** - ElevenLabs generates realistic animal voices
5. **Complete Product** - Not just a demo, but a working system
6. **Beautiful UX** - Voice + text + visual + animation feedback

---

## 🚀 Future Enhancements

If we had more time, we would add:

- **Multi-user support** - Multiple pets for different users
- **Custom meme templates** - User-created templates
- **Voice-to-text transcription** - Using Whisper API
- **Image captioning** - Using GPT-4 Vision
- **Pet personality customization** - User-defined traits
- **Mobile app** - React Native version
- **More animal types** - Fox, rabbit, etc.
- **Group chat analytics** - Mood tracking over time
- **ML-based mood detection** - More accurate emotion classification
- **WebSocket real-time updates** - Lower latency state sync

---

## 📊 Project Statistics

- **4 AI APIs** integrated seamlessly
- **100+ meme templates** available
- **3 animal voices** (cat, dog, bird)
- **4 distinct moods** (excited, stressed, sad, neutral)
- **< 2 seconds** average response time
- **~3,500 lines** of production code
- **48 hours** development time
- **3 services** (Bridge, Brain, UI)
- **1 database** (SQLite)

---

## 🙏 Acknowledgments

This project wouldn't have been possible without:

- **Photon AI** - Made iMessage integration possible
- **OpenAI** - DALL-E 3 for custom sticker generation
- **ElevenLabs** - Natural animal voice synthesis
- **Imgflip** - Extensive meme template library
- **HackPrinceton 2025** - The platform and community

---

## 🎉 Conclusion

Moji demonstrates what's possible when you combine multiple AI services into a cohesive, delightful user experience. It's not just about using AI - it's about creating something that feels magical.

We learned that:
- **"Impossible" problems have solutions** - iMessage integration seemed impossible, but we found a way
- **Simple solutions can work** - Pattern-based mood detection was sufficient for MVP
- **User experience matters** - Beautiful UI and smooth interactions make all the difference
- **Error handling is crucial** - Robust fallbacks prevent system failures
- **Documentation saves time** - Good docs help with debugging and onboarding

Moji is more than a hackathon project - it's a proof of concept for emotionally intelligent AI companions that can integrate seamlessly into everyday communication.

**Built with ❤️ at HackPrinceton 2025**

