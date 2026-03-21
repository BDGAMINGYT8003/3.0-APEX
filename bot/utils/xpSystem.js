const db = require('./database');
const { LEVEL_CONSTANTS, TOKEN_REWARDS } = require('./constants');

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
      let newXp = (user.xp || 0) + xpGain;
      const currentLevel = user.level || 1;
      const nextLevelXp = LEVEL_CONSTANTS.BASE + (currentLevel - 1) * LEVEL_CONSTANTS.INCREMENT;

      let newLevel = currentLevel;
      let tokensGain = 0;

      if (newXp >= nextLevelXp) {
        newXp -= nextLevelXp;
        newLevel++;
        tokensGain = newLevel * (TOKEN_REWARDS ? TOKEN_REWARDS.BASE : 10);
      }

      await db.updateUser(userId, {
        xp: newXp,
        level: newLevel,
        total_xp: (user.total_xp || 0) + xpGain,
        tokens: (user.tokens || 0) + tokensGain,
        lastMessage: now
      });

      if (newLevel > currentLevel) {
        await db.addActivityLog(userId, {
          reason: 'Level Up Reward',
          amount: tokensGain
        });
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
