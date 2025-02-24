const {
  createAssistantSession,
  sendAssistantMessage,
} = require("./openaiServices/openaiService");

// Import the function calling definitions
const assistantFunctions = require("../config/functionsDeclaration/assistantFunctions");

const { generateSQLQuery } = require("./sqlServices/sqlQueryService");
const {
  semanticQueryWithContext,
} = require("./semanticServices/semanticSearchService");

const INITIAL_SYSTEM_MESSAGE = `
You are a Query Director Assistant. Your role is to analyze incoming user queries and determine whether they require a relational (SQL) search for quantitative data, a semantic (vectorized) search for qualitative data, or a mixed approach combining both.
For mixed queries, decompose the query into two distinct parts: one for generating a SQL query and another for performing a semantic search.
Ensure that your responses provide clear instructions for routing the query to the appropriate service. Use available function calls when necessary to refine or decompose the query.
Respond in a concise and structured manner.
`;

async function runAssistant(userPrompt) {
  // Create a new assistant session with the initial system message and available tools
  const session = createAssistantSession(
    INITIAL_SYSTEM_MESSAGE,
    assistantFunctions
  );
  console.log("===== Assistant Session Created =====");
  console.log("Assistant session created:");
  console.log("=====================================");

  // Send the user prompt and obtain the assistant's response
  const assistantResponse = await sendAssistantMessage(session, userPrompt);

  if (assistantResponse.tool_calls && assistantResponse.tool_calls.length > 0) {
    // Extract the function name and parameters from the assistant's tool call
    const functionName = assistantResponse.tool_calls[0].name;
    const params = assistantResponse.tool_calls[0].parameters;
    let result;

    // Execute the corresponding function based on the tool call
    if (functionName === "generateSQLQuery") {
      result = await generateSQLQuery(params.query);
    } else if (functionName === "semanticQueryWithContext") {
      result = await semanticQueryWithContext(params.query);
    } else {
      console.error("Function not found:", functionName);
    }
    console.log("Function result:", result);
  }

  return assistantResponse;
}

exports.runAssistant = runAssistant;
