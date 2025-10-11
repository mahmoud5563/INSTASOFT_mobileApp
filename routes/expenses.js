// routes/expenses.js - API لجلب المصاريف من قاعدة البيانات

const express = require("express");
const router = express.Router();
const { pool, sql, executeQuery } = require("../config/db");

// دالة مساعدة للتحقق من صحة معاملات الصفحات
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

// دالة مساعدة لتنفيذ الاستعلامات مع الصفحات
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

// ✅ GET جميع المصاريف مع تفاصيلها
router.get("/", async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 10, 100);
        
        const validation = validatePaginationParams(page, limit);
        if (!validation.isValid) {
            return res.status(400).json({ 
                error: "بيانات غير صحيحة", 
                details: validation.errors 
            });
        }

        // استعلام لجلب بيانات المصاريف الأساسية
        const baseQuery = `
            SELECT 
                ea.invoice_number,
                ea.Expenses_date,
                ea.treasury_view,
                ea.total_expenses,
                ea.user_name
            FROM Expenses_add ea
            ORDER BY ea.Expenses_date DESC, ea.invoice_number DESC
            OFFSET @offset ROWS 
            FETCH NEXT @limit ROWS ONLY;
        `;
        
        const countQuery = `SELECT COUNT(*) AS total FROM Expenses_add;`;
        
        const result = await executePaginatedQuery(baseQuery, countQuery, page, limit);
        
        // جلب تفاصيل المصاريف لكل فاتورة
        const expensesWithDetails = await Promise.all(
            result.data.map(async (expense) => {
                try {
                    console.log(`🔍 Fetching details for invoice: ${expense.invoice_number} (type: ${typeof expense.invoice_number})`);
                    
                    const detailsQuery = `
                        SELECT 
                            el.Exp_name,
                            el.Exp_note,
                            el.Exp_money
                        FROM expenses_list el
                        WHERE el.invoice_number = @invoice_number
                        ORDER BY el.Exp_name;
                    `;
                    
                    const detailsResult = await pool.request()
                        .input('invoice_number', sql.Int, expense.invoice_number)
                        .query(detailsQuery);
                    
                    console.log(`📊 Found ${detailsResult.recordset.length} details for invoice ${expense.invoice_number}`);
                    
                    return {
                        ...expense,
                        expenses_details: detailsResult.recordset
                    };
                } catch (detailError) {
                    console.error(`❌ Error fetching details for invoice ${expense.invoice_number}:`, detailError.message);
                    return {
                        ...expense,
                        expenses_details: []
                    };
                }
            })
        );
        
        res.json({
            expenses: expensesWithDetails,
            pagination: result.pagination
        });

    } catch (err) {
        console.error("❌ Error fetching expenses:", err.message);
        console.error("❌ Full error:", err);
        
        res.status(500).json({ 
            error: "خطأ في الخادم", 
            message: "فشل في جلب بيانات المصاريف",
            details: err.message
        });
    }
});

// ✅ GET مصاريف فاتورة معينة
router.get("/:invoice_number", async (req, res) => {
    try {
        const { invoice_number } = req.params;
        
        if (!invoice_number || invoice_number.trim() === '') {
            return res.status(400).json({ 
                error: "بيانات غير صحيحة", 
                message: "رقم الفاتورة مطلوب" 
            });
        }

        // جلب بيانات الفاتورة الأساسية
        const expenseQuery = `
            SELECT 
                ea.invoice_number,
                ea.Expenses_date,
                ea.treasury_view,
                ea.total_expenses,
                ea.user_name
            FROM Expenses_add ea
            WHERE ea.invoice_number = @invoice_number;
        `;
        
        const expenseResult = await pool.request()
            .input('invoice_number', sql.Int, invoice_number)
            .query(expenseQuery);
        
        if (expenseResult.recordset.length === 0) {
            return res.status(404).json({ 
                error: "غير موجود", 
                message: "لا توجد فاتورة مصاريف بهذا الرقم" 
            });
        }

        // جلب تفاصيل المصاريف
        const detailsQuery = `
            SELECT 
                el.Exp_name,
                el.Exp_note,
                el.Exp_money
            FROM expenses_list el
            WHERE el.invoice_number = @invoice_number
            ORDER BY el.Exp_name;
        `;
        
        const detailsResult = await pool.request()
            .input('invoice_number', sql.Int, invoice_number)
            .query(detailsQuery);
        
        const expense = expenseResult.recordset[0];
        expense.expenses_details = detailsResult.recordset;
        
        res.json({
            expense: expense
        });

    } catch (err) {
        console.error("❌ Error fetching expense details:", err.message);
        res.status(500).json({ 
            error: "خطأ في الخادم", 
            message: "فشل في جلب تفاصيل الفاتورة",
            details: err.message
        });
    }
});



// ✅ GET إحصائيات المصاريف
router.get("/summary", async (req, res) => {
    try {
        const statsQuery = `
            SELECT 
                COUNT(*) as total_invoices,
                SUM(ea.total_expenses) as total_amount,
                AVG(ea.total_expenses) as average_amount,
                MIN(ea.Expenses_date) as earliest_date,
                MAX(ea.Expenses_date) as latest_date
            FROM Expenses_add ea;
        `;
        
        const result = await pool.request().query(statsQuery);
        
        res.json({
            summary: result.recordset[0]
        });

    } catch (err) {
        console.error("❌ Error fetching expenses summary:", err.message);
        res.status(500).json({ 
            error: "خطأ في الخادم", 
            message: "فشل في جلب إحصائيات المصاريف",
            details: err.message
        });
    }
});

module.exports = router;
