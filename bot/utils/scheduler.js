const cron = require('node-cron');
const db = require('./database');
const logger = require('./logger');

const scheduler = {
  start: () => {
    // Monthly reset at the 1st of every month at 00:00
    cron.schedule('0 0 1 * *', async () => {
      logger.info('Starting monthly reset...');
      try {
        const users = await db.getAllUsers();
        for (const userId in users) {
          const user = users[userId];
          // Payout logic
          const tokensGain = (user.level || 1) * 100;
          await db.updateUser(userId, {
            tokens: (user.tokens || 0) + tokensGain,
            xp: 0,
            level: 1
          });
          logger.info(`Reset user ${userId} and paid out ${tokensGain} tokens.`);
        }
        logger.success('Monthly reset completed.');
      } catch (error) {
        logger.error('Error during monthly reset:', error);
      }
    });

    logger.info('Scheduler started.');
  }
};

module.exports = scheduler;
