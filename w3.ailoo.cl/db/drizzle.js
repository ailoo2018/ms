const { pool } = require("./index.js");
const { drizzle } = require("drizzle-orm/mysql2");

// Import the schema using require
const schema = require("./schema.ts");

// Initialize Drizzle with the schema object
const db = drizzle(pool, { schema, mode: 'default' });

// Export the db instance
module.exports = { db };