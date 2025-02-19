require("dotenv").config();

// Import modules from discord.js
const { Client, GatewayIntentBits } = require("discord.js");

// Create a Discord client with intents to access guilds, messages, and message content
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, // To receive events related to guilds
    GatewayIntentBits.GuildMessages, // To receive text messages from guild channels
    GatewayIntentBits.MessageContent, // To access the content of messages
  ],
});

// Event triggered when the bot successfully connects to Discord
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// Log in to Discord using the token stored in .env
client.login(process.env.DISCORD_TOKEN);

// Export the client so it can be used in other parts of the application
module.exports = client;
