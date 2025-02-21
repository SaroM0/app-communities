// Import the function to get an authenticated OpenAI client
const getOpenAIClient = require("../config/openaiClient");

/**
 * Asynchronously generates an embedding for the provided text using the OpenAI API.
 *
 * @param {string} text - The input text for which the embedding will be generated.
 * @param {string} [model=process.env.OPENAI_EMBEDDING_MODEL]
 *        The OpenAI embedding model to use. Defaults to the environment variable
 *        OPENAI_EMBEDDING_MODEL.
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
 * and advanced reasoning by allowing configuration of reasoning effort and max completion tokens.
 *
 * @param {string} prompt - The prompt to generate a response for.
 * @param {object} [options={}] - Additional options for text generation.
 * @param {object} [options.jsonSchema] - Optional JSON Schema for structured outputs.
 * @param {Array} [options.tools] - Optional tools array for function calling.
 * @param {string} [options.reasoningEffort="medium"] - The desired reasoning effort ("low", "medium", "high").
 * @returns {Promise<string|object>} A promise that resolves with the generated text, structured output, or function call details.
 * @throws {Error} If there is an error generating the text or if no response is received.
 */
async function generateText(prompt, options = {}) {
  try {
    // Get an authenticated OpenAI client.
    const openai = await getOpenAIClient();

    // Set default options for text generation.
    const model = "o3-mini";
    const max_tokens = 1000;
    const temperature = 0.7;
    const reasoningEffort = "medium";

    // Construct messages for the chat completion request.
    const messages = [
      {
        role: "",
        content: "",
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
      max_tokens,
      temperature,
      // Set the reasoning effort to control internal chain-of-thought tokens.
      reasoning_effort: reasoningEffort,
    };

    // If max_completion_tokens is provided, include it to control total tokens (reasoning + visible).
    if (options.max_completion_tokens) {
      requestOptions.max_completion_tokens = options.max_completion_tokens;
    }

    // Enable Structured Outputs if a JSON Schema is provided.
    if (options.jsonSchema) {
      requestOptions.response_format = {
        type: "json_schema",
        json_schema: {
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

    // If Structured Outputs were requested, return the parsed structured response.
    if (options.jsonSchema) {
      return response.choices[0].message.parsed;
    }

    // If function calling is enabled and the model returned tool_calls, return them along with any text.
    const message = response.choices[0].message;
    if (message.tool_calls && message.tool_calls.length > 0) {
      return {
        toolCalls: message.tool_calls,
        content: message.content ? message.content.trim() : null,
      };
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
