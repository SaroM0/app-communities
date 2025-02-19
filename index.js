require("dotenv").config();

// Get command-line arguments (if any)
const args = process.argv.slice(2);

// If the '--discord' flag is present, or no valid flag is provided, start the Discord service.
if (args.includes("--discord") || args.length === 0) {
  console.log("Starting Discord service...");
  // Import the Discord service; the service file will initialize and run the Discord client.
  require("./src/services/discordService");
} else {
  console.log(
    "No valid service specified. Please use '--discord' to start the Discord service."
  );
}
