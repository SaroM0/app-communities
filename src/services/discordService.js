// Import the Discord client from the config folder
const client = require("../config/discordClient");
// Import the database connection pool
const pool = require("../config/db");

/**
 * Function to save server data to the database.
 * Uses an SQL query to insert or update the server information.
 */
async function saveServer(server) {
  const query = `
    INSERT INTO servers (server_id, name)
    VALUES (?, ?)
    ON DUPLICATE KEY UPDATE name = ?`;
  await pool.query(query, [server.id, server.name, server.name]);
}

/**
 * Function to save channel data to the database.
 * It assumes each channel belongs to a server.
 */
async function saveChannel(server, channel) {
  const query = `
    INSERT INTO channels (channel_id, server_id, name)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE name = ?`;
  await pool.query(query, [channel.id, server.id, channel.name, channel.name]);
}

/**
 * Function to save a message to the database.
 * It stores details such as the message ID, channel, server, author, content, and creation date.
 */
async function saveMessage(server, channel, message) {
  const query = `
    INSERT INTO messages (message_id, channel_id, server_id, author_id, content, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE content = ?`;
  await pool.query(query, [
    message.id,
    channel.id,
    server.id,
    message.author.id,
    message.content,
    message.createdAt,
    message.content,
  ]);
}

// Process servers (guilds), channels, and messages when the client is ready.
client.once("ready", async () => {
  try {
    // Iterate over each server (guild) in the client's cache
    for (const [guildId, server] of client.guilds.cache) {
      // Save the server information to the database
      await saveServer(server);

      // Filter and get only text channels of the server
      const channels = server.channels.cache.filter((channel) =>
        channel.isTextBased()
      );

      // Iterate over each text channel in the server
      for (const [channelId, channel] of channels) {
        // Save the channel information to the database
        await saveChannel(server, channel);

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

        // Save all fetched messages concurrently for better performance
        await Promise.all(
          fetchedMessages.map((message) =>
            saveMessage(server, channel, message)
          )
        );
      }
    }
  } catch (error) {
    console.error("Error processing servers:", error);
  }
});
