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

/**
 * Asynchronously generates a text completion using the OpenAI API's chat completions endpoint.
 * This function sends a prompt along with a developer instruction to guide the response style.
 *
 * @param {string} prompt - The prompt to generate a response for.
 * @param {object} [options={}] - Additional options for text generation.
 * @param {string} [options.model="gpt-4o"] - The model to use for text generation.
 * @param {number} [options.max_tokens=150] - The maximum number of tokens to generate.
 * @param {number} [options.temperature=0.7] - The temperature to control response randomness.
 * @returns {Promise<string>} A promise that resolves with the generated text.
 * @throws {Error} If there is an error generating the text or if no response is received.
 */
async function generateText(prompt, options = {}) {
  try {
    // Get an authenticated OpenAI client.
    const openai = await getOpenAIClient();

    // Set default options for text generation.
    const model = options.model || "gpt-4o";
    const max_tokens = options.max_tokens || 150;
    const temperature = options.temperature || 0.7;

    // Construct messages for the chat completion request.
    const messages = [
      {
        role: "developer",
        content: "You are a helpful assistant.",
      },
      {
        role: "user",
        content: prompt,
      },
    ];

    // Request a text completion from OpenAI's chat completions endpoint.
    const response = await openai.chat.completions.create({
      model,
      messages,
      max_tokens,
      temperature,
    });

    // Validate the response and extract the generated text.
    if (!response.choices || response.choices.length === 0) {
      throw new Error("No completion choices returned from OpenAI.");
    }
    const generatedText = response.choices[0].message.content;
    return generatedText;
  } catch (error) {
    console.error("Error generating text:", error);
    throw error;
  }
}

module.exports = {
  getEmbedding,
  generateText,
};
