// Load environment variables from the .env file
require("dotenv").config();

// Import necessary modules from discord.js and the database connection pool
const { Client, GatewayIntentBits } = require("discord.js");
const pool = require("../config/db");

// Create a Discord client with intents to access guilds, messages, and message content
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, // To receive events related to guilds
    GatewayIntentBits.GuildMessages, // To receive text messages from guild channels
    GatewayIntentBits.MessageContent, // To access the content of messages
  ],
});

// Event triggered when the bot successfully connects to Discord
client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    // Iterate over each guild in the client's cache
    for (const [guildId, guild] of client.guilds.cache) {
      // Save the guild information to the database
      await saveGuild(guild);

      // Filter and get only text channels of the guild
      const channels = guild.channels.cache.filter((channel) =>
        channel.isTextBased()
      );

      // Iterate over each text channel in the guild
      for (const [channelId, channel] of channels) {
        // Save the channel information to the database
        await saveChannel(guild, channel);

        let fetchedMessages = [];
        let lastMessageId = null;

        // Loop until no more messages are returned
        while (true) {
          const options = { limit: 100 };
          if (lastMessageId) {
            options.before = lastMessageId; // Fetch messages before the last fetched message
          }

          let batch;
          try {
            // Fetch the next batch of messages
            batch = await channel.messages.fetch(options);
          } catch (error) {
            console.error(
              `Error fetching messages for channel ${channelId}:`,
              error
            );
            break;
          }

          // If no messages are returned, exit the loop
          if (batch.size === 0) break;

          // Add the fetched messages to the list
          fetchedMessages.push(...batch.values());

          // Update the lastMessageId to the ID of the oldest message in this batch
          lastMessageId = batch.last().id;
        }

        // Iterate over each fetched message and save it to the database
        for (const message of fetchedMessages) {
          await saveMessage(guild, channel, message);
        }
      }
    }
  } catch (error) {
    console.error("Error processing guilds:", error);
  }

  // Once synchronization is complete, decide whether to disconnect the bot or keep it active.
  // client.destroy();
});

// Log in to Discord using the token stored in .env
client.login(process.env.DISCORD_TOKEN);

/**
 * Function to save guild (server) data to the database.
 * Uses an SQL query to insert or update the guild information.
 */
async function saveGuild(guild) {
  const query = `
    INSERT INTO guilds (guild_id, name)
    VALUES (?, ?)
    ON DUPLICATE KEY UPDATE name = ?`;
  await pool.query(query, [guild.id, guild.name, guild.name]);
}

/**
 * Function to save channel data to the database.
 * It assumes each channel belongs to a guild.
 */
async function saveChannel(guild, channel) {
  const query = `
    INSERT INTO channels (channel_id, guild_id, name)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE name = ?`;
  await pool.query(query, [channel.id, guild.id, channel.name, channel.name]);
}

/**
 * Function to save a message to the database.
 * It stores details such as the message ID, channel, guild, author, content, and creation date.
 */
async function saveMessage(guild, channel, message) {
  const query = `
    INSERT INTO messages (message_id, channel_id, guild_id, author_id, content, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE content = ?`;
  await pool.query(query, [
    message.id,
    channel.id,
    guild.id,
    message.author.id,
    message.content,
    message.createdAt,
    message.content,
  ]);
}
