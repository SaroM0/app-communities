// Load environment variables from the .env file.
require("dotenv").config();

// Import the readline module to handle user input from the console.
const readline = require("readline");

// Create an interface to read input from the console.
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Display the available options to the user.
console.log("Select an option:");
console.log("1. Read information from Discord and save it to the database.");
console.log("2. Retrieve channels and vectorize the information.");
console.log("3. Generate SQL Query from natural language prompt.");
console.log("4. Perform semantic query with context.");
console.log("5. Use Query Director Assistant.");

// Prompt the user to input their chosen option.
rl.question("Enter the option number: ", (answer) => {
  const option = answer.trim();

  if (option === "1") {
    console.log("Starting Discord service...");
    require("./src/services/discordServices/discordService");
    rl.close();
  } else if (option === "2") {
    console.log("Starting channel vectorization...");
    require("./src/services/semanticServices/vectorizeChannels");
    rl.close();
  } else if (option === "3") {
    rl.question(
      "Enter your natural language description for the SQL query: ",
      async (prompt) => {
        try {
          const {
            generateSQLQuery,
          } = require("./src/services/sqlServices/sqlQueryService");
          const sqlQuery = await generateSQLQuery(prompt);
          console.log("\nGenerated SQL Query:");
          console.log(sqlQuery);
        } catch (error) {
          console.error("Error generating SQL query:", error);
        } finally {
          rl.close();
        }
      }
    );
  } else if (option === "4") {
    rl.question("Enter your natural language query: ", (query) => {
      rl.question("Enter the channel ID: ", async (channelId) => {
        try {
          const {
            semanticQueryWithContext,
          } = require("./src/services/semanticServices/semanticSearchService");
          const answer = await semanticQueryWithContext(query, channelId);
          console.log("\nSemantic Query Answer:");
          console.log(answer);
        } catch (error) {
          console.error("Error during semantic query:", error);
        } finally {
          rl.close();
        }
      });
    });
  } else if (option === "5") {
    // New option to use the Query Director Assistant.
    rl.question(
      "Enter your query for the Query Director Assistant: ",
      async (userQuery) => {
        try {
          const {
            runAssistant,
          } = require("./src/services/assistantDirectorService");
          const assistantResponse = await runAssistant(userQuery);
          console.log("\nAssistant Response:");
          console.log(assistantResponse);
        } catch (error) {
          console.error("Error executing the assistant:", error);
        } finally {
          rl.close();
        }
      }
    );
  } else {
    console.log(
      "Invalid option. Please restart the application and enter 1, 2, 3, 4, or 5."
    );
    rl.close();
  }
});
