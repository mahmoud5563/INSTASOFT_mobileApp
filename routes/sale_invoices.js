const express = require("express");
const router = express.Router();
const { pool } = require("../config/db");

//  GET all invoice_list
router.get("/", async (req, res) => {
  try {
    const result = await pool.request().query("SELECT * FROM invoice_list");
    res.json(result.recordset);
  } catch (err) {
    console.error("❌ Error fetching invoices:", err);
    res.status(500).json({ error: "Database fetch failed" });
  }
});

module.exports = router;
