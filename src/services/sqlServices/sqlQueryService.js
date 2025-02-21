const fs = require("fs");
const path = require("path");
const { generateText } = require("../openaiServices/openaiService");

/**
 * Reads the database schema summary from the file `dbSchemaSummary.md`
 * located in the `src/config` folder.
 *
 * @returns {Promise<string>} The content of the schema summary.
 */
async function getDatabaseSchemaSummary() {
  const filePath = path.join(__dirname, "../config/dbSchemaSummary.md");
  try {
    const schema = await fs.promises.readFile(filePath, "utf8");
    return schema;
  } catch (error) {
    console.error("Error reading database schema summary:", error);
    throw error;
  }
}

/**
 * Generates a SQL query from a natural language prompt by using the OpenAI API.
 * The database schema is provided as context via a system message and the query
 * is returned in a structured output.
 *
 * @param {string} userPrompt - The natural language description of the desired query.
 * @returns {Promise<string>} The generated SQL query.
 */
async function generateSQLQuery(userPrompt) {
  try {
    // Retrieve the database schema summary from the file.
    const schemaSummary = await getDatabaseSchemaSummary();

    // Construct a system message with the schema context.
    const systemMessage = {
      role: "system",
      content: `Database Schema:\n${schemaSummary}`,
    };

    // Construct the user message with the SQL conversion instructions.
    const userMessage = {
      role: "user",
      content: `
You are a SQL expert. Convert the following natural language description into a precise SQL query based on the provided database schema.
Return the result in JSON format with a key "sql" that contains the query.

Description: ${userPrompt}
      `.trim(),
    };

    // Define the JSON Schema for Structured Outputs.
    const jsonSchema = {
      type: "object",
      properties: {
        sql: {
          type: "string",
          description:
            "The generated SQL query based on the prompt and database schema.",
        },
      },
      additionalProperties: false,
      required: ["sql"],
    };

    // Call the OpenAI API with the messages and structured output requirements.
    const result = await generateText("", {
      model: "gpt-4o", // Ajusta el modelo si es necesario.
      max_tokens: 300,
      max_completion_tokens: 500,
      temperature: 0.2,
      reasoningEffort: "high",
      jsonSchema, // Forzamos el formato JSON según el esquema definido.
      messages: [systemMessage, userMessage],
    });

    return result.sql;
  } catch (error) {
    console.error("Error generating SQL query:", error);
    throw error;
  }
}

module.exports = {
  generateSQLQuery,
};
