// Import the function to get an authenticated OpenAI client
const getOpenAIClient = require("../config/openaiClient");

/**
 * Asynchronously generates an embedding for the provided text using the OpenAI API.
 *
 * @param {string} text - The input text for which the embedding will be generated.
 * @param {string} [model=process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small"] -
 *        The OpenAI embedding model to use. It defaults to the environment variable
 *        OPENAI_EMBEDDING_MODEL if available; otherwise, it uses "text-embedding-3-small".
 * @returns {Promise<number[]>} A promise that resolves with the embedding array.
 * @throws {Error} If there is an error generating the embedding or if no embedding data is received.
 */
async function getEmbedding(text, model = process.env.OPENAI_EMBEDDING_MODEL) {
  try {
    // Validate input: text must be a non-empty string.
    if (!text || typeof text !== "string" || text.trim() === "") {
      console.error("Input text is empty or invalid.");
    }

    // Get an authenticated OpenAI client.
    const openai = await getOpenAIClient();

    // Replace newline characters with spaces to sanitize the text.
    const sanitizedText = text.replace(/\n/g, " ");

    // Request the embedding from OpenAI's API.
    const response = await openai.embeddings.create({
      model,
      input: [sanitizedText],
      encoding_format: "float",
    });

    // Check if the response contains embedding data.
    if (!response.data[0].embedding) {
      throw new Error("No embedding data received from OpenAI.");
    }

    // Return the generated embedding.
    return response.data[0].embedding;
  } catch (error) {
    // Log any errors encountered during the embedding generation process.
    console.error("Error generating embedding:", error);
    throw error;
  }
}

// Export the getEmbedding function for use in other parts of the application.
module.exports = {
  getEmbedding,
};
