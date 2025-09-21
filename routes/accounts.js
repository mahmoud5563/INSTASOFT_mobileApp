const express = require("express");
const router = express.Router();
const { pool, sql } = require("../config/db");

// دالة مساعدة لتحسين نظام الصفحات
const executePaginatedQuery = async (baseQuery, countQuery, page, limit, pool) => {
    const offset = (page - 1) * limit;
    
    // تنفيذ الاستعلامات بشكل متوازي
    const [dataResult, countResult] = await Promise.all([
        pool.request()
            .input('offset', sql.Int, offset)
            .input('limit', sql.Int, limit)
            .query(baseQuery),
        pool.request().query(countQuery)
    ]);
    
    const totalItems = countResult.recordset[0].total;
    const totalPages = Math.ceil(totalItems / limit);
    
    return {
        data: dataResult.recordset,
        pagination: {
            totalItems,
            totalPages,
            currentPage: page,
            itemsPerPage: limit,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        }
    };
};

// دالة validation للبيانات
const validatePaginationParams = (page, limit) => {
    const errors = [];
    
    if (isNaN(page) || page < 1) {
        errors.push("رقم الصفحة يجب أن يكون رقم صحيح أكبر من 0");
    }
    
    if (isNaN(limit) || limit < 1 || limit > 100) {
        errors.push("عدد العناصر يجب أن يكون بين 1 و 100");
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

// دالة validation للكود
const validateCode = (code) => {
    const codeNum = parseInt(code);
    return {
        isValid: !isNaN(codeNum) && codeNum > 0,
        value: codeNum,
        error: isNaN(codeNum) ? "كود غير صحيح" : codeNum <= 0 ? "الكود يجب أن يكون أكبر من 0" : null
    };
};

// ✅ GET كل الحسابات (عملاء + موردين)
router.get("/", async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 5, 100);
        
        // Validation
        const validation = validatePaginationParams(page, limit);
        if (!validation.isValid) {
            return res.status(400).json({ 
                error: "بيانات غير صحيحة", 
                details: validation.errors 
            });
        }
        
        const baseQuery = `
            SELECT * FROM account_add
            ORDER BY code ASC 
            OFFSET @offset ROWS 
            FETCH NEXT @limit ROWS ONLY;
        `;
        
        const countQuery = `SELECT COUNT(*) AS total FROM account_add;`;
        
        const result = await executePaginatedQuery(baseQuery, countQuery, page, limit, pool);
        
        res.json({
            accounts: result.data,
            pagination: result.pagination
        });

    } catch (err) {
        console.error("❌ Error fetching accounts:", err);
        res.status(500).json({ 
            error: "خطأ في الخادم", 
            message: "فشل في جلب بيانات الحسابات" 
        });
    }
});

// ✅ GET كل العملاء
router.get("/customers", async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; 
        const limit = Math.min(parseInt(req.query.limit) || 5, 100);
        
        const baseQuery = `
            SELECT * FROM account_show 
            WHERE acc_kind = 0
            ORDER BY code ASC 
            OFFSET @offset ROWS 
            FETCH NEXT @limit ROWS ONLY;
        `;
        
        const countQuery = `SELECT COUNT(*) AS total FROM account_show WHERE acc_kind = 0;`;
        
        const result = await executePaginatedQuery(baseQuery, countQuery, page, limit, pool);
        
        res.json({
            customers: result.data,
            pagination: result.pagination
        });
    } catch (err) {
        console.error("❌ Error fetching customers:", err);
        res.status(500).json({ error: "Database fetch failed" });
    }
});

