const express = require("express");
const router = express.Router();
const { pool, sql } = require("../config/db");
const { authenticateToken } = require("../middleware/auth");

// ✅ GET جميع أصناف الجرد - مُعدَّل
router.get("/", authenticateToken, async (req, res) => {
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
      ORDER BY (item_balace - item_maxmimm) DESC
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

// ✅ GET حركة صنف محدد
router.get("/:item_code/movement", async (req, res) => {
  try {
    const { item_code } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // استعلام لجلب حركة الصنف
    const mainQuery = `
      SELECT 
        ia.code,
        ia.item_ar,
        im.trans_date,
        im.trans_statement,
        im.trans_ward,
        im.trans_monsrf
      FROM item_add ia
      INNER JOIN item_movement im ON ia.code = im.code
      WHERE ia.code = @item_code
      ORDER BY im.trans_date DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
    `;

    // حساب العدد الإجمالي للحركات
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM item_add ia
      INNER JOIN item_movement im ON ia.code = im.code
      WHERE ia.code = @item_code;
    `;

    const totalResult = await pool.request()
      .input("item_code", sql.Int, item_code)
      .query(countQuery);

    const totalMovements = totalResult.recordset[0].total;
    const totalPages = Math.ceil(totalMovements / limit);

    // جلب البيانات
    const dataResult = await pool.request()
      .input("item_code", sql.Int, item_code)
      .input("offset", sql.Int, offset)
      .input("limit", sql.Int, limit)
      .query(mainQuery);

    if (dataResult.recordset.length === 0) {
      return res.status(404).json({ error: "Item not found or no movements" });
    }

    res.json({
      item_movements: dataResult.recordset,
      pagination: {
        totalMovements,
        totalPages,
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (err) {
    console.error("❌ Error fetching item movement:", err);
    res.status(500).json({ error: "Database fetch failed" });
  }
});

// ✅ GET جميع تحويلات المخازن مع الأصناف
router.get("/transfers", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // استعلام لجلب تحويلات المخازن
    const mainQuery = `
      SELECT 
        fatora_number,
        fatora_date,
        fatora_branch,
        fatora_store,
        total_invoice,
        user_add,
        fatora_branch2,
        fatora_store2
      FROM dbo.item_transfers
      ORDER BY fatora_date DESC, fatora_number DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
    `;

    // حساب العدد الإجمالي
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM dbo.item_transfers;
    `;

    const totalResult = await pool.request().query(countQuery);
    const totalItems = totalResult.recordset[0].total;
    const totalPages = Math.ceil(totalItems / limit);

    // جلب البيانات
    const dataResult = await pool.request()
      .input("offset", sql.Int, offset)
      .input("limit", sql.Int, limit)
      .query(mainQuery);

    // جلب الأصناف لكل تحويل
    const transfersWithItems = [];
    
    for (const transfer of dataResult.recordset) {
      const itemsQuery = `
        SELECT 
          item_name,
          item_unit,
          item_count,
          item_price,
          (item_count * item_price) AS total_price
        FROM dbo.item_transfers_entry
        WHERE fatora_number = @fatora_number
        ORDER BY item_name;
      `;

      const itemsResult = await pool.request()
        .input("fatora_number", sql.Int, transfer.fatora_number)
        .query(itemsQuery);

      // دمج بيانات التحويل مع الأصناف
      const transferWithItems = {
        ...transfer,
        items: itemsResult.recordset
      };

      transfersWithItems.push(transferWithItems);
    }

    res.json({
      transfers: transfersWithItems,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (err) {
    console.error("❌ Error fetching transfers:", err);
    res.status(500).json({ error: "Database fetch failed" });
  }
});

// ✅ GET تحويل محدد بالرقم مع الأصناف
router.get("/transfers/:fatora_number", async (req, res) => {
  try {
    const { fatora_number } = req.params;

    // استعلام لجلب بيانات التحويل
    const transferQuery = `
      SELECT 
        fatora_number,
        fatora_date,
        fatora_branch,
        fatora_store,
        total_invoice,
        user_add,
        fatora_branch2,
        fatora_store2
      FROM dbo.item_transfers
      WHERE fatora_number = @fatora_number;
    `;

    // استعلام لجلب أصناف التحويل
    const itemsQuery = `
      SELECT 
        item_name,
        item_unit,
        item_count,
        item_price,
        (item_count * item_price) AS total_price
      FROM dbo.item_transfers_entry
      WHERE fatora_number = @fatora_number
      ORDER BY item_name;
    `;

    const transferResult = await pool.request()
      .input("fatora_number", sql.Int, fatora_number)
      .query(transferQuery);

    if (transferResult.recordset.length === 0) {
      return res.status(404).json({ error: "Transfer not found" });
    }

    const itemsResult = await pool.request()
      .input("fatora_number", sql.Int, fatora_number)
      .query(itemsQuery);

    // دمج البيانات في كائن واحد
    const transferData = {
      ...transferResult.recordset[0],
      items: itemsResult.recordset
    };

    res.json(transferData);
  } catch (err) {
    console.error("❌ Error fetching transfer:", err);
    res.status(500).json({ error: "Database fetch failed" });
  }
});

// ✅ GET أصناف تحويل محدد
router.get("/transfers/:fatora_number/items", async (req, res) => {
  try {
    const { fatora_number } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // استعلام لجلب أصناف التحويل مع pagination
    const mainQuery = `
      SELECT 
        item_name,
        item_unit,
        item_count,
        item_price,
        (item_count * item_price) AS total_price
      FROM dbo.item_transfers_entry
      WHERE fatora_number = @fatora_number
      ORDER BY item_name
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
    `;

    // حساب العدد الإجمالي للأصناف
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM dbo.item_transfers_entry
      WHERE fatora_number = @fatora_number;
    `;

    const totalResult = await pool.request()
      .input("fatora_number", sql.Int, fatora_number)
      .query(countQuery);

    const totalItems = totalResult.recordset[0].total;
    const totalPages = Math.ceil(totalItems / limit);

    const dataResult = await pool.request()
      .input("fatora_number", sql.Int, fatora_number)
      .input("offset", sql.Int, offset)
      .input("limit", sql.Int, limit)
      .query(mainQuery);

    res.json({
      items: dataResult.recordset,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (err) {
    console.error("❌ Error fetching transfer items:", err);
    res.status(500).json({ error: "Database fetch failed" });
  }
});

// ✅ GET صنف محدد بالكود
router.get("/:item_code", async (req, res) => {
  try {
    const { item_code } = req.params;

    // التحقق من أن item_code رقم صحيح
    const itemCodeNumber = parseInt(item_code);
    if (isNaN(itemCodeNumber)) {
      return res.status(400).json({ error: "Invalid item code format" });
    }

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
      .input("item_code", sql.Int, itemCodeNumber)
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
