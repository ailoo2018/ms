import mysql from "mysql2/promise";
// Create a MySQL connection pool
console.log("about to create pool");
const pool = mysql.createPool({
  host: process.env.DB_HOST, // 'ailoomysql.mysql.database.azure.com',
  user: process.env.DB_USER, // 'motomundi',
  port: process.env.DB_PORT,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  multipleStatements: true,
  waitForConnections: true,
  connectTimeout: 60000,
  connectionLimit: 10,
  queueLimit: 0,

});


export {  pool };
