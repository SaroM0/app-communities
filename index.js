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

// Prompt the user to input their chosen option.
rl.question("Enter the option number: ", (answer) => {
  // Trim any extra whitespace from the input.
  const option = answer.trim();

  if (option === "1") {
    console.log("Starting Discord service...");
    // Import and run the Discord service.
    require("./src/services/discordServices/discordService");
    rl.close();
  } else if (option === "2") {
    console.log("Starting channel vectorization...");
    // Import and run the channel vectorization service.
    require("./src/services/semanticServices/vectorizeChannels");
    rl.close();
  } else if (option === "3") {
    // For option 3, ask the user for a natural language prompt.
    rl.question(
      "Enter your natural language description for the SQL query: ",
      async (prompt) => {
        try {
          // Import the SQL query service.
          const {
            generateSQLQuery,
          } = require("./src/services/sqlServices/sqlQueryService");
          // Generate the SQL query based on the prompt.
          const sqlQuery = await generateSQLQuery(prompt);
          // Print only the generated SQL query.
          console.log("\nGenerated SQL Query:");
          console.log(sqlQuery);
        } catch (error) {
          console.error("Error generating SQL query:", error);
        } finally {
          rl.close();
        }
      }
    );
  } else {
    // Handle invalid options.
    console.log(
      "Invalid option. Please restart the application and enter 1, 2, or 3."
    );
    rl.close();
  }
});
