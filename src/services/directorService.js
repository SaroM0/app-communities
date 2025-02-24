const {
  createAssistantSession,
  sendAssistantMessage,
} = require("./openaiServices/openaiService");

// Import the function calling definitions
const semanticQueryWithContext = require("../config/functionsDeclaration/semanticFunctions");
const generateSQLQueryFunction = require("../config/functionsDeclaration/sqlFunctions");

const { generateSQLQuery } = require("./sqlServices/sqlQueryService");

const INITIAL_SYSTEM_MESSAGE = `
You are a Query Director Assistant. Your role is to analyze incoming user queries and determine whether they require a relational (SQL) search for quantitative data, a semantic (vectorized) search for qualitative data, or a mixed approach combining both.
For mixed queries, decompose the query into two distinct parts: one for generating a SQL query and another for performing a semantic search.
Ensure that your responses provide clear instructions for routing the query to the appropriate service. Use available function calls when necessary to refine or decompose the query.
Respond in a concise and structured manner.
`;

async function runAssistant(userPrompt) {
  // Create a new assistant session with the initial system message and available tools.
  const session = createAssistantSession(INITIAL_SYSTEM_MESSAGE, [
    generateSQLQueryFunction,
    semanticQueryWithContext,
  ]);
  console.log("===== Assistant Session Created =====");

  // Send the initial user prompt and obtain the assistant's response.
  let assistantResponse = await sendAssistantMessage(session, userPrompt);

  // Check if the assistant has made any tool calls.
  if (assistantResponse.tool_calls && assistantResponse.tool_calls.length > 0) {
    // Extract the function name and parameters from the first tool call.
    const functionName = assistantResponse.tool_calls[0].name;
    const params = assistantResponse.tool_calls[0].parameters;
    let result;

    // Execute the corresponding function based on the tool call.
    if (functionName === "generateSQLQuery") {
      result = await generateSQLQuery(params.query);
    } else if (functionName === "semanticQueryWithContext") {
      result = await semanticQueryWithContext(params.query);
    } else {
      console.error("Function not found:", functionName);
    }
    console.log("Function result:", result);

    // Add the function result as context by appending a new message to the session.
    // Por ejemplo, se puede simular un mensaje del rol "tool" que contenga el resultado.
    session.messages.push({
      role: "tool",
      content: result,
    });

    // Ahora se envía una nueva solicitud al asistente con el contexto actualizado.
    assistantResponse = await sendAssistantMessage(
      session,
      "Based on the function result provided, please generate a natural language answer."
    );
  }

  return assistantResponse;
}

exports.runAssistant = runAssistant;
