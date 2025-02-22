// Import the function to get an authenticated OpenAI client
const getOpenAIClient = require("../../config/openaiClient");

/**
 * Asynchronously generates an embedding for the provided text using the OpenAI API.
 *
 * @param {string} text - The input text for which the embedding will be generated.
 * @param {string} [model=process.env.OPENAI_EMBEDDING_MODEL] -
 *        The OpenAI embedding model to use. Defaults to the environment variable
 *        OPENAI_EMBEDDING_MODEL
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
    console.error("Error generating embedding:", error);
    throw error;
  }
}

/**
 * Asynchronously generates a text completion using the OpenAI API's chat completions endpoint.
 * This function supports Structured Outputs (via a JSON Schema), Function Calling (via a tools array),
 * and advanced configuration by allowing token parameters.
 *
 * @param {string} prompt - The prompt to generate a response for.
 * @param {object} [options={}] - Additional options for text generation.
 * @param {string} [options.model="gpt-4o"] - The model to use for text generation.
 * @param {number} [options.max_tokens=150] - The maximum number of visible tokens to generate (used if max_completion_tokens is not provided).
 * @param {number} [options.max_completion_tokens] - The total number of tokens generated including reasoning tokens.
 * @param {object} [options.jsonSchema] - Optional JSON Schema for structured outputs.
 * @param {Array} [options.tools] - Optional tools array for function calling.
 * @returns {Promise<string|object>} A promise that resolves with the generated text, structured output, or function call details.
 * @throws {Error} If there is an error generating the text or if no response is received.
 */
async function generateText(prompt, options = {}) {
  try {
    // Get an authenticated OpenAI client.
    const openai = await getOpenAIClient();

    // Set default options.
    const model = options.model;
    const messages = options.messages || [
      {
        role: "developer",
        content: "You are a helpful assistant.",
      },
      {
        role: "user",
        content: prompt,
      },
    ];

    // Build the request options.
    let requestOptions = {
      model,
      messages,
    };

    // Use max_completion_tokens if provided; otherwise, use max_tokens.
    if (options.max_completion_tokens) {
      requestOptions.max_completion_tokens = options.max_completion_tokens;
    } else {
      requestOptions.max_tokens = options.max_tokens || 500;
    }

    // Enable Structured Outputs if a JSON Schema is provided.
    if (options.jsonSchema) {
      requestOptions.response_format = {
        type: "json_schema",
        json_schema: {
          name: "structured_output",
          strict: true,
          schema: options.jsonSchema,
        },
      };
    }

    // Include tools for function calling if provided.
    if (options.tools) {
      requestOptions.tools = options.tools;
    }

    // Request a text completion from OpenAI's chat completions endpoint.
    const response = await openai.chat.completions.create(requestOptions);

    const message = response.choices[0].message;

    // If function calling is enabled and tool_calls exist, return them along with any text.
    if (message.tool_calls && message.tool_calls.length > 0) {
      return message.tool_calls;
    }

    // If Structured Outputs were requested, try to return the parsed structured response.
    if (options.jsonSchema) {
      if (message.parsed) {
        return message.parsed;
      }
      // Fallback: try to parse message.content as JSON.
      try {
        return JSON.parse(message.content);
      } catch (parseError) {
        throw new Error(
          "Structured output not available and content is not valid JSON."
        );
      }
    }

    // Otherwise, return the plain text response.
    return message.content.trim();
  } catch (error) {
    console.error("Error generating text:", error);
    throw error;
  }
}

module.exports = {
  getEmbedding,
  generateText,
};
