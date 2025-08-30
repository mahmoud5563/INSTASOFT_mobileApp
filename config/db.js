const sql = require("mssql");

const dbConfig = {
  user: "db_abb69d_instasoftmobile_admin",  // اليوزر نيم اللي في الكونكشن
  password: "instasoft_mobile20",           // الباسورد
  server: "SQL1001.site4now.net",           // السيرفر
  database: "db_abb69d_instasoftmobile",    // اسم الداتابيز
  options: {
    encrypt: true,        // مهم عشان السيرفر أونلاين
    trustServerCertificate: false
  }
};

const pool = new sql.ConnectionPool(dbConfig);
const poolConnect = pool.connect();

module.exports = {
  sql, pool, poolConnect
};
