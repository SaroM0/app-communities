// Load environment variables from the .env file.
require("dotenv").config();

/**
 * Asynchronously initializes and returns an OpenAI client instance.
 *
 * This function dynamically imports the OpenAI package and creates a new
 * client instance for interacting with the OpenAI API.
 *
 * @returns {Promise<object>} A promise that resolves to an instance of the OpenAI client.
 */
async function getOpenAIClient() {
  // Dynamically import the default export from the "openai" module.
  const { default: OpenAI } = await import("openai");
  // Return a new instance of the OpenAI client.
  return new OpenAI();
}

// Export the getOpenAIClient function for use in other modules.
module.exports = getOpenAIClient;
