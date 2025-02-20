// src/services/openaiService.js
const openai = require("../config/openaiClient");

/**
 * Genera el embedding para un texto usando la API de OpenAI.
 * Utiliza el modelo definido en la variable de entorno OPENAI_EMBEDDING_MODEL
 * o, por defecto, 'text-embedding-ada-002'.
 *
 * @param {string} text - El texto para el cual generar el embedding.
 * @returns {Promise<number[]>} - El vector de embedding.
 */
async function getEmbedding(text) {
  try {
    const model =
      process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-ada-002";
    const response = await openai.createEmbedding({
      model,
      input: text,
    });
    // Se asume que el embedding está en response.data.data[0].embedding
    return response.data.data[0].embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw error;
  }
}

/**
 * Puedes agregar más funciones relacionadas, por ejemplo, comparar embeddings,
 * calcular similitud, procesar lotes, etc.
 */

module.exports = {
  getEmbedding,
};
