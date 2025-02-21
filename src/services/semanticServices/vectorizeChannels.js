// Load environment variables from the .env file
require("dotenv").config();

// Import the database connection pool from the configuration
const pool = require("../../config/db");

// Import the Pinecone client from the configuration for vector index operations
const pinecone = require("../../config/pineconeClient");

// Import the getEmbedding function from the OpenAI service to generate text embeddings
const { getEmbedding } = require("../openaiServices/openaiService");

/**
 * Divide un array en lotes (chunks) de un tamaño dado.
 * @param {Array} array - El array a dividir.
 * @param {number} size - El tamaño de cada lote.
 * @returns {Array<Array>} Un array de lotes.
 */
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Asynchronously creates vector indexes for channels based on the messages they contain.
 * The process involves fetching channels with messages, generating embeddings for each message,
 * creating a corresponding Pinecone index, and upserting the vectors into the index.
 */
async function createIndexesForChannels() {
  try {
    console.log("Using connection pool from config/db.js");

    // Retrieve channels that have at least one associated message.
    const [channels] = await pool.query(
      `SELECT id, name, channel_type FROM channel
       WHERE id IN (SELECT DISTINCT channel_id FROM message)`
    );
    console.log(`Found ${channels.length} channels with messages.`);

    // Loop over each channel to process messages and create an index.
    for (const channel of channels) {
      // Fetch messages for the current channel along with associated user and thread data.
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

      // If no messages are found, skip this channel.
      if (rows.length === 0) {
        console.log(
          `Channel "${channel.name}" (id ${channel.id}) has no messages.`
        );
        continue;
      }

      // Array to hold the embedding data for each message.
      const embeddingsData = [];

      // Process each message row to generate embeddings.
      for (const row of rows) {
        // Skip empty message content.
        if (!row.content || row.content.trim() === "") {
          continue;
        }

        let text = row.content;

        // If the message is part of a thread, prepend the thread title for additional context.
        if (row.thread_id) {
          text = `[Thread: ${row.thread_title}] ${text}`;
        }

        let embedding;
        try {
          // Generate an embedding for the text using the getEmbedding function.
          embedding = await getEmbedding(text);
        } catch (error) {
          // If an error occurs during embedding generation, log a warning and skip the message.
          console.warn(
            `Skipping message ${row.message_id} due to error: ${error.message}`
          );
          continue;
        }

        // Validate that the embedding is a valid non-empty array.
        if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
          console.warn(
            `Skipping message ${row.message_id} because embedding is invalid or empty.`
          );
          continue;
        }

        // Prepare the data for upserting into the Pinecone index.
        embeddingsData.push({
          id: row.message_id.toString(), // Use the message ID as the vector identifier.
          values: embedding,
          metadata: {
            user_id: row.user_id,
            user_name: row.user_name,
            channel_id: channel.id,
            channel_name: channel.name,
            message_text: text,
            created_at: row.created_at,
            thread_id: row.thread_id ? row.thread_id.toString() : "", // Convert null to empty string if needed.
            thread_title: row.thread_title || "", // Default to empty string if thread title is null.
          },
        });
      }

      // If no valid embeddings were generated, skip index creation for this channel.
      if (embeddingsData.length === 0) {
        console.log(
          `No valid embeddings generated for channel "${channel.name}". Skipping index creation.`
        );
        continue;
      }

      // Define a unique index name for the channel.
      const indexName = `channel-${channel.id}`;
      console.log(
        `Creating index for channel "${channel.name}" with name "${indexName}"`
      );

      // Create a new index in Pinecone with the specified dimension and settings.
      await pinecone.createIndex({
        name: indexName,
        dimension: embeddingsData[0].values.length, // Set dimension based on the embedding vector length.
        metric: "cosine", // Use cosine similarity as the distance metric.
        spec: {
          serverless: {
            cloud: "aws",
            region: "us-east-1",
          },
        },
      });
      console.log(`Index "${indexName}" created successfully.`);

      // Get the created index object from Pinecone.
      const index = pinecone.index(indexName);

      // Split the embeddingsData into batches to avoid exceeding the message size limit.
      const batches = chunkArray(embeddingsData, 100);
      for (const [i, batch] of batches.entries()) {
        console.log(
          `Upserting batch ${i + 1} of ${batches.length} for channel "${
            channel.name
          }"...`
        );
        await index.upsert(batch, "");
      }
      console.log(`Vectors upserted for channel "${channel.name}".`);
    }

    console.log("Finished processing all channels.");
  } catch (error) {
    // Log any errors that occur during the index creation process.
    console.error("Error creating indexes:", error);
  }
}

// Execute the function to create indexes for all channels.
createIndexesForChannels();
