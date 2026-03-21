const { Events } = require('discord.js');
const db = require('../utils/database');
const onboarding = require('../utils/onboarding');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    // Handle onboarding component interactions
    if (interaction.isButton() && interaction.customId.startsWith('onboard_')) {
      return await onboarding.handle(interaction);
    }

    if (interaction.isChatInputCommand()) {
      // Check if user is onboarded
      const user = await db.getUser(interaction.user.id);
      if (!user) {
        return await onboarding.handle(interaction);
      }

      const command = interaction.client.commands.get(interaction.commandName);

      if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
      }

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(`Error executing ${interaction.commandName}:`, error);
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
        } else {
          await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
      }
    } else if (interaction.isAutocomplete()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (command && command.autocomplete) {
        try {
          await command.autocomplete(interaction);
        } catch (error) {
          console.error(`Error handling autocomplete for ${interaction.commandName}:`, error);
        }
      }
    } else if (interaction.isButton() || interaction.isModalSubmit() || interaction.isAnySelectMenu()) {
      const commandName = interaction.customId.split(':')[0];
      const command = interaction.client.commands.get(commandName);
      
      if (command && command.handleComponent) {
        try {
          await command.handleComponent(interaction);
        } catch (error) {
          console.error(`Error handling component for ${commandName}:`, error);
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error while processing this action!', ephemeral: true });
          } else {
            await interaction.reply({ content: 'There was an error while processing this action!', ephemeral: true });
          }
        }
      }
    }
  }
};
