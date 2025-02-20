require("dotenv").config();

async function getOpenAIClient() {
  const { default: OpenAI } = await import("openai");
  return new OpenAI();
}

module.exports = getOpenAIClient;
