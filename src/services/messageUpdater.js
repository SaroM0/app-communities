// Load node-cron to schedule recurring jobs
const cron = require("node-cron");
// Import the database connection pool
const pool = require("../config/db");
// Import the Discord client from your discordService (ensure it's exported there)
const { client } = require("../services/discordService");

/**
 * Updates messages for all channels by fetching new messages from Discord.
 * Only messages that were not previously stored in the database will be fetched.
 */
async function updateMessages() {
  console.log("Starting hourly message update job...");

  try {
    // Retrieve all channels stored in the database
    const [channels] = await pool.query(
      "SELECT channel_id, guild_id FROM channels"
    );

    // Process each channel record
    for (const channelRecord of channels) {
      const { channel_id, guild_id } = channelRecord;

      // Fetch the Discord channel object using the stored channel ID
      let channel;
      try {
        channel = await client.channels.fetch(channel_id);
      } catch (err) {
        console.error(`Error fetching channel ${channel_id}:`, err);
        continue;
      }

      // Get the most recent stored message for this channel
      const [result] = await pool.query(
        "SELECT message_id FROM messages WHERE channel_id = ? ORDER BY created_at DESC LIMIT 1",
        [channel_id]
      );
      const lastMessageId = result.length > 0 ? result[0].message_id : null;

      // If there is no stored message, skip to avoid fetching the entire history
      if (!lastMessageId) {
        console.log(
          `No previous messages for channel ${channel_id}. Skipping update.`
        );
        continue;
      }

      // Set up fetch options to only get messages after the last stored one
      const fetchOptions = { limit: 100, after: lastMessageId };
      let newMessages;
      try {
        // Fetch new messages from the channel
        newMessages = await channel.messages.fetch(fetchOptions);
      } catch (err) {
        console.error(
          `Error fetching messages for channel ${channel_id}:`,
          err
        );
        continue;
      }

      // Iterate over each new message and store it in the database
      for (const [messageId, message] of newMessages) {
        await saveMessage(guild_id, channel_id, message);
      }
      console.log(
        `Channel ${channel_id} updated with ${newMessages.size} new message(s).`
      );
    }
  } catch (error) {
    console.error("Error during the message update job:", error);
  }
}

/**
 * Saves a message to the database.
 *
 * @param {string} guild_id - The ID of the guild.
 * @param {string} channel_id - The ID of the channel.
 * @param {object} message - The Discord message object.
 */
async function saveMessage(guild_id, channel_id, message) {
  const query = `
    INSERT INTO messages (message_id, channel_id, guild_id, author_id, content, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE content = ?`;
  await pool.query(query, [
    message.id,
    channel_id,
    guild_id,
    message.author.id,
    message.content,
    message.createdAt,
    message.content,
  ]);
}

// Schedule the updateMessages job to run at the top of every hour.
// The cron expression "0 * * * *" means "at minute 0 past every hour".
cron.schedule("0 * * * *", () => {
  updateMessages();
});

// Optionally, you can export the updateMessages function for manual triggering/testing
module.exports = {
  updateMessages,
};
