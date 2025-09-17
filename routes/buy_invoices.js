const express = require("express");
const router = express.Router();
const { pool, sql } = require("../config/db");

// ✅ GET all buy invoices
router.get("/", async (req, res) => {
  try {
    // pagination variables
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5; // افتراضي 10 لو مش مبعوت
    const offset = (page - 1) * limit;

    // query to count total purchases
    const countQuery = `
      SELECT COUNT(*) AS total FROM purchases_list;
    `;
    const totalResult = await pool.request().query(countQuery);
    const totalPurchases = totalResult.recordset[0].total;

    // حساب عدد الصفحات
    const totalPages = Math.ceil(totalPurchases / limit);

    // query with pagination
    const paginatedQuery = `
      SELECT * FROM purchases_list
      ORDER BY id ASC
      OFFSET ${offset} ROWS
      FETCH NEXT ${limit} ROWS ONLY;
    `;
    const result = await pool.request().query(paginatedQuery);

    res.json({
      purchases: result.recordset,
      pagination: {
        totalPurchases: totalPurchases,
        totalPages: totalPages,
        currentPage: page,
        itemsPerPage: limit
      }
    });
  } catch (err) {
    console.error("❌ Error fetching purchases:", err);
    res.status(500).json({ error: "Database fetch failed" });
  }
});



// صافي المشتريات

// router.get("/net-purchases", async (req, res) => {
//   try {
//     const { date_from, date_to } = req.query;

//     if (!date_from || !date_to) {
//       return res.status(400).json({ error: "يرجى إدخال date_from و date_to" });
//     }

//     const result = await pool.request()
//       .input("date_from", sql.Date, date_from)
//       .input("date_to", sql.Date, date_to)
//       .query(`
//         SELECT 
//           COUNT(pur.id) AS invoice_count,
//           SUM(pur.total_invoice) AS total_invoice,
//           SUM(pur.fatora_tax) AS total_tax,
//           SUM(pur.fatora_desc) AS total_discount,
//           SUM(pur.fatora_paid) AS total_paid,
//           SUM(pur.fatora_Residual) AS total_residual
//         FROM invoice_add pur
//         WHERE pur.invoice_date BETWEEN @date_from AND @date_to
//       `);

//     res.json(result.recordset[0]); // recordset[0] عشان يطلع object واحد مش array
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });


module.exports = router;