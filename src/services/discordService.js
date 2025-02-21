// Import the Discord client configuration.
const client = require("../config/discordClient");
// Import the database connection pool.
const pool = require("../config/db");

/**
 * Ensures that the organization "straico" exists in the database and returns its internal ID.
 *
 * @returns {Promise<number>} The internal ID of the "straico" organization.
 */
async function ensureOrganization() {
  const orgName = "straico";
  // Query the organization by name.
  const [rows] = await pool.query(
    "SELECT id FROM organization WHERE name = ?",
    [orgName]
  );
  // If the organization exists, return its ID.
  if (rows.length > 0) {
    return rows[0].id;
  } else {
    // Otherwise, create the organization with the current date.
    const created_at = new Date();
    const [result] = await pool.query(
      "INSERT INTO organization (name, created_at) VALUES (?, ?)",
      [orgName, created_at]
    );
    return result.insertId;
  }
}

/**
 * Inserts or updates a user in the database using their real username.
 * A NULL is inserted into the id column to trigger auto-increment.
 *
 * @param {string} discordUserId - The Discord user ID.
 * @param {number} serverInternalId - The internal ID of the server.
 * @param {string} userName - The user's username.
 * @returns {Promise<number>} The internal ID of the user.
 */
async function upsertUser(discordUserId, serverInternalId, userName) {
  const query = `
    INSERT INTO \`user\` (id, discord_id, server_id, name)
    VALUES (NULL, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      server_id = VALUES(server_id),
      name = VALUES(name),
      id = LAST_INSERT_ID(id)
  `;
  const [result] = await pool.query(query, [
    discordUserId,
    serverInternalId,
    userName,
  ]);
  return result.insertId;
}

/**
 * Inserts or updates a user's participation in a channel.
 * Assumes that there is a unique constraint on (channel_id, user_id).
 *
 * @param {number} channelInternalId - The internal ID of the channel.
 * @param {number} userInternalId - The internal ID of the user.
 * @param {Date} joinedAt - The date when the user joined the channel.
 */
async function upsertChannelUser(channelInternalId, userInternalId, joinedAt) {
  const query = `
    INSERT INTO channel_user (channel_id, user_id, joined_at)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE joined_at = VALUES(joined_at)
  `;
  await pool.query(query, [channelInternalId, userInternalId, joinedAt]);
}

/**
 * Inserts or updates a server (guild) in the database using its Discord ID.
 *
 * @param {object} server - The Discord server object.
 * @param {number} organizationId - The internal ID of the organization.
 * @returns {Promise<number>} The internal ID of the server.
 */
async function saveServer(server, organizationId) {
  const query = `
    INSERT INTO server (discord_id, organization_id, name)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      id = LAST_INSERT_ID(id)
  `;
  const [result] = await pool.query(query, [
    server.id,
    organizationId,
    server.name,
  ]);
  return result.insertId;
}

/**
 * Inserts or updates a channel (non-thread) in the database.
 *
 * @param {number} serverInternalId - The internal ID of the server.
 * @param {object} channel - The Discord channel object.
 * @returns {Promise<number>} The internal ID of the channel.
 */
async function saveChannel(serverInternalId, channel) {
  const query = `
    INSERT INTO channel (discord_id, server_id, name)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      id = LAST_INSERT_ID(id)
  `;
  const [result] = await pool.query(query, [
    channel.id,
    serverInternalId,
    channel.name,
  ]);
  return result.insertId;
}

/**
 * Inserts or updates a thread, linking it to its parent channel.
 *
 * @param {number} parentChannelInternalId - The internal ID of the parent channel.
 * @param {object} thread - The Discord thread object.
 * @returns {Promise<number>} The internal ID of the thread.
 */
async function saveThread(parentChannelInternalId, thread) {
  const query = `
    INSERT INTO thread (discord_id, channel_id, title, description, created_at)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      title = VALUES(title),
      description = VALUES(description),
      id = LAST_INSERT_ID(id)
  `;
  // Use thread.name if available, otherwise thread.title.
  const title = thread.name || thread.title;
  // Use thread.topic as description if available.
  const description = thread.topic || "";
  // Use thread.createdAt if available, otherwise current date.
  const created_at = thread.createdAt || new Date();
  const [result] = await pool.query(query, [
    thread.id,
    parentChannelInternalId,
    title,
    description,
    created_at,
  ]);
  return result.insertId;
}

/**
 * Inserts or updates a message in the database and records the user's participation in the channel.
 * If the message belongs to a thread, the internal ID of the thread is provided.
 * Additionally, attachments, reactions, and mentions are processed.
 *
 * @param {number} serverInternalId - The internal ID of the server.
 * @param {number} channelInternalId - The internal ID of the channel.
 * @param {object} message - The Discord message object.
 * @param {number|null} [threadInternalId=null] - The internal ID of the thread, if applicable.
 * @returns {Promise<number>} The internal ID of the message.
 */
