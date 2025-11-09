import { Database } from "bun:sqlite";

/**
 * XP and Leveling System
 * Awards XP for positive behaviors and calculates levels
 */

const XP_PER_LEVEL_BASE = 100;
const XP_MULTIPLIER = 1.5;

export interface XPAction {
  type: "positive_message" | "shared_moment" | "meme_request" | "moji_interaction" | "group_activity";
  userId?: string;
  groupId?: string;
}

const XP_VALUES: Record<string, number> = {
  positive_message: 5,
  shared_moment: 10,
  meme_request: 3,
  moji_interaction: 2,
  group_activity: 15,
};

/**
 * Award XP for an action
 */
export function awardXP(db: Database, action: XPAction): number {
  const xpAmount = XP_VALUES[action.type] || 0;
  if (xpAmount === 0) return 0;

  const groupId = action.groupId || "main";
  const userId = action.userId || "system";

  // Log XP award
  db.prepare(`
    INSERT INTO xp_log (userId, action_type, xp_amount, ts)
    VALUES (?, ?, ?, ?)
  `).run(userId, action.type, xpAmount, new Date().toISOString());

  // Update group XP
  const group: any = db.prepare("SELECT xp, level FROM groups WHERE groupId = ?").get(groupId);
  const currentXP = (group?.xp || 0) + xpAmount;
  const newLevel = calculateLevel(currentXP);

  db.prepare(`
    UPDATE groups 
    SET xp = ?, level = ?
    WHERE groupId = ?
  `).run(currentXP, newLevel, groupId);

  console.log(`[XP] Awarded ${xpAmount} XP for ${action.type}. Total: ${currentXP}, Level: ${newLevel}`);

  return xpAmount;
}

/**
 * Calculate level from total XP (exponential curve)
 */
export function calculateLevel(totalXP: number): number {
  if (totalXP < XP_PER_LEVEL_BASE) return 1;
  
  let level = 1;
  let xpNeeded = XP_PER_LEVEL_BASE;
  let xpForNextLevel = XP_PER_LEVEL_BASE;
  
  while (totalXP >= xpNeeded) {
    level++;
    xpForNextLevel = Math.floor(xpForNextLevel * XP_MULTIPLIER);
    xpNeeded += xpForNextLevel;
  }
  
  return level;
}

/**
 * Get XP progress for current level
 */
export function getXPProgress(totalXP: number): { level: number; currentLevelXP: number; nextLevelXP: number; progress: number } {
  const level = calculateLevel(totalXP);
  
  if (level === 1) {
    return {
      level: 1,
      currentLevelXP: totalXP,
      nextLevelXP: XP_PER_LEVEL_BASE,
      progress: totalXP / XP_PER_LEVEL_BASE
    };
  }

  // Calculate XP needed for previous levels
  let xpForLevel = XP_PER_LEVEL_BASE;
  let totalForPreviousLevels = 0;
  
  for (let i = 1; i < level; i++) {
    totalForPreviousLevels += xpForLevel;
    xpForLevel = Math.floor(xpForLevel * XP_MULTIPLIER);
  }

  const currentLevelXP = totalXP - totalForPreviousLevels;
  const nextLevelXP = xpForLevel;
  const progress = currentLevelXP / nextLevelXP;

  return {
    level,
    currentLevelXP,
    nextLevelXP,
    progress: Math.min(progress, 1.0)
  };
}

/**
 * Check if message is positive (simple heuristic)
 */
export function isPositiveMessage(text: string): boolean {
  const positiveWords = [
    "great", "awesome", "amazing", "love", "happy", "excited", 
    "wonderful", "fantastic", "good", "nice", "cool", "yay",
    "congrats", "congratulations", "proud", "thanks", "thank you"
  ];
  
  const lowerText = text.toLowerCase();
  return positiveWords.some(word => lowerText.includes(word));
}

