// Load environment variables from the .env file.
require("dotenv").config();

// Import the Pinecone client class from the '@pinecone-database/pinecone' package.
const { Pinecone } = require("@pinecone-database/pinecone");

// Create a new instance of the Pinecone client using the API key from environment variables.
// This client will be used to interact with the Pinecone vector database.
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

// Export the Pinecone client instance for use in other parts of the application.
module.exports = pinecone;