// ✅ GET كل الموردين
router.get("/suppliers", async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; 
        const limit = Math.min(parseInt(req.query.limit) || 6, 100);
        
        const baseQuery = `
            SELECT * FROM account_add 
            WHERE acc_kind = 1
            ORDER BY code ASC 
            OFFSET @offset ROWS 
            FETCH NEXT @limit ROWS ONLY;
        `;
        
        const countQuery = `SELECT COUNT(*) AS total FROM account_add WHERE acc_kind = 1;`;
        
        const result = await executePaginatedQuery(baseQuery, countQuery, page, limit, pool);
        
        res.json({
            suppliers: result.data,
            pagination: result.pagination
        });
    } catch (err) {
        console.error("❌ Error fetching suppliers:", err);
        res.status(500).json({ error: "Database fetch failed" });
    }
});

// (ملف عميل ) ✅ GET حركة حساب برقم الكود
router.get("/:code/transactions", async (req, res) => {
  try {
    const { code } = req.params;

    const result = await pool.request()
      .input("code", sql.Int, code)
      .query(`
        SELECT t.*, a.acc_name
        FROM account_trans t
        INNER JOIN account_add a ON t.code = a.code
        WHERE t.code = @code
        ORDER BY t.trans_date DESC
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error("❌ Error fetching account transactions:", err);
    res.status(500).json({ error: "Database fetch failed" });
  }
});

// ✅ GET تقرير أرصدة الحسابات
router.get("/balances/all", async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT 
        a.code,
        a.acc_name,
        a.acc_kind,
        a.acc_Balance_open,
        ISNULL(SUM(t.trans_debit), 0) AS total_debit,
        ISNULL(SUM(t.trans_credit), 0) AS total_credit,
        a.acc_Balance_open + ISNULL(SUM(t.trans_debit), 0) - ISNULL(SUM(t.trans_credit), 0) AS balance
      FROM account_add a
      LEFT JOIN account_trans t ON a.code = t.code
      GROUP BY a.code, a.acc_name, a.acc_kind, a.acc_Balance_open
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error("❌ Error fetching accounts balances:", err);
    res.status(500).json({ error: "Database fetch failed" });
  }
});

// ✅ GET تقرير أرصدة العملاء فقط
router.get("/balances/customers", async (req, res) => {
  try {
        // تحديد متغيرات الـ pagination
        const page = parseInt(req.query.page) || 1; 
        const limit = parseInt(req.query.limit) || 5;
        const offset = (page - 1) * limit;

        // استعلام للحصول على العدد الإجمالي للعملاء
        const countQuery = `
            SELECT COUNT(*) AS total
            FROM (
                SELECT a.code
                FROM account_add a
                WHERE a.acc_kind = 0
                GROUP BY a.code
            ) AS CustomerCount;
        `;
        const totalResult = await pool.request().query(countQuery);
        const totalCustomers = totalResult.recordset[0].total;
        
        // حساب إجمالي عدد الصفحات
        const totalPages = Math.ceil(totalCustomers / limit);

        // استعلام لجلب أرصدة العملاء للصفحة المطلوبة
        const result = await pool.request()
            .input('offset', sql.Int, offset)
            .input('limit', sql.Int, limit)
            .query(`
      SELECT 
        a.code,
        a.acc_name,
        a.acc_Balance_open,
        ISNULL(SUM(t.trans_debit), 0) AS total_debit,
        ISNULL(SUM(t.trans_credit), 0) AS total_credit,
        a.acc_Balance_open + ISNULL(SUM(t.trans_debit), 0) - ISNULL(SUM(t.trans_credit), 0) AS balance
      FROM account_add a
      LEFT JOIN account_trans t ON a.code = t.code
      WHERE a.acc_kind = 0
      GROUP BY a.code, a.acc_name, a.acc_Balance_open
                ORDER BY a.code ASC
                OFFSET @offset ROWS
                FETCH NEXT @limit ROWS ONLY;
            `);

        res.json({
            balances: result.recordset,
            pagination: {
                totalCustomers: totalCustomers,
                totalPages: totalPages,
                currentPage: page,
                itemsPerPage: limit
            }
        });
  } catch (err) {
    console.error("❌ Error fetching customers balances:", err);
    res.status(500).json({ error: "Database fetch failed" });
  }
});

// ✅ GET تقرير أرصدة الموردين فقط
router.get("/balances/suppliers", async (req, res) => {
  try {
        // تحديد متغيرات الـ pagination
        const page = parseInt(req.query.page) || 1; 
        const limit = parseInt(req.query.limit) || 5;
        const offset = (page - 1) * limit;

        // استعلام للحصول على العدد الإجمالي للموردين
        const countQuery = `
            SELECT COUNT(*) AS total
            FROM (
                SELECT a.code
                FROM account_add a
                WHERE a.acc_kind = 1
                GROUP BY a.code
            ) AS SupplierCount;
        `;
        const totalResult = await pool.request().query(countQuery);
        const totalSuppliers = totalResult.recordset[0].total;
        
        // حساب إجمالي عدد الصفحات
        const totalPages = Math.ceil(totalSuppliers / limit);

        // استعلام لجلب أرصدة الموردين للصفحة المطلوبة
        const result = await pool.request()
            .input('offset', sql.Int, offset)
            .input('limit', sql.Int, limit)
            .query(`
      SELECT 
        a.code,
        a.acc_name,
        a.acc_Balance_open,
        ISNULL(SUM(t.trans_debit), 0) AS total_debit,
        ISNULL(SUM(t.trans_credit), 0) AS total_credit,
        a.acc_Balance_open + ISNULL(SUM(t.trans_debit), 0) - ISNULL(SUM(t.trans_credit), 0) AS balance
      FROM account_add a
      LEFT JOIN account_trans t ON a.code = t.code
      WHERE a.acc_kind = 1
      GROUP BY a.code, a.acc_name, a.acc_Balance_open
                ORDER BY a.code ASC
                OFFSET @offset ROWS
                FETCH NEXT @limit ROWS ONLY;
            `);

        res.json({
            balances: result.recordset,
            pagination: {
                totalSuppliers: totalSuppliers,
                totalPages: totalPages,
                currentPage: page,
                itemsPerPage: limit
            }
        });
  } catch (err) {
    console.error("❌ Error fetching suppliers balances:", err);
    res.status(500).json({ error: "Database fetch failed" });
  }
});

// GET ارصده تعدت حد الاتمان
router.get("/over-credit", async (req, res) => {
  try {
        // تحديد متغيرات الـ pagination
        const page = parseInt(req.query.page) || 1; 
        const limit = parseInt(req.query.limit) || 5;
        const offset = (page - 1) * limit;

        // استعلام للحصول على العدد الإجمالي للحسابات التي تجاوزت الحد الائتماني
        const countQuery = `
            SELECT COUNT(*) AS total
            FROM (
                SELECT a.code
                FROM account_add a
                LEFT JOIN account_trans t ON a.code = t.code
                GROUP BY a.code, a.acc_name, a.acc_Balance_open, a.acc_Credit
                HAVING 
                    a.acc_Credit > 0
                    AND (a.acc_Balance_open + ISNULL(SUM(t.trans_debit), 0) - ISNULL(SUM(t.trans_credit), 0)) > a.acc_Credit
            ) AS OverCreditCount;
        `;
        const totalResult = await pool.request().query(countQuery);
        const totalOverCredit = totalResult.recordset[0].total;
        
        // حساب إجمالي عدد الصفحات
        const totalPages = Math.ceil(totalOverCredit / limit);

        // استعلام لجلب بيانات الحسابات التي تجاوزت الحد الائتماني للصفحة المطلوبة
        const result = await pool.request()
            .input('offset', sql.Int, offset)
            .input('limit', sql.Int, limit)
            .query(`
                SELECT 
  a.code,
  a.acc_name,
  a.acc_Balance_open,
  ISNULL(SUM(t.trans_debit), 0) AS total_debit,
  ISNULL(SUM(t.trans_credit), 0) AS total_credit,
  a.acc_Balance_open + ISNULL(SUM(t.trans_debit), 0) - ISNULL(SUM(t.trans_credit), 0) AS balance,
  a.acc_Credit
FROM account_add a
LEFT JOIN account_trans t ON a.code = t.code
GROUP BY a.code, a.acc_name, a.acc_Balance_open, a.acc_Credit
HAVING 
                    a.acc_Credit > 0
                    AND (a.acc_Balance_open + ISNULL(SUM(t.trans_debit), 0) - ISNULL(SUM(t.trans_credit), 0)) > a.acc_Credit
                ORDER BY a.code ASC
                OFFSET @offset ROWS
                FETCH NEXT @limit ROWS ONLY;
            `);

        res.json({
            accounts: result.recordset,
            pagination: {
                totalAccounts: totalOverCredit,
                totalPages: totalPages,
                currentPage: page,
                itemsPerPage: limit
            }
        });
  } catch (err) {
    console.error("❌ Error fetching accounts over credit:", err);
    res.status(500).json({ error: "Database fetch failed" });
  }
});



// ارباح العملاء
router.get("/profits", async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; 
        const limit = Math.min(parseInt(req.query.limit) || 5, 100);
        
        const baseQuery = `
            SELECT 
                il.Accounts_code,
                il.Accounts_name,
                COUNT(*) as invoice_count,
                SUM(il.item_count) as total_items,
                SUM(il.item_earn * il.item_count) as total_earn,
                SUM(ia.buy * il.item_count) as total_cost,
                SUM((il.item_earn - ia.buy) * il.item_count) AS total_profit
            FROM invoice_list il
            INNER JOIN item_add ia ON il.code = ia.code
            GROUP BY il.Accounts_code, il.Accounts_name
            ORDER BY total_profit DESC
            OFFSET @offset ROWS
            FETCH NEXT @limit ROWS ONLY;
        `;
        
        const countQuery = `
            SELECT COUNT(*) AS total
            FROM (
                SELECT il.Accounts_code
                FROM invoice_list il
                INNER JOIN item_add ia ON il.code = ia.code
                GROUP BY il.Accounts_code, il.Accounts_name
            ) AS ProfitCount;
        `;
        
        const result = await executePaginatedQuery(baseQuery, countQuery, page, limit, pool);
        
        res.json({
            profits: result.data,
            pagination: result.pagination
        });
    } catch (err) {
        console.error("❌ Error fetching customer profits:", err);
        res.status(500).json({ error: "Server Error" });
    }
});

// ارباح عميل معين
router.get("/profits/:code", async (req, res) => {
  try {
    const { code } = req.params;
    
    // Validation
    const codeValidation = validateCode(code);
    if (!codeValidation.isValid) {
      return res.status(400).json({ 
        error: "بيانات غير صحيحة", 
        message: codeValidation.error 
      });
    }
    
    const customerCode = codeValidation.value;
    console.log(`Fetching profits for customer code: ${customerCode}`);

    // أولاً نفحص إذا كان العميل موجود في جدول invoice_list
    const checkCustomerQuery = `
      SELECT DISTINCT Accounts_code, Accounts_name 
      FROM invoice_list 
      WHERE Accounts_code = @code
    `;
    
    const customerCheck = await pool.request()
      .input("code", sql.Int, customerCode)
      .query(checkCustomerQuery);
    
    if (customerCheck.recordset.length === 0) {
      return res.status(404).json({ 
        message: "لا توجد بيانات مبيعات لهذا العميل",
        customerCode: customerCode 
      });
    }

    // استعلام الأرباح مع تحسين الأداء
    const result = await pool.request()
      .input("code", sql.Int, customerCode)
      .query(`
        SELECT 
          il.Accounts_code,
          il.Accounts_name,
          COUNT(*) as invoice_count,
          SUM(il.item_count) as total_items,
          SUM(il.item_earn * il.item_count) as total_earn,
          SUM(ia.buy * il.item_count) as total_cost,
          SUM((il.item_earn - ia.buy) * il.item_count) AS total_profit
        FROM invoice_list il
        INNER JOIN item_add ia ON il.code = ia.code
        WHERE il.Accounts_code = @code
        GROUP BY il.Accounts_code, il.Accounts_name
      `);

    console.log(`Query result for customer ${customerCode}:`, result.recordset);
    res.json({
      customer: result.recordset[0] || null,
      message: result.recordset.length > 0 ? "تم جلب البيانات بنجاح" : "لا توجد أرباح محسوبة"
    });
  } catch (err) {
    console.error("Error fetching specific customer profit:", err);
    res.status(500).json({ 
      error: "خطأ في الخادم", 
      message: "فشل في جلب أرباح العميل" 
    });
  }
});

// ✅ GET كل المدينين (حسابات برصيد موجب)
router.get("/debtors", async (req, res) => {
    try {
        // تحديد متغيرات الـ pagination
        const page = parseInt(req.query.page) || 1; 
        const limit = parseInt(req.query.limit) || 5;
        const offset = (page - 1) * limit;

        // استعلام للحصول على إجمالي عدد المدينين
        const countQuery = `
            SELECT COUNT(*) AS total FROM account_show WHERE balance > 0;
        `;
        const totalResult = await pool.request().query(countQuery);
        const totalDebtors = totalResult.recordset[0].total;
        
        // حساب إجمالي عدد الصفحات
        const totalPages = Math.ceil(totalDebtors / limit);

        // استعلام لجلب بيانات المدينين للصفحة المطلوبة
        const result = await pool.request()
            .input('offset', sql.Int, offset)
            .input('limit', sql.Int, limit)
            .query(`
                SELECT * FROM account_show 
                WHERE balance > 0
                ORDER BY code ASC 
                OFFSET @offset ROWS 
                FETCH NEXT @limit ROWS ONLY;
            `);

        res.json({
            debtors: result.recordset,
            pagination: {
                totalDebtors: totalDebtors,
                totalPages: totalPages,
                currentPage: page,
                itemsPerPage: limit
            }
        });
    } catch (err) {
        console.error("❌ Error fetching debtors:", err);
        res.status(500).json({ error: "Database fetch failed" });
    }
});

// // ✅ GET مدين معين بالكود (حساب برصيد موجب)
// router.get("/debtors/:code", async (req, res) => {
//   try {
//     const { code } = req.params;
//     const accountCode = parseInt(code);
    
//     const result = await pool.request()
//       .input("code", sql.Int, accountCode)
//       .query("SELECT * FROM account_show WHERE balance > 0 AND code = @code");
    
//     res.json(result.recordset);
//   } catch (err) {
//     console.error("❌ Error fetching specific debtor:", err);
//     res.status(500).json({ error: "Database fetch failed" });
//   }
// });

// ✅ GET كل الدائنين (حسابات برصيد سالب)
router.get("/creditors", async (req, res) => {
  try {
    const result = await pool.request().query("SELECT * FROM account_show WHERE balance < 0");
    res.json(result.recordset);
  } catch (err) {
    console.error("❌ Error fetching creditors:", err);
    res.status(500).json({ error: "Database fetch failed" });
  }
});

// // ✅ GET دائن معين بالكود (حساب برصيد سالب)
// router.get("/creditors/:code", async (req, res) => {
//   try {
//     const { code } = req.params;
//     const accountCode = parseInt(code);
    
//     const result = await pool.request()
//       .input("code", sql.Int, accountCode)
//       .query("SELECT * FROM account_show WHERE balance < 0 AND code = @code");
    
//     res.json(result.recordset);
//   } catch (err) {
//     console.error("❌ Error fetching specific creditor:", err);
//     res.status(500).json({ error: "Database fetch failed" });
//   }
// });


// ✅ GET حركة حساب مع الأصناف لفترة معينة
router.get("/:code/items-movement", async (req, res) => {
  try {
    const { code } = req.params;
    const { date_from, date_to } = req.query;

    if (!date_from || !date_to) {
      return res.status(400).json({ error: "يرجى إرسال date_from و date_to كـ Query Params" });
    }

    const result = await pool.request()
      .input("acc_code", sql.Int, code)
      .input("date_from", sql.Date, date_from)
      .input("date_to", sql.Date, date_to)
      .query(`
        SELECT 
          im.trans_Statement,
          im.trans_number,
          im.trans_date,
          im.trans_ward,
          im.trans_monsrf,
          im.item_price,
          im.item_total,
          ia.item_ar,
          s.sec_name,
          s.sec_s1,
          s.sec_phone,
          s.sec_number,
          s.sec_web,
          s.sec_address,
          s.sec_email,
          s.sec_s2
        FROM item_movement im
        INNER JOIN item_add ia ON im.code = ia.code
        CROSS JOIN (SELECT TOP 1 * FROM section) s
        WHERE im.acc_code = @acc_code
          AND im.trans_date BETWEEN @date_from AND @date_to
        ORDER BY im.trans_date ASC
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "لا يوجد بيانات" });
    }

    res.json(result.recordset);

  } catch (err) {
    console.error("❌ Error fetching account item movement:", err);
    res.status(500).json({ error: "Database fetch failed" });
  }
});