async function saveMessage(
  serverInternalId,
  channelInternalId,
  message,
  threadInternalId = null
) {
  // Insert or update the user using their real username.
  const userInternalId = await upsertUser(
    message.author.id,
    serverInternalId,
    message.author.username
  );

  const query = `
    INSERT INTO message (discord_id, channel_id, thread_id, user_id, content, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      content = VALUES(content),
      id = LAST_INSERT_ID(id)
  `;
  const [result] = await pool.query(query, [
    message.id,
    channelInternalId,
    threadInternalId,
    userInternalId,
    message.content,
    message.createdAt,
  ]);
  const messageInternalId = result.insertId;

  // Record the user's participation in the channel.
  await upsertChannelUser(channelInternalId, userInternalId, message.createdAt);

  // Process message attachments, if any.
  if (message.attachments && message.attachments.size > 0) {
    await Promise.all(
      Array.from(message.attachments.values()).map(async (attachment) => {
        const attachmentQuery = `
          INSERT INTO message_attachment (message_id, attachment_url, created_at)
          VALUES (?, ?, ?)
        `;
        await pool.query(attachmentQuery, [
          messageInternalId,
          attachment.url,
          new Date(),
        ]);
      })
    );
  }

  // Process message reactions.
  if (message.reactions && message.reactions.cache.size > 0) {
    for (const reaction of message.reactions.cache.values()) {
      // Retrieve the users who reacted.
      const users = await reaction.users.fetch();
      await Promise.all(
        Array.from(users.values()).map(async (user) => {
          // Get the internal ID of the reacting user.
          const reactionUserInternalId = await upsertUser(
            user.id,
            serverInternalId,
            user.username
          );
          const reactionQuery = `
            INSERT INTO message_reaction (message_id, user_id, reaction_type, created_at)
            VALUES (?, ?, ?, ?)
          `;
          await pool.query(reactionQuery, [
            messageInternalId,
            reactionUserInternalId,
            reaction.emoji.name,
            new Date(),
          ]);
        })
      );
    }
  }

  // Process message mentions.
  await saveMessageMentions(messageInternalId, message);

  return messageInternalId;
}

/**
 * Processes and saves mentions from a Discord message into the message_mention table.
 *
 * @param {number} messageInternalId - The internal ID of the message.
 * @param {object} message - The Discord message object.
 */
async function saveMessageMentions(messageInternalId, message) {
  // Process user mentions.
  if (message.mentions.users && message.mentions.users.size > 0) {
    for (const user of message.mentions.users.values()) {
      const mentionQuery = `
        INSERT INTO message_mention (message_id, mention_type, target_id, created_at)
        VALUES (?, 'user', ?, ?)
      `;
      await pool.query(mentionQuery, [messageInternalId, user.id, new Date()]);
    }
  }

  // Process role mentions.
  if (message.mentions.roles && message.mentions.roles.size > 0) {
    for (const role of message.mentions.roles.values()) {
      const mentionQuery = `
        INSERT INTO message_mention (message_id, mention_type, target_id, created_at)
        VALUES (?, 'role', ?, ?)
      `;
      await pool.query(mentionQuery, [messageInternalId, role.id, new Date()]);
    }
  }

  // Process @everyone and @here mentions.
  if (message.mentions.everyone) {
    if (message.content.includes("@everyone")) {
      const mentionQuery = `
        INSERT INTO message_mention (message_id, mention_type, target_id, created_at)
        VALUES (?, 'all', NULL, ?)
      `;
      await pool.query(mentionQuery, [messageInternalId, new Date()]);
    }
    if (message.content.includes("@here")) {
      const mentionQuery = `
        INSERT INTO message_mention (message_id, mention_type, target_id, created_at)
        VALUES (?, 'here', NULL, ?)
      `;
      await pool.query(mentionQuery, [messageInternalId, new Date()]);
    }
  }
}

/**
 * Inserts or updates a role in the database.
 * The "discord_id" column is omitted as the "role" table does not havelo.
 * A NULL is inserted into the id column to trigger auto-increment.
 *
 * @param {object} role - The Discord role object.
 * @returns {Promise<number>} The internal ID of the role.
 */
async function saveRole(role) {
  const query = `
    INSERT INTO role (name, description, created_at)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      description = VALUES(description)
  `;
  const created_at = new Date();
  // Set description based on whether the role is hoisted.
  const description = role.hoist ? "Hoisted role" : "";
  const [result] = await pool.query(query, [
    role.name,
    description,
    created_at,
  ]);
  return result.insertId;
}

/**
 * Main logic:
 * 1. Ensures the existence of the "straico" organization.
 * 2. Processes the server's roles (excluding the @everyone role).
 * 3. Iterates over each guild (server):
 *    a) Saves the server.
 *    b) Processes text-based channels (excluding threads) and saves their messages.
 *    c) For each channel, fetches both active and archived threads, saves them (solo si son hilos válidos) y luego guarda sus mensajes.
 * 4. Logs a message a la consola al finalizar el procesamiento de cada servidor.
 */
