// Load environment variables from the .env file
require("dotenv").config();

// Import the classes from the OpenAI library
const { Configuration, OpenAIApi } = require("openai");

// Create a configuration instance using the API key from the environment variables
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY, // Our OpenAI API key
});

// Initialize the OpenAIApi client
const openai = new OpenAIApi(configuration);

// Export the configured OpenAI client so it can be used in other parts of the application
module.exports = openai;
