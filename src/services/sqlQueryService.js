const fs = require("fs");
const path = require("path");
const { generateText } = require("./openaiService");

/**
 * Reads the database schema summary from the file `dbSchemaSummary.md`
 * located in the `src/config` folder.
 *
 * @returns {Promise<string>} The content of the schema summary.
 */
async function getDatabaseSchemaSummary() {
  // Construct the file path relative to this service file
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
    // Retrieve the database schema summary from the file
    const schemaSummary = await getDatabaseSchemaSummary();

    // Construct a system message to include the schema context (only sent once per conversation)
    const systemMessage = {
      role: "system",
      content: `Database Schema:\n${schemaSummary}`,
    };

    // Construct the user message with the SQL conversion instructions
    const userMessage = {
      role: "user",
      content: `
You are a SQL expert. Convert the following natural language description into a precise SQL query based on the provided database schema.
Return the result in JSON format with a key "sql" that contains the query.

Description: ${userPrompt}
      `.trim(),
    };

    // Define the JSON Schema for Structured Outputs
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

    // Call the OpenAI API with the messages and structured output requirements
    const result = await generateText("", {
      temperature: 0.2, // Lower temperature for deterministic output
      reasoningEffort: "high", // Increase reasoning tokens for complex queries
      jsonSchema, // Enforce structured output format
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
