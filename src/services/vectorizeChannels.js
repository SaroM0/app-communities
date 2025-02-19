// vectorize_channels.js
import mysql from "mysql2/promise";
import { Pinecone } from "@pinecone-database/pinecone";

async function createIndexesForChannels() {
  try {
    // Connect to the MySQL database
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
    });
    console.log("Connected to the MySQL database.");

    // Query to retrieve channels
    // "channels" table has at least the columns "id", "name", and "channel_type"
    const [channels] = await connection.execute(
      "SELECT id, name, channel_type FROM channels"
    );
    console.log(`Found ${channels.length} channels.`);

    // Initialize the Pinecone client
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY, // Set this variable with your Pinecone API key
    });

    // Default value for vector dimension (adjust as needed)
    const defaultDimension = 2;

    // For each channel, create an index in Pinecone
    for (const channel of channels) {
      // Define the index name based on the channel id
      const indexName = `channel_${channel.id}`;
      console.log(
        `Creating index for channel "${channel.name}" with name "${indexName}"`
      );

      // Create the index in Pinecone
      await pinecone.createIndex({
        name: indexName,
        dimension: defaultDimension,
        metric: "cosine",
        spec: {
          serverless: {
            cloud: "aws",
            region: "us-east-1",
          },
        },
      });
      console.log(`Index "${indexName}" created successfully.`);
    }

    // Close the database connection
    await connection.end();
    console.log("Database connection closed.");
  } catch (error) {
    console.error("Error creating indexes:", error);
  }
}

createIndexesForChannels();
