// Load environment variables from the .env file
require("dotenv").config();

// Import mysql2 promise-based library for async/await support
const mysql = require("mysql2/promise");

// Create a connection pool for the MySQL database using environment variables
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST, // MySQL host (e.g., localhost)
  user: process.env.MYSQL_USER, // MySQL user from .env
  password: process.env.MYSQL_PASSWORD, // MySQL password from .env
  database: process.env.MYSQL_DATABASE, // MySQL database name from .env
  port: process.env.MYSQL_PORT || 3306, // MySQL port (default 3306)
  waitForConnections: true, // Wait for available connection instead of throwing an error immediately
  connectionLimit: 10, // Maximum number of connections in the pool
  queueLimit: 0, // Unlimited queueing
});

// Export the connection pool to be used in other parts of the project
module.exports = pool;
