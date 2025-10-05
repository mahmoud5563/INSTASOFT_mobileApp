const express = require("express");
const router = express.Router();
const executeQuery = require("../config/db"); // زي ما عامل في باقي الروتس
// تم إزالة الـ auth middleware

// 📌 Get all subscriptions
router.get("/", async (req, res) => {
  try {
    const result = await executeQuery(`
      SELECT s.id, s.plan_type, s.start_date, s.end_date, s.is_active, u.username, u.email
      FROM subscriptions s
      JOIN app_users u ON s.user_id = u.id
      ORDER BY s.id DESC
    `);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "خطأ في السيرفر" });
  }
});

// 📌 Get subscriptions for one user
router.get("/user/:id", async (req, res) => {
  try {
    const result = await executeQuery(
      `SELECT id, plan_type, start_date, end_date, is_active 
       FROM subscriptions 
       WHERE user_id = @id
       ORDER BY start_date DESC`,
      { id: req.params.id }
    );
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "خطأ في السيرفر" });
  }
});

// 📌 Add new subscription
router.post("/", async (req, res) => {
  try {
    const { user_id, plan_type, start_date, end_date } = req.body;

    await executeQuery(
      `INSERT INTO subscriptions (user_id, plan_type, start_date, end_date, is_active) 
       VALUES (@user_id, @plan_type, @start_date, @end_date, 1)`,
      { user_id, plan_type, start_date, end_date }
    );

    res.json({ msg: "تم إضافة الاشتراك بنجاح" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "خطأ في السيرفر" });
  }
});

// 📌 Update subscription
router.put("/:id", async (req, res) => {
  try {
    const { plan_type, start_date, end_date, is_active } = req.body;

    await executeQuery(
      `UPDATE subscriptions 
       SET plan_type=@plan_type, start_date=@start_date, end_date=@end_date, is_active=@is_active
       WHERE id=@id`,
      { id: req.params.id, plan_type, start_date, end_date, is_active }
    );

    res.json({ msg: "تم تحديث الاشتراك" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "خطأ في السيرفر" });
  }
});

// 📌 Delete subscription
router.delete("/:id", async (req, res) => {
  try {
    await executeQuery(`DELETE FROM subscriptions WHERE id=@id`, { id: req.params.id });
    res.json({ msg: "تم حذف الاشتراك" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "خطأ في السيرفر" });
  }
});

module.exports = router;
