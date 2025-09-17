const express = require("express");
const router = express.Router();
const { pool } = require("../config/db");

//  GET all invoice_list
router.get("/", async (req, res) => {
  try {
    // pagination variables
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5; // الافتراضي 10
    const offset = (page - 1) * limit;

    // query to count total invoices
    const countQuery = `
      SELECT COUNT(*) AS total FROM invoice_list;
    `;
    const totalResult = await pool.request().query(countQuery);
    const totalInvoices = totalResult.recordset[0].total;

    // حساب عدد الصفحات
    const totalPages = Math.ceil(totalInvoices / limit);

    // query with pagination
    const paginatedQuery = `
      SELECT * FROM invoice_list
      ORDER BY id ASC
      OFFSET ${offset} ROWS
      FETCH NEXT ${limit} ROWS ONLY;
    `;
    const result = await pool.request().query(paginatedQuery);

    res.json({
      invoices: result.recordset,
      pagination: {
        totalInvoices: totalInvoices,
        totalPages: totalPages,
        currentPage: page,
        itemsPerPage: limit
      }
    });
  } catch (err) {
    console.error("❌ Error fetching invoices:", err);
    res.status(500).json({ error: "Database fetch failed" });
  }
});


// ✅ GET صافي المبيعات خلال فترة (Daily, Weekly, Monthly, Yearly)
// Net Sales
// router.get("/net-sales", async (req, res) => {
//   try {
//     const { date_from, date_to, type } = req.query;

//     let dateGroup;
//     switch (type) {
//       case "0": // يومي
//         dateGroup = "FORMAT(sal.invoice_date, 'yyyy-MM-dd')";
//         break;
//       case "1": // شهري
//         dateGroup = "FORMAT(sal.invoice_date, 'yyyy-MM')";
//         break;
//       case "2": // سنوي
//         dateGroup = "FORMAT(sal.invoice_date, 'yyyy')";
//         break;
//       default:
//         return res.status(400).json({ error: "Invalid type. Use 0, 1, or 2" });
//     }

//     const result = await pool.request()
//       .input("date_from", date_from)
//       .input("date_to", date_to)
//       .query(`
//         SELECT 
//           ${dateGroup} AS period,
//           COUNT(sal.id) AS invoice_count,
//           SUM(sal.total_invoice) AS total_invoice,
//           SUM(sal.fatora_tax) AS total_tax,
//           SUM(sal.fatora_desc) AS total_discount,
//           SUM(sal.fatora_paid) AS total_paid,
//           SUM(sal.fatora_Residual) AS total_residual
//         FROM invoice_add sal
//         WHERE sal.invoice_date BETWEEN @date_from AND @date_to
//         GROUP BY ${dateGroup}
//         ORDER BY ${dateGroup};
//       `);

//     res.json(result.recordset);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

module.exports = router;
