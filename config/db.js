// db.js (الكود المعدل)

require("dotenv").config();
const sql = require("mssql");

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_DATABASE,
  options: {
    encrypt: true,
    trustServerCertificate: true
  }
};

const pool = new sql.ConnectionPool(dbConfig);
const poolConnect = pool.connect().catch(err => {
    console.error("❌ Database connection failed:", err.message);
    console.error("🔧 Please check:");
    console.error("   1. Internet connection");
    console.error("   2. Database server is running");
    console.error("   3. Correct credentials in .env file");
    console.error("   4. AWS Security Groups allow your IP");
    console.error("   5. Database server: " + process.env.DB_SERVER);
    
    // بدلاً من إيقاف الـ server، سنعطيه فرصة يعمل بدون قاعدة البيانات
    console.warn("⚠️  Server will continue running but database operations will fail");
    return null;
});

// إضافة معالجة لقطع الاتصال
pool.on('error', err => {
    console.error('❌ Database pool error:', err);
    console.warn('⚠️  Attempting to reconnect...');
    // محاولة إعادة الاتصال
    pool.connect().catch(console.error);
});

// الدالة الجديدة لتنفيذ الاستعلامات
async function executeQuery(query, params = {}) {
    try {
        // التأكد من أن الـ pool متصل
        await poolConnect;
        
        const request = pool.request();
        
        // إضافة المعاملات (Parameters) لضمان الأمان ضد SQL Injection
        for (const key in params) {
            // تحديد نوع البيانات بناءً على نوع القيمة
            if (typeof params[key] === 'number') {
                request.input(key, sql.Int, params[key]);
            } else if (typeof params[key] === 'boolean') {
                request.input(key, sql.Bit, params[key]);
            } else {
                request.input(key, sql.NVarChar, params[key]);
            }
        }
        
        const result = await request.query(query);
        return result.recordset;

    } catch (err) {
        console.error("❌ SQL Query Error:", err.message);
        console.error("❌ Query:", query);
        console.error("❌ Params:", params);
        
        // إرجاع مصفوفة فارغة بدلاً من إيقاف الـ server
        if (err.message.includes('Invalid column name')) {
            console.warn("⚠️  Column not found, returning empty result");
            return [];
        }
        
        throw err;
    }
}

module.exports = {
  sql, 
  pool, 
  poolConnect,
  executeQuery // هذه هي الدالة التي سنستخدمها في الـ Controllers
};