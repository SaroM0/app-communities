const fs = require("fs");
const path = require("path");
const pool = require("../../config/db");
const { generateText } = require("../openaiServices/openaiService");

/**
 * Reads the database schema summary from the file `dbSchemaSummary.md`
 * located in the `src/config/context` folder.
 *
 * @returns {Promise<string>} The content of the schema summary.
 */
async function getDatabaseSchemaSummary() {
  const filePath = path.join(
    __dirname,
    "../../config/context/dbSchemaSummary.md"
  );
  try {
    const schema = await fs.promises.readFile(filePath, "utf8");
    return schema;
  } catch (error) {
    console.error("Error reading database schema summary:", error);
    throw error;
  }
}

/**
 * Executes a SQL query using the database pool.
 *
 * @param {string} query - The SQL query to be executed.
 * @returns {Promise<any>} The result of the SQL query.
 */
async function executeSQLQuery(query) {
  try {
    const [results] = await pool.query(query);
    return results;
  } catch (error) {
    throw error;
  }
}

/**
 * Generates a SQL query from a natural language prompt by using the OpenAI API.
 * The database schema is provided as context via a system message, and the query
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

    const contextualTool = {
      type: "function",
      function: {
        name: "generate_contextualized_sql_query",
        description:
          "If there is an issue in the query or if you need specific information to build the complete query, use this function",
        parameters: {
          type: "object",
          properties: {
            userPrompt: {
              type: "string",
              description:
                "The natural language prompt for generating the SQL query.",
            },
          },
          additionalProperties: false,
          required: ["userPrompt"],
        },
        strict: true,
      },
    };

    // Call the OpenAI API with the messages and structured output requirements.
    const result = await generateText("", {
      model: "o3-mini",
      max_tokens: 5000,
      max_completion_tokens: 5000,
      reasoningEffort: "high",
      jsonSchema,
      tools: [contextualTool],
      messages: [systemMessage, userMessage],
    });

    if (Array.isArray(result) && result.length > 0 && result[0].function) {
      const toolCall = result[0];
      if (toolCall.function.name === "generate_contextualized_sql_query") {
        const args = JSON.parse(toolCall.function.arguments);
        const finalSQL = await generateContextualizedSQLQueryWithExecution(
          args.userPrompt
        );
        return finalSQL;
      }
    }

    return result.sql;
  } catch (error) {
    console.error("Error generating SQL query:", error);
    throw error;
  }
}

/**
 * Decomposes a complex natural language prompt into sub-queries that help gather
 * additional context needed to build a complete SQL query.
 *
 * @param {string} userPrompt - The complex natural language prompt.
 * @returns {Promise<string[]>} An array of sub-query strings.
 */
async function decomposePromptForContext(userPrompt) {
  const decompositionPrompt = `
You are a SQL expert. Decompose the following prompt into the fewest necessary sub-queries 
that gather only the essential context needed to generate a complete SQL query.

When decomposing, consider the following:
- Only generate sub-queries if the additional context is absolutely required.
- If retrieving the full dataset is not necessary, include a LIMIT clause to restrict the results.
- Verify if the search criteria might have ambiguities (e.g., the user name "arturo" could appear as "arturo_henao", "art", "ahc", etc.).
- Generate sub-queries that extract only the most relevant data or candidates to confirm the correct match.
- Each sub-query should be a complete SQL snippet that can be executed independently to retrieve part of the required context.

Return the answer in JSON format with a key "subQueries" that is an array of strings.

Prompt: "${userPrompt}"
  `.trim();

  // Define the JSON Schema for structured outputs.
  const jsonSchema = {
    type: "object",
    properties: {
      subQueries: {
        type: "array",
        items: { type: "string" },
        description: "List of sub-queries providing additional context.",
      },
    },
    additionalProperties: false,
    required: ["subQueries"],
  };

  // Call the OpenAI API to decompose the prompt.
  const result = await generateText(decompositionPrompt, {
    model: "o3-mini",
    max_tokens: 5000,
    max_completion_tokens: 5000,
    reasoningEffort: "high",
    jsonSchema,
  });

  return result.subQueries;
}

/**
 * Executes each sub-query to fetch additional context from the database.
 *
 * @param {string[]} subQueries - An array of SQL sub-query strings.
 * @returns {Promise<string>} A combined context string with results from sub-queries.
 */
async function executeSubQueries(subQueries) {
  const contextResults = [];

  for (const query of subQueries) {
    try {
      const result = await executeSQLQuery(query);
      contextResults.push(
        `Query: ${query} -> Result: ${JSON.stringify(result)}`
      );
    } catch (error) {
      console.error(`Error executing sub-query: ${query}`, error);
      contextResults.push(`Query: ${query} -> Result: Error executing query`);
    }
  }

  return contextResults.join("\n");
}

/**
 * Generates a final SQL query from a complex prompt by:
 * 1. Decomposing the prompt into sub-queries for additional context.
 * 2. Executing these sub-queries to gather context from the database.
 * 3. Enriching the original prompt with the additional context.
 * 4. Calling generateSQLQuery with the enriched prompt to obtain the complete SQL query.
 *
 * @param {string} userPrompt - The original complex natural language prompt.
 * @returns {Promise<string>} The final generated SQL query.
 */
async function generateContextualizedSQLQueryWithExecution(userPrompt) {
  console.log("Generating contextualized SQL query with execution...");
  try {
    // Step 1: Decompose the prompt to get contextual sub-queries.
    const subQueries = await decomposePromptForContext(userPrompt);

    // Step 2: Execute each sub-query to get additional context.
    const additionalContext = await executeSubQueries(subQueries);

    // Step 3: Enrich the original prompt with the additional context.
    const enrichedPrompt = `${userPrompt}. Additional context from database queries:\n${additionalContext}`;

    // Step 4: Generate the final SQL query using the enriched prompt.
    const finalSQL = await generateSQLQuery(enrichedPrompt);
    return finalSQL;
  } catch (error) {
    console.error(
      "Error generating contextualized SQL query with execution:",
      error
    );
    throw error;
  }
}

module.exports = {
  generateSQLQuery,
};
