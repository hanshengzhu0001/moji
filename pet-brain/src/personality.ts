import { Database } from "bun:sqlite";
import { agent } from "./agent";

/**
 * Personality Learning System
 * Analyzes group messages and updates pet personality
 */

export interface PersonalityTraits {
  humor_level: number;
  empathy_level: number;
  energy_level: number;
  curiosity_level: number;
  [key: string]: number;
}

export interface PersonalityData {
  traits: PersonalityTraits;
  interests: string[];
  learned_context: string;
  personality_text: string;
}

/**
 * Analyze recent messages and update personality
 */
export async function learnFromMessages(
  db: Database,
  groupId: string = "main",
  messageLimit: number = 50
): Promise<PersonalityData | null> {
  // Get recent messages
  const messages: any[] = db.prepare(`
    SELECT text, userId, ts 
    FROM messages 
    ORDER BY ts DESC 
    LIMIT ?
  `).all(messageLimit);

  if (messages.length === 0) {
    return null;
  }

  // Get current personality
  const currentPersonality: any = db.prepare(`
    SELECT traits, interests, learned_context, personality_text
    FROM pet_personality
    WHERE groupId = ?
  `).get(groupId);

  let currentTraits: PersonalityTraits = {
    humor_level: 5,
    empathy_level: 5,
    energy_level: 5,
    curiosity_level: 5,
  };

  let currentInterests: string[] = [];
  let currentContext = "";

  if (currentPersonality) {
    try {
      currentTraits = JSON.parse(currentPersonality.traits || "{}");
      currentInterests = JSON.parse(currentPersonality.interests || "[]");
      currentContext = currentPersonality.learned_context || "";
    } catch (e) {
      console.error("[PERSONALITY] Error parsing current personality:", e);
    }
  }

  // Call agent to learn personality
  const agentResponse = await agent.callAgent("personality_learning", {
    messages: messages.map(m => m.text),
    currentPersonality: {
      traits: currentTraits,
      interests: currentInterests,
      learned_context: currentContext
    }
  });

  if (!agentResponse.personalityUpdate) {
    return null;
  }

  const update = agentResponse.personalityUpdate;

  // Merge traits (weighted average with existing)
  const newTraits: PersonalityTraits = { ...currentTraits };
  if (update.traits) {
    Object.keys(update.traits).forEach(key => {
      const newValue = update.traits![key];
      const oldValue = currentTraits[key] || 5;
      // Weighted average: 70% new, 30% old (gradual learning)
      newTraits[key] = Math.round(newValue * 0.7 + oldValue * 0.3);
    });
  }

  // Merge interests (add new ones, keep existing)
  const newInterests = [...currentInterests];
  if (update.interests) {
    update.interests.forEach((interest: string) => {
      if (!newInterests.includes(interest)) {
        newInterests.push(interest);
      }
    });
    // Keep top 10 interests
    newInterests.splice(10);
  }

  // Update learned context
  const newContext = messages.slice(0, 10).map(m => m.text).join(" ").slice(0, 500);

  const personalityData: PersonalityData = {
    traits: newTraits,
    interests: newInterests,
    learned_context: newContext,
    personality_text: update.personality_text || currentPersonality?.personality_text || "Moji is learning about the group!"
  };

  // Save to database
  db.prepare(`
    INSERT OR REPLACE INTO pet_personality (groupId, traits, interests, learned_context, personality_text)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    groupId,
    JSON.stringify(personalityData.traits),
    JSON.stringify(personalityData.interests),
    personalityData.learned_context,
    personalityData.personality_text
  );

  console.log(`[PERSONALITY] Updated personality for ${groupId}:`, personalityData.personality_text);

  return personalityData;
}

/**
 * Get current personality
 */
export function getPersonality(db: Database, groupId: string = "main"): PersonalityData | null {
  const row: any = db.prepare(`
    SELECT traits, interests, learned_context, personality_text
    FROM pet_personality
    WHERE groupId = ?
  `).get(groupId);

  if (!row) {
    return null;
  }

  try {
    return {
      traits: JSON.parse(row.traits || "{}"),
      interests: JSON.parse(row.interests || "[]"),
      learned_context: row.learned_context || "",
      personality_text: row.personality_text || "Moji is a friendly digital pet!"
    };
  } catch (e) {
    console.error("[PERSONALITY] Error parsing personality:", e);
    return null;
  }
}

