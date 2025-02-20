const getOpenAIClient = require("../config/openaiClient");

async function getEmbedding(text, model = process.env.OPENAI_EMBEDDING_MODEL) {
  try {
    const openai = await getOpenAIClient();
    const sanitizedText = text.replace(/\n/g, " ");
    const response = await openai.embeddings.create({
      model,
      input: [sanitizedText],
      encoding_format: "float",
    });
    return response.data.data[0].embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw error;
  }
}

module.exports = {
  getEmbedding,
};
