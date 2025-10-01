const jwt = require("jsonwebtoken");
const { pool, sql } = require("../config/db");

// JWT Secret Key - يجب أن يكون في متغير البيئة
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-here";

// دالة التحقق من JWT Token
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
        
        if (!token) {
            return res.status(401).json({
                error: "غير مصرح",
                message: "يرجى إرسال رمز المصادقة"
            });
        }
        
        // التحقق من صحة الـ token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // التحقق من وجود المستخدم في قاعدة البيانات
        const result = await pool.request()
            .input('userId', sql.Int, decoded.userId)
            .query(`
                SELECT id, username, email, full_name, is_active
                FROM users 
                WHERE id = @userId AND is_active = 1
            `);
        
        if (result.recordset.length === 0) {
            return res.status(401).json({
                error: "مستخدم غير موجود",
                message: "المستخدم غير موجود أو غير نشط"
            });
        }
        
        // إضافة بيانات المستخدم للـ request
        req.user = result.recordset[0];
        next();
        
    } catch (err) {
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({
                error: "رمز مصادقة غير صحيح",
                message: "يرجى تسجيل الدخول مرة أخرى"
            });
        }
        
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: "انتهت صلاحية الرمز",
                message: "يرجى تسجيل الدخول مرة أخرى"
            });
        }
        
        console.error("❌ Error in authentication middleware:", err);
        res.status(500).json({
            error: "خطأ في الخادم",
            message: "فشل في التحقق من الهوية"
        });
    }
};

// دالة اختيارية للتحقق من أن المستخدم هو نفسه أو لديه صلاحيات خاصة
const authorizeUser = (req, res, next) => {
    const requestedUserId = parseInt(req.params.userId || req.params.id);
    const currentUserId = req.user.id;
    
    if (requestedUserId !== currentUserId) {
        return res.status(403).json({
            error: "غير مصرح",
            message: "ليس لديك صلاحية للوصول لهذه البيانات"
        });
    }
    
    next();
};

module.exports = {
    authenticateToken,
    authorizeUser
};
