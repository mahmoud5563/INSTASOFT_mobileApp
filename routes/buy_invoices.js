const express = require("express");
const router = express.Router();
// تأكد من أن هذا المسار صحيح واستخدام الدالة executeQuery (إذا كانت متاحة)
const { pool, sql } = require("../config/db");
const { authenticateToken } = require("../middleware/auth"); 

// ✅ GET all buy invoices - مُعدَّل
router.get("/", authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const offset = (page - 1) * limit;

    const fromDate = req.query.from;
    const toDate = req.query.to;

    let dateFilter = "";
    if (fromDate && toDate) {
      dateFilter = `WHERE p.invoice_time BETWEEN @fromDate AND @toDate`;
    }

    // استعلام أساسي للفواتير
    const mainQuery = `
    SELECT 
        p.invoice_number,
        p.store,
        p.Accounts_name AS Account_name,
        p.invoice_time,
        p.total_invoice AS total_invoices,
        p.pay_money,
        (p.total_invoice - ISNULL(p.pay_money, 0)) AS remaining,
        p.treasury_view,
        p.acc_type,
        s.balance,
        p.user_name
    FROM purchases_add p
    LEFT JOIN dbo.account_show s ON p.Accounts_code = s.code
    ${dateFilter}
    ORDER BY p.id DESC
    OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
    `;

    // 🧮 حساب عدد الفواتير
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM purchases_add p
      ${dateFilter};
    `;
    const totalRequest = pool.request();
    if (fromDate && toDate) {
      totalRequest.input("fromDate", sql.Date, fromDate);
      totalRequest.input("toDate", sql.Date, toDate);
    }
    const totalResult = await totalRequest.query(countQuery);
    const totalPurchases = totalResult.recordset[0].total;
    const totalPages = Math.ceil(totalPurchases / limit);

    // جلب الفواتير
    const dataRequest = pool.request();
    dataRequest.input("limit", sql.Int, limit);
    dataRequest.input("offset", sql.Int, offset);
    if (fromDate && toDate) {
      dataRequest.input("fromDate", sql.Date, fromDate);
      dataRequest.input("toDate", sql.Date, toDate);
    }

    const purchasesResult = await dataRequest.query(mainQuery);
    const purchases = purchasesResult.recordset;

    // جلب الأصناف في استعلام واحد
    const invoiceNumbers = purchases.map(p => p.invoice_number);
    let itemsByInvoice = {};

    if (invoiceNumbers.length > 0) {
      const itemsQuery = `
        SELECT 
          invoice_number,
          item_name,
          item_unit,
          item_count,
          item_price,
          item_count * item_price AS item_total
        FROM purchases_list
        WHERE invoice_number IN (${invoiceNumbers.map(n => `'${n}'`).join(",")});
      `;
      const itemsResult = await pool.request().query(itemsQuery);

      // نرتب الأصناف حسب الفاتورة
      itemsResult.recordset.forEach(item => {
        if (!itemsByInvoice[item.invoice_number]) {
          itemsByInvoice[item.invoice_number] = [];
        }
        itemsByInvoice[item.invoice_number].push({
          item_name: item.item_name,
          item_unit: item.item_unit,
          item_count: item.item_count,
          item_price: item.item_price,
          item_total: item.item_total,
        });
      });
    }

    // دمج النتائج
    const finalResult = purchases.map(p => ({
      invoice_number: p.invoice_number,
      store: p.store,
      Account_name: p.Account_name,
      invoice_time: p.invoice_time,
      total_invoices: p.total_invoices,
      pay_money: p.pay_money,
      remaining: p.remaining,
      treasury_view: p.treasury_view,
      acc_type: p.acc_type,
      balance: p.balance,
      user_name: p.user_name,
      items: itemsByInvoice[p.invoice_number] || [],
    }));

    res.json({
      purchases: finalResult,
      pagination: {
        totalPurchases,
        totalPages,
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (err) {
    console.error("❌ Error fetching purchases:", err);
    res.status(500).json({ error: "Database fetch failed" });
  }
});




// صافي المشتريات - مُعدَّل وجاهز للاستخدام
router.get("/net-purchases", authenticateToken, async (req, res) => {
    try {
     
        const { date_from, date_to } = req.query;

        if (!date_from || !date_to) {
            return res.status(400).json({ error: "يرجى إدخال date_from و date_to" });
        }

   
        const query = `
            SELECT 
                COUNT(pur.id) AS invoice_count,
                SUM(pur.total_invoice) AS total_invoice,
                SUM(pur.fatora_tax) AS total_tax,
                SUM(pur.fatora_desc) AS total_discount,
                SUM(pur.fatora_paid) AS total_paid,
                SUM(pur.fatora_Residual) AS total_residual
            FROM invoice_add pur
            WHERE pur.invoice_date BETWEEN @date_from AND @date_to
        `;
        
        const result = await pool.request()
            .input("date_from", sql.Date, date_from)
            .input("date_to", sql.Date, date_to)
            .query(query);

        res.json(result.recordset[0]);
    } catch (err) {
        console.error("❌ Error fetching net purchases:", err);
        res.status(500).json({ error: "Database fetch failed" });
    }
});


module.exports = router;