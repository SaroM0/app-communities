require("dotenv").config();
const pool = require("../config/db");
const { Pinecone } = require("@pinecone-database/pinecone");
const { getEmbedding } = require("./openaiService");

async function createIndexesForChannels() {
  try {
    console.log("Using connection pool from config/db.js");

    // Se obtienen los canales que tienen al menos un mensaje.
    const [channels] = await pool.query(
      `SELECT id, name, channel_type FROM channel
       WHERE id IN (SELECT DISTINCT channel_id FROM message)`
    );
    console.log(`Found ${channels.length} channels with messages.`);

    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });

    for (const channel of channels) {
      const [rows] = await pool.query(
        `SELECT m.discord_id AS message_id, m.content, m.created_at,
                u.id AS user_id, u.name AS user_name,
                t.id AS thread_id, t.title AS thread_title
         FROM message m
         JOIN \`user\` u ON m.user_id = u.id
         LEFT JOIN thread t ON m.thread_id = t.id
         WHERE m.channel_id = ?
         ORDER BY m.created_at ASC`,
        [channel.id]
      );

      if (rows.length === 0) {
        console.log(
          `Channel "${channel.name}" (id ${channel.id}) has no messages.`
        );
        continue;
      }

      // En lugar de agrupar por usuario, se genera un embedding por cada mensaje.
      const embeddingsData = [];
      for (const row of rows) {
        let text = row.content;
        // Si el mensaje pertenece a un thread, se agrega el título del thread como contexto.
        if (row.thread_id) {
          text = `[Thread: ${row.thread_title}] ${text}`;
        }
        // Se obtiene el embedding para el texto del mensaje.
        const embedding = await getEmbedding(text);
        embeddingsData.push({
          id: row.message_id.toString(), // Usamos el id del mensaje como identificador del vector.
          values: embedding,
          metadata: {
            user_id: row.user_id,
            user_name: row.user_name,
            channel_id: channel.id,
            channel_name: channel.name,
            message_text: text,
            created_at: row.created_at,
            thread_id: row.thread_id || null,
            thread_title: row.thread_title || null,
          },
        });
      }

      const indexName = `channel_${channel.id}`;
      console.log(
        `Creating index for channel "${channel.name}" with name "${indexName}"`
      );

      await pinecone.createIndex({
        name: indexName,
        dimension: embeddingsData[0].values.length,
        metric: "cosine",
        spec: {
          serverless: {
            cloud: "aws",
            region: "us-east-1",
          },
        },
      });
      console.log(`Index "${indexName}" created successfully.`);

      await pinecone.upsertIndex({
        name: indexName,
        vectors: embeddingsData,
      });
      console.log(`Vectors upserted for channel "${channel.name}".`);
    }

    console.log("Finished processing all channels.");
  } catch (error) {
    console.error("Error creating indexes:", error);
  }
}

createIndexesForChannels();
