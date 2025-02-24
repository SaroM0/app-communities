const generateSQLQueryFunction = {
  type: "function",
  name: "generateSQLQuery",
  description: "Generates and executes a SQL query on the relational database.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The SQL query to be executed.",
      },
    },
    required: ["query"],
    additionalProperties: false,
  },
};

const semanticQueryWithContextFunction = {
  type: "function",
  name: "semanticQueryWithContext",
  description: "Performs a semantic search on the vectorized database.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The search query for the semantic vector search.",
      },
    },
    required: ["query"],
    additionalProperties: false,
  },
};

module.exports = {
  generateSQLQueryFunction,
  semanticQueryWithContextFunction,
};
