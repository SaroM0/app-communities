// src/services/discordService.js
const client = require("../config/discordClient");
const pool = require("../config/db");

/**
 * Asegura que la organización "straico" exista y retorna su id interno.
 */
async function ensureOrganization() {
  const orgName = "straico";
  const [rows] = await pool.query(
    "SELECT id FROM organization WHERE name = ?",
    [orgName]
  );
  if (rows.length > 0) {
    return rows[0].id;
  } else {
    const created_at = new Date();
    const [result] = await pool.query(
      "INSERT INTO organization (name, created_at) VALUES (?, ?)",
      [orgName, created_at]
    );
    return result.insertId;
  }
}

/**
 * Inserta o actualiza un usuario, usando su username real.
 * Se inserta NULL en el campo id para activar el auto_increment.
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
 * Registra la participación de un usuario en un canal.
 * Se asume que existe una restricción única sobre (channel_id, user_id).
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
 * Inserta o actualiza el servidor (guild) usando su discord_id.
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
 * Inserta o actualiza un canal (no thread) en la base de datos.
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
 * Inserta o actualiza un thread, relacionándolo con su canal padre.
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
  const title = thread.name || thread.title;
  const description = thread.topic || "";
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
 * Inserta o actualiza un mensaje, registrando también la participación del usuario en el canal.
 * Si el mensaje pertenece a un thread, se pasa el id interno del thread.
 * Además, se procesan adjuntos y reacciones.
 */
async function saveMessage(
  serverInternalId,
  channelInternalId,
  message,
  threadInternalId = null
) {
  // Inserta/actualiza el usuario usando su username real.
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

  // Registra la participación del usuario en el canal.
  await upsertChannelUser(channelInternalId, userInternalId, message.createdAt);

  // Procesa adjuntos (attachments) del mensaje, si existen.
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

  // Procesa las reacciones del mensaje.
  if (message.reactions && message.reactions.cache.size > 0) {
    for (const reaction of message.reactions.cache.values()) {
      // Se obtienen los usuarios que reaccionaron.
      const users = await reaction.users.fetch();
      await Promise.all(
        Array.from(users.values()).map(async (user) => {
          // Se obtiene el id interno del usuario que reaccionó.
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
  return messageInternalId;
}

/**
 * Inserta o actualiza un rol.
 * Ahora se omite la columna "discord_id" ya que la tabla role no la posee.
 * Se inserta NULL en el campo id para activar el auto_increment.
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
  const description = role.hoist ? "Hoisted role" : "";
  const [result] = await pool.query(query, [
    role.name,
    description,
    created_at,
  ]);
  return result.insertId;
}

/**
 * Lógica principal:
 * 1. Se asegura la existencia de la organización "straico".
 * 2. Se procesan los roles del servidor (omitiendo el rol @everyone).
 * 3. Se recorren cada guild:
 *    a) Se guarda el servidor.
 *    b) Se procesan los canales text-based (no threads) y se guardan sus mensajes.
 *    c) Para cada canal, se obtienen tanto sus threads activos como archivados,
 *       se guardan en la tabla thread y se guardan sus mensajes.
 * 4. Se notifica en consola al finalizar el procesamiento de cada servidor.
 */
client.once("ready", async () => {
  try {
    const organizationId = await ensureOrganization();

    for (const [guildId, server] of client.guilds.cache) {
      // Procesar roles del servidor (omitimos el rol @everyone).
      server.roles.cache.forEach(async (role) => {
        if (role.id === server.id) return;
        try {
          await saveRole(role);
        } catch (error) {
          console.error(`Error saving role ${role.id}:`, error);
        }
      });

      const serverInternalId = await saveServer(server, organizationId);

      // Filtrar solo canales text-based que NO sean threads.
      const nonThreadChannels = server.channels.cache.filter(
        (ch) => ch.isTextBased() && !ch.isThread()
      );
      // Mapeo para relacionar el discord_id del canal con su id interno (para threads).
      const parentChannelMap = {};

      // Procesar canales text-based (no threads).
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
        if (fetchedMessages.length > 0) {
          await Promise.all(
            fetchedMessages.map((msg) =>
              saveMessage(serverInternalId, channelInternalId, msg)
            )
          );
        }
      }

      // Para cada canal text-based, combinar threads activos y archivados.
      for (const [channelId, channel] of nonThreadChannels) {
        const threads = new Map();
        try {
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
        for (const [threadId, thread] of threads) {
          if (!thread.isTextBased()) continue;
          const parentChannelInternalId = parentChannelMap[thread.parentId];
          if (!parentChannelInternalId) {
            console.warn(
              `Parent channel for thread ${thread.id} not found. Skipping thread.`
            );
            continue;
          }
          const threadInternalId = await saveThread(
            parentChannelInternalId,
            thread
          );

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
