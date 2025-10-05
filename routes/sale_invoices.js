const express = require("express");
const router = express.Router();
const { pool, sql } = require("../config/db");

// ✅ GET all sale invoices - مُعدَّل
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const offset = (page - 1) * limit;

    const fromDate = req.query.from;
    const toDate = req.query.to;

    let dateFilter = "";
    if (fromDate && toDate) {
      dateFilter = `WHERE i.invoice_time BETWEEN @fromDate AND @toDate`;
    }

    // استعلام أساسي للفواتير
    const mainQuery = `
    SELECT 
        i.invoice_number,
        i.user_name,
        i.store,
        i.invoice_time,
        i.Accounts_name AS Account_name,
        i.total_invoice AS total_invoices,
        i.pay_money,
        (i.total_invoice - ISNULL(i.pay_money, 0)) AS remaining,
        i.treasury_view,
        i.acc_type,
        s.balance
    FROM invoice_add i
    LEFT JOIN dbo.account_show s ON i.Accounts_code = s.code
    ${dateFilter}
    ORDER BY i.id DESC
    OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
    `;

    // 🧮 حساب عدد الفواتير
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM invoice_add i
      ${dateFilter};
    `;
    const totalRequest = pool.request();
    if (fromDate && toDate) {
      totalRequest.input("fromDate", sql.Date, fromDate);
      totalRequest.input("toDate", sql.Date, toDate);
    }
    const totalResult = await totalRequest.query(countQuery);
    const totalInvoices = totalResult.recordset[0].total;
    const totalPages = Math.ceil(totalInvoices / limit);

    // جلب الفواتير
    const dataRequest = pool.request();
    dataRequest.input("limit", sql.Int, limit);
    dataRequest.input("offset", sql.Int, offset);
    if (fromDate && toDate) {
      dataRequest.input("fromDate", sql.Date, fromDate);
      dataRequest.input("toDate", sql.Date, toDate);
    }

    const invoicesResult = await dataRequest.query(mainQuery);
    const invoices = invoicesResult.recordset;

    // جلب الأصناف في استعلام واحد
    const invoiceNumbers = invoices.map(i => i.invoice_number);
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
        FROM invoice_list
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
    const finalResult = invoices.map(i => ({
      invoice_number: i.invoice_number,
      user_name: i.user_name,
      store: i.store,
      invoice_time: i.invoice_time,
      Account_name: i.Account_name,
      total_invoices: i.total_invoices,
      pay_money: i.pay_money,
      remaining: i.remaining,
      treasury_view: i.treasury_view,
      acc_type: i.acc_type,
      balance: i.balance,
      items: itemsByInvoice[i.invoice_number] || [],
    }));

    res.json({
      invoices: finalResult,
      pagination: {
        totalInvoices,
        totalPages,
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (err) {
    console.error("❌ Error fetching invoices:", err);
    res.status(500).json({ error: "Database fetch failed" });
  }
});

// POST new invoice - مُعدَّل وجاهز للاستخدام
router.post("/", async (req, res) => {
  try {
    const {
      invoice_number,
      store,
      Accounts_code,
      item_date,
      invoice_time,
      Accounts_name,
      total_invoice,
      pay_money,
      invoice_note,
      items // array of items
    } = req.body;

    const invoiceQuery = `
      INSERT INTO invoice_add (
        invoice_number, store, Accounts_code, item_date, invoice_time, 
        Accounts_name, total_invoice, pay_money, invoice_note
      )
      VALUES (
        @invoice_number, @store, @Accounts_code, @item_date, @invoice_time, 
        @Accounts_name, @total_invoice, @pay_money, @invoice_note
      );
      SELECT SCOPE_IDENTITY() AS id;
    `;

    const request = pool.request();
    request.input("invoice_number", sql.Int, invoice_number);
    request.input("store", sql.NVarChar, store);
    request.input("Accounts_code", sql.Int, Accounts_code);
    request.input("item_date", sql.Date, item_date);
    request.input("invoice_time", sql.NVarChar, invoice_time);
    request.input("Accounts_name", sql.NVarChar, Accounts_name);
    request.input("total_invoice", sql.Decimal(18, 2), total_invoice);
    request.input("pay_money", sql.Decimal(18, 2), pay_money);
    request.input("invoice_note", sql.NVarChar, invoice_note);

    const result = await request.query(invoiceQuery);
    const invoiceId = result.recordset[0].id;

    // إدخال الأصناف
    for (const item of items) {
      const itemQuery = `
        INSERT INTO invoice_list (
          id, invoice_number, item_name, item_unit, item_count, item_price, item_total
        )
        VALUES (
          @id, @invoice_number, @item_name, @item_unit, @item_count, @item_price, @item_total
        );
      `;
      const itemRequest = pool.request();
      itemRequest.input("id", sql.Int, invoiceId);
      itemRequest.input("invoice_number", sql.Int, invoice_number);
      itemRequest.input("item_name", sql.NVarChar, item.item_name);
      itemRequest.input("item_unit", sql.NVarChar, item.item_unit);
      itemRequest.input("item_count", sql.Int, item.item_count);
      itemRequest.input("item_price", sql.Decimal(18, 2), item.item_price);
      itemRequest.input("item_total", sql.Decimal(18, 2), item.item_total);
      await itemRequest.query(itemQuery);
    }

    res.status(201).json({ message: "Invoice created successfully", invoiceId: invoiceId });
  } catch (err) {
    console.error("❌ Error creating invoice:", err);
    res.status(500).json({ error: "Database insert failed" });
  }
});

module.exports = router;