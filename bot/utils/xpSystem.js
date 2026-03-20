const db = require('./database');
const { LEVEL_CONSTANTS } = require('./constants');

const xpSystem = {
  async processMessage(userId, guildId) {
    try {
      const user = await db.getUser(userId);
      if (!user) return;

      const now = Date.now();
      const lastMessage = user.lastMessage || 0;
      const cooldown = 60000; // 1 minute cooldown

      if (now - lastMessage < cooldown) return;

      const xpGain = Math.floor(Math.random() * 10) + 10; // 10-20 XP
      const newXp = (user.xp || 0) + xpGain;
      const currentLevel = user.level || 1;
      const nextLevelXp = Math.floor(LEVEL_CONSTANTS.BASE_XP * Math.pow(LEVEL_CONSTANTS.XP_MULTIPLIER, currentLevel - 1));

      let newLevel = currentLevel;
      let tokensGain = 0;

      if (newXp >= nextLevelXp) {
        newLevel++;
        tokensGain = newLevel * 10; // 10 tokens per level
      }

      await db.updateUser(userId, {
        xp: newXp,
        level: newLevel,
        tokens: (user.tokens || 0) + tokensGain,
        lastMessage: now
      });

      if (newLevel > currentLevel) {
        return { leveledUp: true, newLevel, tokensGain };
      }

      return { leveledUp: false };
    } catch (error) {
      console.error(`Error processing message for user ${userId}:`, error);
      return null;
    }
  }
};

module.exports = xpSystem;
