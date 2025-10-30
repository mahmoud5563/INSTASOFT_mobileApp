// middleware/auth.js - JWT Authentication Middleware

const jwt = require('jsonwebtoken');
const { executeQuery } = require('../config/db');

// JWT Secret - يجب أن يكون في ملف .env
const JWT_SECRET = process.env.JWT_SECRET ;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ;

// دالة إنشاء التوكن
const generateToken = (userData) => {
    return jwt.sign(userData, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// دالة التحقق من التوكن
const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        throw new Error('Invalid token');
    }
};

// Middleware للتحقق من التوكن
const authenticateToken = async (req, res, next) => {
    try {
        // جلب التوكن من الهيدر
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                error: 'غير مصرح',
                message: 'التوكن مطلوب للوصول '
            });
        }

        // التحقق من صحة التوكن
        const decoded = verifyToken(token);
        
        // التحقق من وجود المستخدم في قاعدة البيانات
        const userQuery = `
            SELECT 
                user_code,
                user_name,
                user_pass,
                user_power,
                user_defult_store,
                view_pay,
                treasury_view,
                user_end_day,
                user_check,
                intro_date,
                main_report
            FROM user_add
            WHERE user_code = @user_code
        `;

        const userResult = await executeQuery(userQuery, { user_code: decoded.user_code }); // ملاحظة: إذا اختلف اسم المتغير في التوكن غيره هنا وفي التوكن
        
        if (userResult.length === 0) {
            return res.status(401).json({
                error: 'غير مصرح',
                message: 'المستخدم غير موجود'
            });
        }
        const user = userResult[0];

        // التحقق من حالة المستخدم حسب user_check أو user_end_day (اختر المناسب)
        if (!user.user_check || user.user_end_day) {
            return res.status(403).json({
                error: 'مستخدم غير نشط',
                message: 'المستخدم غير مفعل أو الاشتراك منتهي',
                subscription_required: true
            });
        }

        // إعداد بيانات المستخدم للطلب
        req.user = {
            id: user.user_code,
            username: user.user_name,
            power: user.user_power,
            intro_date: user.intro_date,
            is_active: !!user.user_check
        };

        next();

    } catch (error) {
        console.error('❌ Authentication error:', error.message);
        
        if (error.message === 'Invalid token') {
            return res.status(401).json({
                error: 'غير مصرح',
                message: 'توكن غير صحيح أو منتهي الصلاحية'
            });
        }

        return res.status(500).json({
            error: 'خطأ في الخادم',
            message: 'فشل في التحقق من الهوية'
        });
    }
};

// Middleware اختياري للتحقق من نوع الاشتراك
const requireSubscription = (requiredPlan) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'غير مصرح',
                message: 'يجب تسجيل الدخول أولاً'
            });
        }

        if (!req.user.is_active) {
            return res.status(403).json({
                error: 'اشتراك غير نشط',
                message: 'يجب تفعيل الاشتراك للوصول لهذا المورد'
            });
        }

        // التحقق من نوع الاشتراك إذا كان مطلوب
        if (requiredPlan && req.user.plan_type !== requiredPlan) {
            return res.status(403).json({
                error: 'اشتراك غير مناسب',
                message: `هذا المورد يتطلب اشتراك من نوع: ${requiredPlan}`
            });
        }

        next();
    };
};

module.exports = {
    generateToken,
    verifyToken,
    authenticateToken,
    requireSubscription,
    JWT_SECRET,
    JWT_EXPIRES_IN
};
