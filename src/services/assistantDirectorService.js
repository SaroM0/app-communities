const {
  createAssistantSession,
  sendAssistantMessage,
} = require("./services/openaiIntegration");
// Import the function calling definitions if you need to pass them explicitly (optional)
const assistantFunctions = require("../../config/assistantFunctions");

// Optionally, you can redefine or reuse the INITIAL_SYSTEM_MESSAGE if needed.
const INITIAL_SYSTEM_MESSAGE = `
You are a Query Director Assistant. Your role is to analyze incoming user queries and determine whether they require a relational (SQL) search for quantitative data, a semantic (vectorized) search for qualitative data, or a mixed approach combining both.
For mixed queries, decompose the query into two distinct parts: one for generating a SQL query and another for performing a semantic search.
Ensure that your responses provide clear instructions for routing the query to the appropriate service. Use available function calls when necessary to refine or decompose the query.
Respond in a concise and structured manner.
`;

async function runAssistant(userPrompt) {
  // Create a new assistant session with the initial system message and tools
  const session = createAssistantSession(
    INITIAL_SYSTEM_MESSAGE,
    assistantFunctions
  );
  console.log("Assistant session created:", session);

  // Send the user prompt and receive the assistant's response
  const assistantResponse = await sendAssistantMessage(session, userPrompt);
  console.log("Assistant responded:", assistantResponse);

  return assistantResponse;
}

exports.runAssistant = runAssistant;
