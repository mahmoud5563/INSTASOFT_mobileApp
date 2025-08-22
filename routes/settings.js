const express = require("express");
const router = express.Router();
const { pool, sql } = require("../config/db");

// ✅ GET all settings
router.get("/", async (req, res) => {
  try {
    const result = await pool.request().query("SELECT * FROM setting");
    res.json(result.recordset);
  } catch (err) {
    console.error("❌ Error fetching settings:", err);
    res.status(500).json({ error: "Database fetch failed" });
  }
});

// ✅ POST new setting
router.post("/", async (req, res) => {
  try {
    const { is_activated, last_update, start_activation, end_activation } = req.body;

    await pool.request()
      .input("is_activated", sql.Bit, is_activated)
      .input("last_update", sql.DateTime, last_update)
      .input("start_activation", sql.DateTime, start_activation)
      .input("end_activation", sql.DateTime, end_activation)
      .query(`
        INSERT INTO setting (is_activated, last_update, start_activation, end_activation)
        VALUES (@is_activated, @last_update, @start_activation, @end_activation)
      `);

    res.status(201).json({ message: "✅ Setting added successfully" });
  } catch (err) {
    console.error("❌ Error inserting setting:", err);
    res.status(500).json({ error: "Database insert failed" });
  }
});

// ✅ PUT update by id
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { is_activated, last_update, start_activation, end_activation } = req.body;

    await pool.request()
      .input("id", sql.Int, id)
      .input("is_activated", sql.Bit, is_activated)
      .input("last_update", sql.DateTime, last_update)
      .input("start_activation", sql.DateTime, start_activation)
      .input("end_activation", sql.DateTime, end_activation)
      .query(`
        UPDATE settings
        SET is_activated = @is_activated,
            last_update = @last_update,
            start_activation = @start_activation,
            end_activation = @end_activation
        WHERE id = @id
      `);

    res.json({ message: "✅ Setting updated successfully" });
  } catch (err) {
    console.error("❌ Error updating setting:", err);
    res.status(500).json({ error: "Database update failed" });
  }
});

module.exports = router;
