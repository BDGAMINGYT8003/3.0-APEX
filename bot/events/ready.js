const { Events, ActivityType } = require('discord.js');
const logger = require('../utils/logger');
const scheduler = require('../utils/scheduler');

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    logger.success(`Ready! Logged in as ${client.user.tag}`);
    client.user.setActivity('the web dashboard', { type: ActivityType.Watching });

    // Start the scheduler for monthly resets and payouts
    scheduler.start();
  }
};
