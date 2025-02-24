// Import the function to get an authenticated OpenAI client
const getOpenAIClient = require("../../config/openaiClient");

// ----- ASSISTANT SESSION LOGIC -----

/**
 * Creates a new assistant session with the initial system message and function calling definitions.
 * @param {string} [initialMessage] - Optional custom system message.
 * @returns {object} The new assistant session object.
 */
function createAssistantSession(initialMessage, tools) {
  return {
    messages: [
      {
        role: "system",
        content: initialMessage,
      },
    ],
    tools: tools || [],
  };
}

/**
 * Sends a user message within the given assistant session and updates the session with the response.
 * @param {object} session - The current assistant session object.
 * @param {string} userMessageContent - The user’s message.
 * @param {object} [options={}] - Additional options (e.g., model, max_tokens).
 * @returns {Promise<object>} The assistant’s response message.
 */
async function sendAssistantMessage(session, userMessageContent, options = {}) {
  const openai = await getOpenAIClient();

  // Append the user message to the session history.
  session.messages.push({
    role: "user",
    content: userMessageContent,
  });

  // Build the request options with session messages and function calling tools.
  const requestOptions = {
    model: options.model || "gpt-4o",
    messages: session.messages,
    tools: session.tools,
    max_tokens: options.max_tokens || 500,
  };

  // Call the OpenAI Assistants endpoint.
  const response = await openai.chat.completions.create(requestOptions);
  const assistantResponse = response.choices[0].message;

  // Update the session with the assistant's response.
  session.messages.push(assistantResponse);
  return assistantResponse;
}

// ----- EMBEDDING AND TEXT GENERATION LOGIC -----

/**
 * Asynchronously generates an embedding for the provided text using the OpenAI API.
 *
 * @param {string} text - The input text.
 * @param {string} [model=process.env.OPENAI_EMBEDDING_MODEL] - The OpenAI embedding model.
 * @returns {Promise<number[]>} The generated embedding array.
 * @throws {Error} If no embedding data is received.
 */
async function getEmbedding(text, model = process.env.OPENAI_EMBEDDING_MODEL) {
  try {
    if (!text || typeof text !== "string" || text.trim() === "") {
      console.error("Input text is empty or invalid.");
    }
    const openai = await getOpenAIClient();
    const sanitizedText = text.replace(/\n/g, " ");
    const response = await openai.embeddings.create({
      model,
      input: [sanitizedText],
      encoding_format: "float",
    });
    if (!response.data[0].embedding) {
      throw new Error("No embedding data received from OpenAI.");
    }
    return response.data[0].embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw error;
  }
}

/**
 * Asynchronously generates text using the OpenAI chat completions endpoint.
 * Supports structured outputs and function calling if provided.
 *
 * @param {string} prompt - The prompt to generate a response for.
 * @param {object} [options={}] - Additional options (model, max_tokens, jsonSchema, tools, etc.).
 * @returns {Promise<string|object>} The generated text or structured output.
 * @throws {Error} If no response is received or parsing fails.
 */
async function generateText(prompt, options = {}) {
  try {
    const openai = await getOpenAIClient();
    const model = options.model || "gpt-4o";
    const messages = options.messages || [
      { role: "developer", content: "You are a helpful assistant." },
      { role: "user", content: prompt },
    ];

    let requestOptions = {
      model,
      messages,
    };

    if (options.max_completion_tokens) {
      requestOptions.max_completion_tokens = options.max_completion_tokens;
    } else {
      requestOptions.max_tokens = options.max_tokens || 500;
    }

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

    if (options.tools) {
      requestOptions.tools = options.tools;
    }

    const response = await openai.chat.completions.create(requestOptions);
    const message = response.choices[0].message;

    if (message.tool_calls && message.tool_calls.length > 0) {
      return message.tool_calls;
    }

    if (options.jsonSchema) {
      if (message.parsed) {
        return message.parsed;
      }
      try {
        return JSON.parse(message.content);
      } catch (parseError) {
        throw new Error(
          "Structured output not available and content is not valid JSON."
        );
      }
    }

    return message.content.trim();
  } catch (error) {
    console.error("Error generating text:", error);
    throw error;
  }
}

module.exports = {
  createAssistantSession,
  sendAssistantMessage,
  getEmbedding,
  generateText,
  INITIAL_SYSTEM_MESSAGE,
};
