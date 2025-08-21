// server.js
const express = require("express");
const cors = require("cors");

// أهم نقطة: هنستعمل درايفر Windows المدمج مع mssql
const sql = require("mssql/msnodesqlv8");

const app = express();
app.use(cors());
app.use(express.json());

// إعداد الاتصال بـ MSSQL عبر Windows Authentication (Trusted_Connection)

  const dbConfig = {
  connectionString:
    "Driver={SQL Server Native Client 11.0};Server=WARD\\SPAXET;Database=InstaData;Trusted_Connection=Yes;"
  // لو اسم القاعدة مختلف عندك، غيّر 'InstaData' لاسمها.
};



let poolPromise = null;
async function getPool() {
  if (!poolPromise) {
    poolPromise = sql.connect(dbConfig);
  }
  return poolPromise;
}

// ✅ Endpoint للفواتير: يرجّع أول 50 سجل (تقدر تغيّرها بـ ?limit=)
app.get("/api/invoices", async (req, res) => {
  // باراميتر اختياري للتحكم في العدد، هنفلتره ونحدّه بـ 200
  const limitRaw = req.query.limit;
  let limit = parseInt(limitRaw, 10);
  if (isNaN(limit) || limit <= 0) limit = 50;
  if (limit > 200) limit = 200;

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .query(`SELECT TOP (${limit}) * FROM invoice_list`);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// POST: إضافة سجل جديد في جدول setting
app.post('/api/setting', async (req, res) => {
  try {
    const { is_activated, last_update, start_activation, end_activation } = req.body;

    if (is_activated === undefined || !last_update || !start_activation || !end_activation) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const pool = await sql.connect(dbConfig);

    const result = await pool.request()
      .input('is_activated', sql.Bit, is_activated)
      .input('last_update', sql.DateTime, last_update)
      .input('start_activation', sql.DateTime, start_activation)
      .input('end_activation', sql.DateTime, end_activation)
      .query(`
        INSERT INTO setting (is_activated, last_update, start_activation, end_activation)
        OUTPUT INSERTED.id
        VALUES (@is_activated, @last_update, @start_activation, @end_activation)
      `);

    res.json({ message: 'Setting created successfully', id: result.recordset[0].id });
  } catch (err) {
    console.error('❌ Error inserting setting:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});



// PUT: تحديث record في جدول setting
app.put('/api/setting/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_activated, last_update, start_activation, end_activation } = req.body;

    if (is_activated === undefined || !last_update || !start_activation || !end_activation) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const pool = await sql.connect(dbConfig);

    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('is_activated', sql.Bit, is_activated)
      .input('last_update', sql.DateTime, last_update)
      .input('start_activation', sql.DateTime, start_activation)
      .input('end_activation', sql.DateTime, end_activation)
      .query(`
        UPDATE setting
        SET is_activated = @is_activated,
            last_update = @last_update,
            start_activation = @start_activation,
            end_activation = @end_activation
        WHERE id = @id
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Setting not found" });
    }

    res.json({ message: 'Setting updated successfully' });
  } catch (err) {
    console.error('❌ Error updating setting:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});




// شغّل السيرفر على كل كروت الشبكة عشان الأجهزة على نفس الشبكة تقدر توصله
const PORT = 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ API is running on all network interfaces at port ${PORT}`);
});

