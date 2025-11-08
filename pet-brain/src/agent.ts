import "dotenv/config";

// Placeholder for Dedalus SDK - actual implementation would be:
// import { Runner } from "@dedalus/agents";

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
}

// Mock Dedalus runner for now - replace with actual SDK when integrated
class DedalusAgent {
  async callAgent(mode: string, context: any): Promise<AgentResponse> {
    console.log(`[AGENT] Mode: ${mode}, Context keys: ${Object.keys(context).join(', ')}`);
    
    // Simple fallback logic until Dedalus SDK is properly integrated
    if (mode === "meme_suggestion") {
      return this.generateMemesuggestion(context);
    }
    
    if (mode === "mood_classification") {
      return this.classifyMood(context);
    }
    
    if (mode === "pet_decision") {
      return this.makePetDecision(context);
    }
    
    return {};
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
        "Stressed but blessed? Moji is here for you! 😺"
      ],
      sad: [
        "It's okay to feel down. The group is here for you 💙",
        "Tomorrow is a new day! Hang in there, friend.",
        "Moji sends virtual hugs! 🫂"
      ],
      happy: [
        "Your energy is contagious! Keep shining! ✨",
        "Love seeing you happy! 😊",
        "This is the vibe! Moji approves! 🎉"
      ],
      excited: [
        "Your excitement is making Moji bounce! 🎊",
        "Let's goooo! Moji is hyped with you! 🚀",
        "This energy! Yes! 💫"
      ]
    };
    
    const messages = encouragements[mood] || ["Moji is watching over the group! 😺"];
    return messages[Math.floor(Math.random() * messages.length)];
  }
}

// When Dedalus SDK is available, replace with:
/*
import { Runner } from "@dedalus/agents";

const runner = new Runner({
  apiKey: process.env.DEDALUS_API_KEY || process.env.OPENAI_API_KEY,
  defaultModel: ["anthropic/claude-3.5-sonnet", "openai/gpt-4"],
  mcpServers: ["dedalus-labs/web-search"],
  tools: [getUserMoods, getShareableMoments, enqueueUtterance]
});

export async function callAgent(mode: string, context: any): Promise<AgentResponse> {
  const response = await runner.run({
    input: buildPrompt(mode, context),
    model: ["anthropic/claude-3.5-sonnet", "openai/gpt-4"],
    stream: false
  });
  
  return JSON.parse(response.output);
}
*/

export const agent = new DedalusAgent();

