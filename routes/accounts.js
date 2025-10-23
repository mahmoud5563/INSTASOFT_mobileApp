// routes/accounts.js - الكود مُعدَّل بالكامل ليستخدم JWT

const express = require("express");
const router = express.Router();
// تأكد من أن هذا المسار صحيح
const { pool, sql, executeQuery } = require("../config/db");
const { authenticateToken } = require("../middleware/auth"); 

// دالة مساعدة لتحسين نظام الصفحات
const executePaginatedQuery = async (baseQuery, countQuery, page, limit) => {
    const offset = (page - 1) * limit;
    
    // تنفيذ الاستعلامات بشكل متوازي
    const [dataResult, countResult] = await Promise.all([
        pool.request()
            .input('offset', sql.Int, offset)
            .input('limit', sql.Int, limit)
            .query(baseQuery),
        pool.request()
            .query(countQuery)
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

const validateCode = (code) => {
    const codeNum = parseInt(code);
    return {
        isValid: !isNaN(codeNum) && codeNum > 0,
        value: codeNum,
        error: isNaN(codeNum) ? "كود غير صحيح" : codeNum <= 0 ? "الكود يجب أن يكون أكبر من 0" : null
    };
};
// ... (نهاية الدوال المساعدة) ...


// ✅ GET كل الحسابات (عملاء + موردين) - مُعدَّل
router.get("/",  authenticateToken, async (req, res) => {
    try {
   

        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 5, 100);
        
        const validation = validatePaginationParams(page, limit);
        if (!validation.isValid) {
            return res.status(400).json({ error: "بيانات غير صحيحة", details: validation.errors });
        }
        
        const baseQuery = `
            SELECT * FROM account_add
            ORDER BY code DESC 
            OFFSET @offset ROWS 
            FETCH NEXT @limit ROWS ONLY;
        `;
        
        const countQuery = `SELECT COUNT(*) AS total FROM account_add;`;
        
        const result = await executePaginatedQuery(baseQuery, countQuery, page, limit);
        
        res.json({
            accounts: result.data,
            pagination: result.pagination
        });

    } catch (err) {
        console.error("❌ Error fetching accounts:", err.message);
        console.error("❌ Full error:", err);
        

        res.status(500).json({ 
            error: "خطأ في الخادم", 
            message: "فشل في جلب بيانات الحسابات",
            details: err.message
        });
    }
});

// ✅ GET كل العملاء - مُعدَّل
router.get("/customers", authenticateToken, async (req, res) => {
    try {
    

        const limit = Math.min(parseInt(req.query.limit) || 10, 100); 
        const lastCode = req.query.lastCode || 0; 

        const query = `
            SELECT TOP (@limit) code, acc_name, acc_phone1, acc_adress, acc_Balance_open as balance, 0 as credit, 0 as debit
            FROM account_add
            WHERE acc_kind = 0 AND code > @lastCode
            ORDER BY code ASC;
        `;

        const request = pool.request();
        request.input("limit", sql.Int, limit);
        request.input("lastCode", sql.Int, lastCode);
        
        const result = await request.query(query);

        res.json({
            customers: result.recordset,
            nextLastCode: result.recordset.length > 0 
                ? result.recordset[result.recordset.length - 1].code 
                : null
        });

    } catch (err) {
        console.error("❌ Error fetching customers:", err.message);
        res.status(500).json({ 
            error: "Database fetch failed",
            details: err.message
        });
    }
});


// ✅ GET كل الموردين - مُعدَّل
router.get("/suppliers", authenticateToken, async (req, res) => {
    try {
        // تم إزالة الحماية 

        const page = parseInt(req.query.page) || 1; 
        const limit = Math.min(parseInt(req.query.limit) || 6, 100);
        
        const baseQuery = `
            SELECT 
                code,
                acc_name,
                acc_phone1,
                acc_adress,
                acc_Balance_open as balance,
                0 as credit,
                0 as debit
            FROM account_add 
            WHERE acc_kind = 1
            ORDER BY code ASC 
            OFFSET @offset ROWS 
            FETCH NEXT @limit ROWS ONLY;
        `;
        
        const countQuery = `SELECT COUNT(*) AS total FROM account_add WHERE acc_kind = 1;`;
        
        const result = await executePaginatedQuery(baseQuery, countQuery, page, limit);
        
        res.json({
            suppliers: result.data,
            pagination: result.pagination
        });
    } catch (err) {
        console.error("❌ Error fetching suppliers:", err.message);
        res.status(500).json({ 
            error: "Database fetch failed",
            details: err.message
        });
    }
});

// (ملف عميل ) ✅ GET حركة حساب برقم الكود - مُعدَّل
router.get("/:code/transactions", authenticateToken, async (req, res) => {
    try {
        // تم إزالة الحماية 

        const { code } = req.params;

        const result = await pool.request()
            .input("code", sql.Int, code)
            .query(`
                SELECT t.*, a.acc_name
                FROM account_trans t
                INNER JOIN account_add a ON t.code = a.code
                -- فلترة الحركة بـ code الحساب
                WHERE t.code = @code 
                ORDER BY t.trans_date DESC
            `);

        res.json(result.recordset);
    } catch (err) {
        console.error("❌ Error fetching account transactions:", err.message);
        res.status(500).json({ 
            error: "Database fetch failed",
            details: err.message
        });
    }
});

// ✅ GET تقرير أرصدة الحسابات - مُعدَّل
router.get("/balances/all", authenticateToken, async (req, res) => {
    try {
        // تم إزالة الحماية 

        const result = await pool.request()
            .query(`
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
        console.error("❌ Error fetching accounts balances:", err.message);
        res.status(500).json({ 
            error: "Database fetch failed",
            details: err.message
        });
    }
});

// ✅ GET تقرير أرصدة العملاء فقط - مُعدَّل
router.get("/balances/customers", authenticateToken, async (req, res) => {
    try {
        // تم إزالة الحماية 

        // تحديد متغيرات الـ pagination
        const page = parseInt(req.query.page) || 1; 
        const limit = parseInt(req.query.limit) || 5;
        const offset = (page - 1) * limit;

        // استعلام للحصول على العدد الإجمالي للعملاء
        const countQuery = `
            SELECT COUNT(*) AS total
            FROM account_add a
            WHERE a.acc_kind = 0;
        `;
        
        const totalResult = await pool.request()
            .query(countQuery);
            
        const totalCustomers = totalResult.recordset[0].total;
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
                    acc_adress,
                    acc_phone1,
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
        console.error("❌ Error fetching customers balances:", err.message);
        res.status(500).json({ 
            error: "Database fetch failed",
            details: err.message
        });
    }
});


// ✅ GET تقرير أرصدة الموردين فقط - مُعدَّل
router.get("/balances/suppliers", authenticateToken, async (req, res) => {
    try {
        // تم إزالة الحماية 

        // تحديد متغيرات الـ pagination
        const page = parseInt(req.query.page) || 1; 
        const limit = parseInt(req.query.limit) || 5;
        const offset = (page - 1) * limit;

        // استعلام للحصول على العدد الإجمالي للموردين
        const countQuery = `
            SELECT COUNT(*) AS total
            FROM account_add a
            WHERE a.acc_kind = 1;
        `;
        
        const totalResult = await pool.request()
            .query(countQuery);
            
        const totalSuppliers = totalResult.recordset[0].total;
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
                    a.acc_adress,
                    a.acc_phone1,
                    ISNULL(SUM(t.trans_debit), 0) AS total_debit,
                    ISNULL(SUM(t.trans_credit), 0) AS total_credit,
                    a.acc_Balance_open + ISNULL(SUM(t.trans_debit), 0) - ISNULL(SUM(t.trans_credit), 0) AS balance
                FROM account_add a
                LEFT JOIN account_trans t ON a.code = t.code
                WHERE a.acc_kind = 1
                GROUP BY a.code, a.acc_name, a.acc_Balance_open, a.acc_adress, a.acc_phone1
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
        console.error("❌ Error fetching suppliers balances:", err.message);
        res.status(500).json({ 
            error: "Database fetch failed",
            details: err.message
        });
    }
});


// GET ارصده تعدت حد الاتمان - مُعدَّل
router.get("/over-credit", authenticateToken, async (req, res) => {
    try {
        // تم إزالة الحماية 

        // تحديد متغيرات الـ pagination
        const page = parseInt(req.query.page) || 1; 
        const limit = parseInt(req.query.limit) || 5;
        const offset = (page - 1) * limit;

        // استعلام للحصول على العدد الإجمالي للحسابات التي تجاوزت الحد الائتماني
        const countQuery = `
            SELECT COUNT(*) AS total
            FROM account_add a
            LEFT JOIN account_trans t ON a.code = t.code
            GROUP BY a.code, a.acc_name, a.acc_Balance_open, a.acc_Credit
            HAVING 
                a.acc_Credit > 0
                AND (a.acc_Balance_open + ISNULL(SUM(t.trans_debit), 0) - ISNULL(SUM(t.trans_credit), 0)) > a.acc_Credit;
        `;
        
        const totalResult = await pool.request()
            .query(`SELECT COUNT(*) AS total FROM (${countQuery}) AS OverCreditCount`);

        const totalOverCredit = totalResult.recordset[0].total;
        const totalPages = Math.ceil(totalOverCredit / limit);

        // استعلام لجلب بيانات الحسابات التي تجاوزت الحد الائتماني للصفحة المطلوبة
        const baseQuery = `
            SELECT 
                a.code, a.acc_name, a.acc_Balance_open, a.acc_Credit,
                ISNULL(SUM(t.trans_debit), 0) AS total_debit,
                ISNULL(SUM(t.trans_credit), 0) AS total_credit,
                a.acc_Balance_open + ISNULL(SUM(t.trans_debit), 0) - ISNULL(SUM(t.trans_credit), 0) AS balance
            FROM account_add a
            LEFT JOIN account_trans t ON a.code = t.code
            GROUP BY a.code, a.acc_name, a.acc_Balance_open, a.acc_Credit
            HAVING 
                a.acc_Credit > 0
                AND (a.acc_Balance_open + ISNULL(SUM(t.trans_debit), 0) - ISNULL(SUM(t.trans_credit), 0)) > a.acc_Credit
            ORDER BY a.code ASC
            OFFSET @offset ROWS
            FETCH NEXT @limit ROWS ONLY;
        `;
        
        const result = await pool.request()
            .input('offset', sql.Int, offset)
            .input('limit', sql.Int, limit)
            .query(baseQuery);

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


// ارباح العملاء - مُعدَّل
router.get("/profits", authenticateToken, async (req, res) => {
    try {
        // تم إزالة الحماية 

        const page = parseInt(req.query.page) || 1; 
        const limit = Math.min(parseInt(req.query.limit) || 5, 100);
        
        const baseQuery = `
            SELECT 
                il.Accounts_code, il.Accounts_name, COUNT(*) as invoice_count,
                SUM(il.item_count) as total_items, SUM(il.item_earn * il.item_count) as total_earn,
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
            SELECT COUNT(DISTINCT il.Accounts_code) AS total
            FROM invoice_list il
;
        `;
        
        const result = await executePaginatedQuery(baseQuery, countQuery, page, limit);
        
        res.json({
            profits: result.data,
            pagination: result.pagination
        });
    } catch (err) {
        console.error("❌ Error fetching customer profits:", err);
        res.status(500).json({ error: "Server Error" });
    }
});


// ارباح عميل معين - مُعدَّل
router.get("/profits/:code", authenticateToken, async (req, res) => {
    try {
        // تم إزالة الحماية 
        
        const { code } = req.params;
        
        const codeValidation = validateCode(code);
        if (!codeValidation.isValid) {
            return res.status(400).json({ error: "بيانات غير صحيحة", message: codeValidation.error });
        }
        
        const customerCode = codeValidation.value;

        // استعلام الأرباح مع فلترة الأمان
        const result = await pool.request()
            .input("code", sql.Int, customerCode)
            .query(`
                SELECT 
                    il.Accounts_code, il.Accounts_name, COUNT(*) as invoice_count,
                    SUM((il.item_earn - ia.buy) * il.item_count) AS total_profit
                FROM invoice_list il
                INNER JOIN item_add ia ON il.code = ia.code
                WHERE il.Accounts_code = @code
                GROUP BY il.Accounts_code, il.Accounts_name
            `);

        res.json({
            customer: result.recordset[0] || null,
            message: result.recordset.length > 0 ? "تم جلب البيانات بنجاح" : "لا توجد أرباح محسوبة"
        });
    } catch (err) {
        console.error("Error fetching specific customer profit:", err);
        res.status(500).json({ error: "خطأ في الخادم", message: "فشل في جلب أرباح العميل" });
    }
});


// ... (بقية الدوال المدينين والدائنين وحركة الأصناف تحتاج نفس التعديل) ...

module.exports = router;