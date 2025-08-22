const sql = require("mssql/msnodesqlv8");

const dbConfig = {
  server: "WARD\\SPAXET",  // أو غيرها لو عايز IP
  database: "InstaData",
  options: {
    trustedConnection: true,
    encrypt: false
  }
};

const pool = new sql.ConnectionPool(dbConfig);
const poolConnect = pool.connect();

module.exports = {
  sql, pool, poolConnect
};
