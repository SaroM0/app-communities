# app-communities

## Description

App-communities is an application designed to manage Discord communities. It reads and stores messages, users, channels, threads, and roles from Discord; persists structured data in a MySQL database; vectorizes messages for semantic searches using Pinecone; generates SQL queries from natural language prompts with the help of the OpenAI API; and includes an interactive Query Director Assistant that determines the best approach to process a query.

## Features

- **Discord Integration:** Captures and synchronizes real-time data from Discord.
- **Relational Database:** Uses MySQL to store and manage structured data.
- **Semantic Search:** Retrieves information based on meaning using embeddings and Pinecone indexes.
- **Natural Language SQL Generation:** Converts natural language descriptions into executable SQL queries.
- **Query Director Assistant:** Analyzes queries and routes them to SQL, semantic, or a mixed service.

## Requirements

- Node.js (v14 or later)
- MySQL Server
- A Discord account with bot credentials
- API keys for OpenAI and Pinecone
- PNPM (or NPM, with appropriate adjustments)

## Installation

1. Clone the repository.
2. Navigate to the project directory.
3. Install the dependencies using your preferred package manager.

## Configuration

- Create an `.env` file in the project root with your credentials for OpenAI, Pinecone, MySQL, and Discord.
- Run the provided SQL script to create the necessary tables in your MySQL server.
- Review the database schema summary to understand the table structure.

## Project Structure

- **Root Directory:** Contains the application entry point and project configuration.
- **src/config:** Holds configuration files (database, Discord client, OpenAI, and Pinecone) and function declarations.
- **src/services:** Contains the business logic and services for Discord integration, SQL query generation, semantic search, and the Query Director Assistant.
- **src/utils:** Provides helper functions and utilities.

## Usage

When the application starts, it displays a menu with options to:

1. Read and save Discord information to the database.
2. Retrieve channels and vectorize message data.
3. Generate a SQL query from a natural language prompt.
4. Perform a semantic query with contextual data.
5. Use the Query Director Assistant for interactive query processing.

Select the appropriate option and follow the on-screen instructions.

## Examples

- **Generating an SQL Query:**  
  Choose the SQL query option, enter a natural language description (e.g., asking which user sent the most messages in the last month), and the application will convert it into a SQL query, execute it, and display the results.

- **Performing a Semantic Search:**  
  Select the semantic query option, provide a natural language query (like "search for messages about a product launch") along with a channel ID, and the application will return matching messages based on semantic similarity.

- **Using the Query Director Assistant:**  
  Engage with the assistant to have it determine the optimal processing strategy (SQL, semantic, or mixed) for your query in an interactive loop.