// ✅ GET حركة حساب مع صنف معين لفترة معينة
router.get("/:acc_code/item/:item_code/movement", async (req, res) => {
  try {
    const { acc_code, item_code } = req.params;
    const { date_from, date_to } = req.query;

    if (!date_from || !date_to) {
      return res.status(400).json({ error: "يرجى إرسال date_from و date_to كـ Query Params" });
    }

    // هنجلب البيانات من جدول item_movement + بيانات الصنف + بيانات الحساب + بيانات الشركة (section)
    const result = await pool.request()
      .input("acc_code", sql.Int, acc_code)
      .input("item_code", sql.Int, item_code)
      .input("date_from", sql.Date, date_from)
      .input("date_to", sql.Date, date_to)
      .query(`
        SELECT 
          im.trans_Statement,
          im.trans_number,
          im.trans_date,
          im.trans_ward,
          im.trans_monsrf,
          im.item_price,
          im.item_total,
          a.acc_name,
          ia.item_ar,
          s.sec_name,
          s.sec_s1,
          s.sec_phone,
          s.sec_number,
          s.sec_web,
          s.sec_address,
          s.sec_email,
          s.sec_s2,
          s.sec_pic
        FROM item_movement im
        INNER JOIN item_add ia ON im.code = ia.code
        INNER JOIN account_add a ON im.acc_code = a.code
        CROSS JOIN (SELECT TOP 1 * FROM section) s
        WHERE im.acc_code = @acc_code
          AND im.code = @item_code
          AND im.trans_date BETWEEN @date_from AND @date_to
        ORDER BY im.trans_date ASC
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "لا يوجد بيانات" });
    }

    // ✅ حساب الرصيد التراكمي زي ما عامل في VB.NET
    let runningBalance = 0;
    const movements = result.recordset.map((row) => {
      if (row.trans_ward > 0) {
        runningBalance += row.trans_ward;
      } else if (row.trans_monsrf > 0) {
        runningBalance -= row.trans_monsrf;
      }

      return {
        trans_Statement: row.trans_Statement,
        trans_number: row.trans_number,
        trans_date: row.trans_date,
        ward: row.trans_ward,
        monsrf: row.trans_monsrf,
        item_price: row.item_price,
        item_total: row.item_total,
        balance: runningBalance,
        acc_name: row.acc_name,
        item_name: row.item_ar,
        section: {
          name: row.sec_name,
          s1: row.sec_s1,
          phone: row.sec_phone,
          number: row.sec_number,
          web: row.sec_web,
          address: row.sec_address,
          email: row.sec_email,
          s2: row.sec_s2,
          pic: row.sec_pic
        }
      };
    });

    res.json(movements);

  } catch (err) {
    console.error("❌ Error fetching account item movement:", err);
    res.status(500).json({ error: "Database fetch failed" });
  }
});







module.exports = router;
