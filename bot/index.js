const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, REST, Routes } = require('discord.js');
const logger = require('./utils/logger');
require('dotenv').config();

if (!process.env.BOT_TOKEN || !process.env.CLIENT_ID) {
  logger.warn('BOT_TOKEN or CLIENT_ID is missing. The Discord bot will not start.');
  logger.warn('Please add these variables to your AI Studio Secrets to enable the bot.');
  // We don't exit with an error code so concurrently doesn't kill the web server
  process.exit(0);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

client.commands = new Collection();

// Load Commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

const commands = [];
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
    commands.push(command.data.toJSON());
    logger.info(`Loaded command: ${command.data.name}`);
  } else {
    logger.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`);
  }
}

// Load Events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
  logger.info(`Loaded event: ${event.name}`);
}

// Register Slash Commands
const rest = new REST().setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    logger.info(`Started refreshing ${commands.length} application (/) commands.`);

    // The put method is used to fully refresh all commands in the guild with the current set
    const data = await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands },
    );

    logger.success(`Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    logger.error(`Error reloading application (/) commands: ${error}`);
  }
})();

// Error Handling
process.on('unhandledRejection', error => {
  logger.error('Unhandled promise rejection:', error);
});

client.login(process.env.BOT_TOKEN);
