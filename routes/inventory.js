const express = require("express");
const router = express.Router();
const { pool, sql } = require("../config/db");

// ✅ GET جميع أصناف الجرد - مُعدَّل
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // استعلام لجلب أصناف الجرد
    const mainQuery = `
      SELECT 
        item_code,
        item_field5 AS barcode,
        item_ar,
        item_balace,
        item_type,
        item_unit,
        item_minimum,
        item_maxmimm,
        buy,
        price1,
        price2,
        price3,
        (item_balace * buy) AS total_cost
      FROM dbo.item_review
      ORDER BY item_code DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
    `;

    // حساب العدد الإجمالي
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM dbo.item_review;
    `;

    const totalResult = await pool.request().query(countQuery);
    const totalItems = totalResult.recordset[0].total;
    const totalPages = Math.ceil(totalItems / limit);

    // جلب البيانات
    const dataResult = await pool.request()
      .input("offset", sql.Int, offset)
      .input("limit", sql.Int, limit)
      .query(mainQuery);

    res.json({
      inventory: dataResult.recordset,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (err) {
    console.error("❌ Error fetching inventory:", err);
    res.status(500).json({ error: "Database fetch failed" });
  }
});

// ✅ GET أصناف منخفضة المخزون
router.get("/low-stock", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const mainQuery = `
      SELECT 
        item_code,
        item_field5 AS barcode,
        item_ar,
        item_balace,
        item_type,
        item_unit,
        item_minimum,
        item_maxmimm,
        buy,
        price1,
        price2,
        price3,
        (item_balace * buy) AS total_cost
      FROM dbo.item_review
      WHERE item_balace <= item_minimum
      ORDER BY (item_balace - item_minimum) ASC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
    `;

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM dbo.item_review
      WHERE item_balace <= item_minimum;
    `;

    const totalResult = await pool.request().query(countQuery);
    const totalItems = totalResult.recordset[0].total;
    const totalPages = Math.ceil(totalItems / limit);

    const dataResult = await pool.request()
      .input("offset", sql.Int, offset)
      .input("limit", sql.Int, limit)
      .query(mainQuery);

    res.json({
      lowStockItems: dataResult.recordset,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (err) {
    console.error("❌ Error fetching low stock items:", err);
    res.status(500).json({ error: "Database fetch failed" });
  }
});

// ✅ GET أصناف زائدة المخزون
router.get("/over-stock", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const mainQuery = `
      SELECT 
        item_code,
        item_field5 AS barcode,
        item_ar,
        item_balace,
        item_type,
        item_unit,
        item_minimum,
        item_maxmimm,
        buy,
        price1,
        price2,
        price3,
        (item_balace * buy) AS total_cost
      FROM dbo.item_review
      WHERE item_balace >= item_maxmimm
      ORDER BY (item_balace - item_maximum) DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
    `;

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM dbo.item_review
      WHERE item_balace >= item_maxmimm;
    `;

    const totalResult = await pool.request().query(countQuery);
    const totalItems = totalResult.recordset[0].total;
    const totalPages = Math.ceil(totalItems / limit);

    const dataResult = await pool.request()
      .input("offset", sql.Int, offset)
      .input("limit", sql.Int, limit)
      .query(mainQuery);

    res.json({
      overStockItems: dataResult.recordset,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (err) {
    console.error("❌ Error fetching over stock items:", err);
    res.status(500).json({ error: "Database fetch failed" });
  }
});

// ✅ GET تقرير إجمالي الجرد
router.get("/summary/total", async (req, res) => {
  try {
    const query = `
      SELECT 
        COUNT(*) AS total_items,
        SUM(item_balace) AS total_quantity,
        SUM(item_balace * buy) AS total_cost,
        AVG(buy) AS average_cost,
        COUNT(CASE WHEN item_balace <= item_minimum THEN 1 END) AS low_stock_count,
        COUNT(CASE WHEN item_balace >= item_maxmimm THEN 1 END) AS over_stock_count
      FROM dbo.item_review;
    `;

    const result = await pool.request().query(query);

    res.json({
      summary: result.recordset[0]
    });
  } catch (err) {
    console.error("❌ Error fetching inventory summary:", err);
    res.status(500).json({ error: "Database fetch failed" });
  }
});

// ✅ GET أصناف زائدة المخزون
router.get("/over-stock", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const mainQuery = `
      SELECT 
        item_code,
        item_field5 AS barcode,
        item_ar,
        item_balace,
        item_type,
        item_unit,
        item_minimum,
        item_maxmimm,
        buy,
        price1,
        price2,
        price3,
        (item_balace * buy) AS total_cost
      FROM dbo.item_review
      WHERE item_balace >= item_maxmimm
      ORDER BY (item_balace - item_maximum) DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
    `;

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM dbo.item_review
      WHERE item_balace >= item_maxmimm;
    `;

    const totalResult = await pool.request().query(countQuery);
    const totalItems = totalResult.recordset[0].total;
    const totalPages = Math.ceil(totalItems / limit);

    const dataResult = await pool.request()
      .input("offset", sql.Int, offset)
      .input("limit", sql.Int, limit)
      .query(mainQuery);

    res.json({
      overStockItems: dataResult.recordset,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (err) {
    console.error("❌ Error fetching over stock items:", err);
    res.status(500).json({ error: "Database fetch failed" });
  }
});

// ✅ GET تقرير إجمالي الجرد
router.get("/summary/total", async (req, res) => {
  try {
    const query = `
      SELECT 
        COUNT(*) AS total_items,
        SUM(item_balace) AS total_quantity,
        SUM(item_balace * buy) AS total_cost,
        AVG(buy) AS average_cost,
        COUNT(CASE WHEN item_balace <= item_minimum THEN 1 END) AS low_stock_count,
        COUNT(CASE WHEN item_balace >= item_maxmimm THEN 1 END) AS over_stock_count
      FROM dbo.item_review;
    `;

    const result = await pool.request().query(query);

    res.json({
      summary: result.recordset[0]
    });
  } catch (err) {
    console.error("❌ Error fetching inventory summary:", err);
    res.status(500).json({ error: "Database fetch failed" });
  }
});

// ✅ GET صنف محدد بالكود
router.get("/:item_code", async (req, res) => {
  try {
    const { item_code } = req.params;

    const query = `
      SELECT 
        item_code,
        item_field5 AS barcode,
        item_ar,
        item_balace,
        item_type,
        item_unit,
        item_minimum,
        item_maxmimm,
        buy,
        price1,
        price2,
        price3,
        (item_balace * buy) AS total_cost
      FROM dbo.item_review
      WHERE item_code = @item_code;
    `;

    const result = await pool.request()
      .input("item_code", sql.Int, item_code)
      .query(query);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json({
      item: result.recordset[0]
    });
  } catch (err) {
    console.error("❌ Error fetching item:", err);
    res.status(500).json({ error: "Database fetch failed" });
  }
});

module.exports = router;
