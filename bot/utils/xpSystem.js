const db = require('./database');
const { LEVEL_CONSTANTS, TOKEN_REWARDS } = require('./constants');
const logger = require('./logger');

// In-memory cooldowns: Map<userId, timestamp>
const cooldowns = new Map();

/**
 * Calculates XP required for the NEXT level.
 * Formula: 100 + (CurrentLevel - 1)
 * @param {number} currentLevel
 * @returns {number} XP cost
 */
function getXpForNextLevel(currentLevel) {
    return LEVEL_CONSTANTS.BASE + (currentLevel - 1);
}

/**
 * Calculates CI Tokens awarded for reaching a specific level.
 * Formula: 10 + (NewLevel - 2)
 * @param {number} level The level JUST reached.
 * @returns {number} Tokens to award.
 */
function getTokenReward(level) {
    // Level 2 (First level up) = 10 CI
    // Level 3 = 11 CI
    // Formula: 10 + (level - 2)
    return TOKEN_REWARDS.BASE + (level - 2);
}

const xpSystem = {
  getXpForNextLevel,
  getTokenReward,
  async processMessage(userId, guildId, content) {
    try {
      // 1. Determine User Status (Complete vs Incomplete)
      let user = await db.getUser(userId);
      let isComplete = true;

      if (!user) {
        user = await db.getIncompleteUser(userId);
        isComplete = false;

        // If not even in incomplete, create it (Silent Reward System)
        if (!user) {
          await db.createIncompleteUser(userId, { discord_id: userId, xp: 0, level: 1, total_xp: 0, tokens: 0 });
          user = await db.getIncompleteUser(userId);
        }
      }

      // 2. Length Check
      if (!content || content.length < 7) return null;

      // 3. Entropy Check
      if (user.last_message_content === content) return null;

      // 4. Cooldown Check
      const now = Date.now();
      const lastXpTime = cooldowns.get(userId) || 0;
      if (now - lastXpTime < 60000) return null;

      // --- AWARD XP & TOKEN ---
      const xpGained = Math.floor(Math.random() * (5 - 2 + 1)) + 2; // Random 2-5

      // Update Cooldown
      cooldowns.set(userId, now);

      // Calculate Leveling
      let currentLevel = user.level || 1;
      const oldLevel = currentLevel;
      let currentXp = (user.xp || 0) + xpGained;
      let totalXp = (user.total_xp || 0) + xpGained;
      let tokens = (user.tokens || 0) + 1; // +1 CI Token per valid message
      let leveledUp = false;
      let tokensAwarded = 0;

      // Check for level ups (loop in case massive XP - unlikely but safe)
      let requiredXp = getXpForNextLevel(currentLevel);

      while (currentXp >= requiredXp) {
          currentXp -= requiredXp;
          currentLevel++;
          leveledUp = true;

          // Award Tokens
          const reward = getTokenReward(currentLevel);
          tokens += reward;
          tokensAwarded += reward;

          // Update requirement for next loop
          requiredXp = getXpForNextLevel(currentLevel);
      }

      // Save to DB (Update appropriate cache)
      const updateData = {
          xp: currentXp,
          total_xp: totalXp,
          level: currentLevel,
          tokens: tokens,
          last_message_content: content
      };

      if (isComplete) {
          await db.updateUser(userId, updateData);
      } else {
          await db.updateIncompleteUser(userId, updateData);
      }

      if (leveledUp && isComplete) {
          await db.addActivityLog(userId, {
              reason: 'Level Up Reward',
              amount: tokensAwarded
          });
      }

      return {
          notify: isComplete, // Only notify if user is fully onboarded
          leveledUp,
          xpGained,
          currentXp,
          oldLevel: leveledUp ? oldLevel : null,
          newLevel: leveledUp ? currentLevel : null,
          tokensAwarded,
          tokensGain: tokensAwarded
      };
    } catch (error) {
      console.error(`Error processing message for user ${userId}:`, error);
      return null;
    }
  }
};

module.exports = xpSystem;
