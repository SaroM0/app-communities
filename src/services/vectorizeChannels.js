// src/services/vectorizeChannels.js
require("dotenv").config();
const mysql = require("mysql2/promise");
const { Pinecone } = require("@pinecone-database/pinecone");

// Importa la función getEmbedding del módulo OpenAI service.
const { getEmbedding } = require("./openaiService");

async function createIndexesForChannels() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
    });
    console.log("Connected to the MySQL database.");

    // Consulta para obtener canales que tengan mensajes.
    const [channels] = await connection.execute(
      `SELECT id, name, channel_type FROM channel
       WHERE id IN (SELECT DISTINCT channel_id FROM message)`
    );
    console.log(`Found ${channels.length} channels with messages.`);

    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });

    for (const channel of channels) {
      const [rows] = await connection.execute(
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

      // Consolida la interacción por usuario.
      const userInteractions = {};
      for (const row of rows) {
        const uid = row.user_id;
        if (!userInteractions[uid]) {
          userInteractions[uid] = {
            userName: row.user_name,
            messages: [],
          };
        }
        let text = row.content;
        if (row.thread_id) {
          text = `[Thread: ${row.thread_title}] ${text}`;
        }
        userInteractions[uid].messages.push(text);
      }

      // Genera embeddings para cada usuario.
      const embeddingsData = [];
      for (const uid in userInteractions) {
        const interaction = userInteractions[uid];
        const consolidatedText = interaction.messages.join(" ");
        const embedding = await getEmbedding(consolidatedText);
        embeddingsData.push({
          id: uid.toString(),
          values: embedding,
          metadata: {
            user_name: interaction.userName,
            channel_id: channel.id,
            channel_name: channel.name,
            consolidated_text: consolidatedText,
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

    await connection.end();
    console.log("Database connection closed.");
  } catch (error) {
    console.error("Error creating indexes:", error);
  }
}

createIndexesForChannels();