client.once("ready", async () => {
  try {
    // Ensure the "straico" organization exists.
    const organizationId = await ensureOrganization();

    // Iterate over each guild (server) in the Discord client's cache.
    for (const [guildId, server] of client.guilds.cache) {
      // Process server roles, skipping the @everyone role (which has the same ID as the server).
      server.roles.cache.forEach(async (role) => {
        if (role.id === server.id) return;
        try {
          await saveRole(role);
        } catch (error) {
          console.error(`Error saving role ${role.id}:`, error);
        }
      });

      // Save the server and retrieve its internal ID.
      const serverInternalId = await saveServer(server, organizationId);

      // Filter only text-based channels that are not threads.
      const nonThreadChannels = server.channels.cache.filter(
        (ch) => ch.isTextBased() && !ch.isThread()
      );
      // Map to relate the Discord channel ID with its internal ID (used for threads).
      const parentChannelMap = {};

      // Process each text-based channel (non-thread).
      for (const [channelId, channel] of nonThreadChannels) {
        let channelInternalId;
        try {
          channelInternalId = await saveChannel(serverInternalId, channel);
          parentChannelMap[channel.id] = channelInternalId;
        } catch (error) {
          if (error.code === 50001) {
            console.warn(
              `Missing Access for channel ${channelId}. Skipping channel and its messages.`
            );
          } else {
            console.error(`Error saving channel ${channelId}:`, error);
          }
          continue;
        }

        // Fetch messages in batches of 100 until no more messages are available.
        let fetchedMessages = [];
        let lastMessageId = null;
        while (true) {
          const options = { limit: 100 };
          if (lastMessageId) options.before = lastMessageId;
          let batch;
          try {
            batch = await channel.messages.fetch(options);
          } catch (error) {
            if (error.code === 50001) {
              console.warn(
                `Missing Access for channel ${channelId} while fetching messages. Skipping messages.`
              );
            } else {
              console.error(
                `Error fetching messages for channel ${channelId}:`,
                error
              );
            }
            break;
          }
          if (batch.size === 0) break;
          fetchedMessages.push(...batch.values());
          lastMessageId = batch.last().id;
        }
        // Save all fetched messages for the channel.
        if (fetchedMessages.length > 0) {
          await Promise.all(
            fetchedMessages.map((msg) =>
              saveMessage(serverInternalId, channelInternalId, msg)
            )
          );
        }
      }

      // For each text-based channel, combine active and archived threads.
      for (const [channelId, channel] of nonThreadChannels) {
        const threads = new Map();
        try {
          // Fetch active threads.
          const activeThreads = await channel.threads.fetchActive();
          activeThreads.threads.forEach((thread) =>
            threads.set(thread.id, thread)
          );
        } catch (error) {
          console.error(
            `Error fetching active threads for channel ${channelId}:`,
            error
          );
        }
        try {
          // Fetch archived threads.
          const archivedThreads = await channel.threads.fetchArchived();
          archivedThreads.threads.forEach((thread) =>
            threads.set(thread.id, thread)
          );
        } catch (error) {
          console.error(
            `Error fetching archived threads for channel ${channelId}:`,
            error
          );
        }
        // Process each thread.
        for (const [threadId, thread] of threads) {
          // Asegurarse de que el objeto es de un hilo válido comprobando su tipo.
          if (![10, 11, 12].includes(thread.type)) {
            console.warn(
              `Channel ${thread.id} is not a valid thread type. Skipping.`
            );
            continue;
          }
          const parentChannelInternalId = parentChannelMap[thread.parentId];
          if (!parentChannelInternalId) {
            console.warn(
              `Parent channel for thread ${thread.id} not found. Skipping thread.`
            );
            continue;
          }
          // Save the thread and retrieve its internal ID.
          const threadInternalId = await saveThread(
            parentChannelInternalId,
            thread
          );

          // Fetch messages in the thread in batches.
          let fetchedMessages = [];
          let lastMessageId = null;
          while (true) {
            const options = { limit: 100 };
            if (lastMessageId) options.before = lastMessageId;
            let batch;
            try {
              batch = await thread.messages.fetch(options);
            } catch (error) {
              if (error.code === 50001) {
                console.warn(
                  `Missing Access for thread ${thread.id} while fetching messages. Skipping messages.`
                );
              } else {
                console.error(
                  `Error fetching messages for thread ${thread.id}:`,
                  error
                );
              }
              break;
            }
            if (batch.size === 0) break;
            fetchedMessages.push(...batch.values());
            lastMessageId = batch.last().id;
          }
          // Save all fetched messages for the thread.
          if (fetchedMessages.length > 0) {
            await Promise.all(
              fetchedMessages.map((msg) =>
                saveMessage(
                  serverInternalId,
                  parentChannelInternalId,
                  msg,
                  threadInternalId
                )
              )
            );
          }
        }
      }

      console.log(`Finished processing messages for server: ${server.name}`);
    }
  } catch (error) {
    console.error("Error processing servers:", error);
  }
});
