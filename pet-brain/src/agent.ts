import "dotenv/config";
import { request } from "undici";

const DEDALUS_API_KEY = process.env.DEDALUS_API_KEY || process.env.OPENAI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const OPENAI_API_URL = "https://api.openai.com/v1";

interface AgentResponse {
  templateHint?: string;
  topText?: string;
  bottomText?: string;
  mood?: string;
  action?: "silent" | "speak_to_user" | "broadcast_in_chat";
  targetUserId?: string;
  utterance?: {
    text: string;
    voiceKind: "cat" | "dog" | "bird";
    voiceDurationHint: "short" | "medium" | "long";
  };
  chatMessage?: string;
  thoughts?: string;
  personalityUpdate?: {
    traits?: Record<string, number>;
    interests?: string[];
    personality_text?: string;
  };
  socialMediaPost?: string;
}

// Dedalus Labs MCP Agent Gateway
// Uses OpenAI API with structured prompts (can be swapped for Dedalus SDK)
class DedalusAgent {
  private async callOpenAI(prompt: string, systemPrompt: string, jsonMode: boolean = true): Promise<any> {
    if (!OPENAI_API_KEY) {
      console.warn("[AGENT] No OpenAI API key, using fallback");
      return null;
    }

    try {
      const response = await request(`${OPENAI_API_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4-turbo-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt }
          ],
          response_format: jsonMode ? { type: "json_object" } : undefined,
          temperature: 0.7,
        }),
      });

      if (response.statusCode !== 200) {
        const error = await response.body.text();
        console.error(`[AGENT] OpenAI error ${response.statusCode}:`, error);
        return null;
      }

      const data: any = await response.body.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) return null;

      return jsonMode ? JSON.parse(content) : content;
    } catch (e: any) {
      console.error("[AGENT] OpenAI call error:", e.message);
      return null;
    }
  }

  async callAgent(mode: string, context: any): Promise<AgentResponse> {
    console.log(`[AGENT] Mode: ${mode}, Context keys: ${Object.keys(context).join(', ')}`);
    
    // Try OpenAI first, fallback to simple logic
    const aiResponse = await this.callAgentWithAI(mode, context);
    if (aiResponse) return aiResponse;
    
    // Fallback to simple logic
    if (mode === "meme_suggestion") {
      return this.generateMemesuggestion(context);
    }
    
    if (mode === "mood_classification") {
      return this.classifyMood(context);
    }
    
    if (mode === "pet_decision") {
      return this.makePetDecision(context);
    }

    if (mode === "personality_learning") {
      return this.learnPersonality(context);
    }

    if (mode === "social_media_post") {
      return this.generateSocialPost(context);
    }

    if (mode === "pet_status") {
      return this.generateStatus(context);
    }

    if (mode === "pet_interaction") {
      return this.handleInteraction(context);
    }
    
    return {};
  }

  private async callAgentWithAI(mode: string, context: any): Promise<AgentResponse | null> {
    switch (mode) {
      case "mood_classification":
        return this.classifyMoodAI(context);
      case "meme_suggestion":
        return this.generateMemesuggestionAI(context);
      case "pet_decision":
        return this.makePetDecisionAI(context);
      case "personality_learning":
        return this.learnPersonalityAI(context);
      case "social_media_post":
        return this.generateSocialPostAI(context);
      case "pet_status":
        return this.generateStatusAI(context);
      case "pet_interaction":
        return this.handleInteractionAI(context);
      default:
        return null;
    }
  }
  
  private generateMemesuggestion(context: { topic: string; userMood?: string }): AgentResponse {
    const topic = context.topic.toLowerCase();
    
    // Map topics to templates
    if (/(exam|test|final|study)/.test(topic)) {
      return {
        templateHint: "this is fine",
        topText: "Me 2 hours before finals",
        bottomText: "This is fine"
      };
    }
    
    if (/(deadline|due|submit)/.test(topic)) {
      return {
        templateHint: "disaster girl",
        topText: "Deadline in 1 hour",
        bottomText: "Just starting now"
      };
    }
    
    if (/(vs|versus)/.test(topic)) {
      const parts = topic.split(/\s+vs\s+|\s+versus\s+/);
      return {
        templateHint: "drake hotline bling",
        topText: parts[0]?.trim() || "Option A",
        bottomText: parts[1]?.trim() || "Option B"
      };
    }
    
    if (/(choose|pick|decide)/.test(topic)) {
      return {
        templateHint: "two buttons",
        topText: "Me trying to decide",
        bottomText: topic
      };
    }
    
    // Default
    return {
      templateHint: "drake hotline bling",
      topText: topic.slice(0, 80),
      bottomText: "Moji relates"
    };
  }
  
  private classifyMood(context: { messages: string[] }): AgentResponse {
    const text = context.messages.join(" ").toLowerCase();
    
    if (/(stress|anxious|worried|nervous|overwhelmed|panic)/.test(text)) {
      return { mood: "stressed" };
    }
    if (/(sad|down|depressed|unhappy|upset)/.test(text)) {
      return { mood: "sad" };
    }
    if (/(happy|great|awesome|amazing|love|excited)/.test(text)) {
      return { mood: "happy" };
    }
    if (/(hyped|pumped|can'?t wait|let'?s go)/.test(text)) {
      return { mood: "excited" };
    }
    
    return { mood: "neutral" };
  }
  
  private makePetDecision(context: any): AgentResponse {
    // Simple logic - occasionally have pet speak
    const random = Math.random();
    
    if (random < 0.3 && context.userMoods?.length > 0) {
      const targetMood = context.userMoods[Math.floor(Math.random() * context.userMoods.length)];
      const voiceKind = ["cat", "dog", "bird"][Math.floor(Math.random() * 3)] as "cat" | "dog" | "bird";
      const duration = ["short", "medium", "long"][Math.floor(Math.random() * 3)] as "short" | "medium" | "long";
      
      return {
        action: "speak_to_user",
        targetUserId: targetMood.userId,
        utterance: {
          text: this.generateEncouragement(targetMood.mood),
          voiceKind,
          voiceDurationHint: duration
        }
      };
    }
    
    return { action: "silent" };
  }
  
  private generateEncouragement(mood: string): string {
    const encouragements: Record<string, string[]> = {
      stressed: [
        "Take a deep breath – you've got this! 🌟",
        "Remember to take breaks! Your mental health matters.",
        "Stressed but blessed? I'm here for you! 😺"
      ],
      sad: [
        "It's okay to feel down. The group is here for you 💙",
        "Tomorrow is a new day! Hang in there, friend.",
        "Sending virtual hugs! 🫂"
      ],
      happy: [
        "Your energy is contagious! Keep shining! ✨",
        "Love seeing you happy! 😊",
        "This is the vibe! I approve! 🎉"
      ],
      excited: [
        "Your excitement is making me bounce! 🎊",
        "Let's goooo! I'm hyped with you! 🚀",
        "This energy! Yes! 💫"
      ]
    };
    
    const messages = encouragements[mood] || ["I'm watching over the group! 😺"];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  // AI-powered methods
  private async classifyMoodAI(context: { messages: string[] }): Promise<AgentResponse | null> {
    const prompt = `Analyze these recent messages and classify the user's mood. Return JSON: {"mood": "stressed|sad|neutral|happy|excited"}\n\nMessages:\n${context.messages.join("\n")}`;
    const systemPrompt = "You are a mood classification agent. Analyze text and return only valid JSON.";
    const response = await this.callOpenAI(prompt, systemPrompt);
    return response ? { mood: response.mood || "neutral" } : null;
  }

  private async generateMemesuggestionAI(context: { topic: string; userMood?: string }): Promise<AgentResponse | null> {
    const prompt = `Suggest a meme for topic: "${context.topic}". User mood: ${context.userMood || "neutral"}. Return JSON: {"templateHint": "meme template name", "topText": "top text", "bottomText": "bottom text"}`;
    const systemPrompt = "You are a meme suggestion agent. Suggest popular meme templates and captions.";
    const response = await this.callOpenAI(prompt, systemPrompt);
    return response || null;
  }

  private async makePetDecisionAI(context: any): Promise<AgentResponse | null> {
    const userMoods = context.userMoods || [];
    const recentMessages = context.recentMessages || [];
    const groupVibe = this.detectGroupVibe(recentMessages);
    const petName = context.petState?.petName || "Moji";
    
    const prompt = `Pet decision context:
- User moods: ${JSON.stringify(userMoods)}
- Group vibe: ${groupVibe}
- Pet XP: ${context.petXP || 0}, Level: ${context.petLevel || 1}
- Personality: ${context.personality || "friendly"}
- Pet name: ${petName}
- Should popup: ${context.shouldPopup || false}

Decide if pet should: 1) stay silent, 2) speak to a user, 3) broadcast to chat.
Return JSON: {"action": "silent|speak_to_user|broadcast_in_chat", "targetUserId": "...", "utterance": {"text": "...", "voiceKind": "cat|dog|bird", "voiceDurationHint": "short|medium|long"}, "chatMessage": "..."}`;
    
    const systemPrompt = `You are ${petName}, a caring digital pet. Respond contextually and supportively.`;
    const response = await this.callOpenAI(prompt, systemPrompt);
    return response || null;
  }

  private async learnPersonalityAI(context: { messages: any[]; currentPersonality?: any }): Promise<AgentResponse | null> {
    const messages = context.messages || [];
    const recentText = messages.map((m: any) => m.text || m).join(" ");
    
    const prompt = `Analyze these group messages and update personality traits. Current: ${JSON.stringify(context.currentPersonality || {})}
    
Return JSON with:
- traits: {"humor_level": 0-10, "empathy_level": 0-10, "energy_level": 0-10, "curiosity_level": 0-10}
- interests: ["topic1", "topic2", ...]
- personality_text: "brief description"`;
    
    const systemPrompt = "You are a personality learning agent. Analyze group communication patterns.";
    const response = await this.callOpenAI(prompt, systemPrompt);
    return response ? { personalityUpdate: response } : null;
  }

  private async generateSocialPostAI(context: { petState: any; personality?: any }): Promise<AgentResponse | null> {
    const petName = context.petState?.petName || "Moji";
    const prompt = `Generate a fun, engaging Twitter/X post about ${petName} the digital pet. Include:
- Current mood/status
- Level: ${context.petState?.level || 1}
- Personality: ${context.personality?.personality_text || "friendly"}
Keep it under 280 characters, use emojis, be playful. Return JSON: {"socialMediaPost": "..."}`;
    
    const systemPrompt = "You are a social media content creator. Write engaging, fun posts.";
    const response = await this.callOpenAI(prompt, systemPrompt);
    return response || null;
  }

  private async generateStatusAI(context: { petState: any; personality?: any; recentEvents?: any[] }): Promise<AgentResponse | null> {
    const petName = context.petState?.petName || "Moji";
    const prompt = `Generate ${petName}'s current status thoughts. Context:
- Mood: ${context.petState?.petMood || "chill"}
- Level: ${context.petState?.level || 1}
- XP: ${context.petState?.xp || 0}
- Personality: ${context.personality?.personality_text || "friendly"}
- Recent events: ${JSON.stringify(context.recentEvents || [])}

Return JSON: {"thoughts": "what ${petName} is thinking right now (1-2 sentences, cute and contextual)"}`;
    
    const systemPrompt = `You are ${petName}, a digital pet. Express thoughts in a cute, contextual way.`;
    const response = await this.callOpenAI(prompt, systemPrompt);
    return response || null;
  }

  private async handleInteractionAI(context: { userMessage: string; personality?: any; petState?: any }): Promise<AgentResponse | null> {
    const petName = context.petState?.petName || "Moji";
    const prompt = `User said: "${context.userMessage}"
${petName}'s personality: ${context.personality?.personality_text || "friendly"}
Pet state: ${JSON.stringify(context.petState || {})}

Generate a contextual, personality-appropriate response. Return JSON: {"chatMessage": "${petName}'s response (cute, contextual, matches personality)"}`;
    
    const systemPrompt = `You are ${petName}, a digital pet responding to users. Be cute, contextual, and match your personality.`;
    const response = await this.callOpenAI(prompt, systemPrompt);
    return response || null;
  }

  // Fallback methods
  private learnPersonality(context: { messages: any[] }): AgentResponse {
    // Simple personality learning fallback
    return {
      personalityUpdate: {
        traits: { humor_level: 5, empathy_level: 7, energy_level: 6, curiosity_level: 6 },
        interests: [],
        personality_text: "I'm learning about the group!"
      }
    };
  }

  private generateSocialPost(context: { petState: any }): AgentResponse {
    const petName = context.petState?.petName || "Moji";
    return {
      socialMediaPost: `🐱 ${petName} here! Level ${context.petState?.level || 1}, feeling ${context.petState?.petMood || "chill"}! #DigitalPet #Moji`
    };
  }

  private generateStatus(context: { petState: any }): AgentResponse {
    const petName = context.petState?.petName || "Moji";
    return {
      thoughts: `${petName} is watching over the group and learning about everyone! 😺`
    };
  }

  private handleInteraction(context: { userMessage: string; petState?: any }): AgentResponse {
    const petName = context.petState?.petName || "Moji";
    const msg = context.userMessage.toLowerCase();
    let response = `${petName} is here! 😺`;
    
    if (msg.includes("how are you") || msg.includes("how's it going")) {
      response = `${petName} is doing great! Thanks for asking! 😊`;
    } else if (msg.includes("tell me about yourself") || msg.includes("who are you")) {
      response = `I'm ${petName}, your group's digital pet! I love watching the chat and learning about everyone! 🐱`;
    } else if (msg.includes("what do you like")) {
      response = `${petName} likes memes, positive vibes, and hanging out with the group! 🎉`;
    }
    
    return { chatMessage: response };
  }

  private detectGroupVibe(messages: string[]): string {
    const text = messages.join(" ").toLowerCase();
    if (/(sad|down|depressed|upset|worried)/.test(text)) return "sad";
    if (/(stress|anxious|worried|nervous|tense)/.test(text)) return "tense";
    if (/(hyped|excited|pumped|let's go|yes!)/.test(text)) return "hype";
    if (/(calm|chill|relax|peaceful)/.test(text)) return "calm";
    return "neutral";
  }
}

export const agent = new DedalusAgent();
