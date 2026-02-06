import mysql from "mysql2/promise";

console.log("about to create pool");

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  // Convert string to number using Number() or the + prefix
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  multipleStatements: true,
  waitForConnections: true,
  connectTimeout: 60000,
  connectionLimit: 10,
  queueLimit: 0,
});

export { pool };