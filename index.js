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

// Prompt the user to input their chosen option.
rl.question("Enter the option number: ", (answer) => {
  // Trim any extra whitespace from the input.
  const option = answer.trim();

  // Execute the corresponding service based on the user's input.
  if (option === "1") {
    console.log("Starting Discord service...");
    // Import and run the Discord service.
    require("./src/services/discordService");
  } else if (option === "2") {
    console.log("Starting channel vectorization...");
    // Import and run the channel vectorization service.
    require("./src/services/vectorizeChannels");
  } else {
    // Handle invalid options.
    console.log(
      "Invalid option. Please restart the application and enter 1 or 2."
    );
  }
  // Close the readline interface.
  rl.close();
});
