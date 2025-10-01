require("dotenv").config();
const sql = require("mssql");

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  port: parseInt(process.env.DB_PORT), // إضافة البورت
  database: process.env.DB_DATABASE,
  options: {
    encrypt: true,
    trustServerCertificate: true // خليه true عشان مشاكل SSL مع AWS
  }
};

const pool = new sql.ConnectionPool(dbConfig);
const poolConnect = pool.connect();

module.exports = {
  sql, pool, poolConnect
};

