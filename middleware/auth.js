// middleware/auth.js - JWT Authentication Middleware

const jwt = require('jsonwebtoken');
const { executeQuery } = require('../config/db');

// JWT Secret - يجب أن يكون في ملف .env
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

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
        
        // التحقق من وجود المستخدم في قاعدة البيانات مع حالة الاشتراك النشط فقط
        const userQuery = `
            SELECT 
                u.id,
                u.username,
                u.email,
                u.full_name,
                u.phone,
                u.last_login,
                u.created_at,
                s.plan_type,
                s.start_date,
                s.end_date,
                s.is_active as subscription_is_active,
                s.days_remaining
            FROM app_users u
            LEFT JOIN subscriptions s ON u.id = s.user_id AND s.is_active = 1
            WHERE u.id = @user_id
        `;

        const userResult = await executeQuery(userQuery, { user_id: decoded.user_id });
        
        if (userResult.length === 0) {
            return res.status(401).json({
                error: 'غير مصرح',
                message: 'المستخدم غير موجود'
            });
        }

        const user = userResult[0];

        // التحقق من حالة الاشتراك - فقط is_active = true
        if (!user.subscription_is_active || user.subscription_is_active !== true) {
            return res.status(403).json({
                error: 'اشتراك غير نشط',
                message: 'يجب عليك الاشتراك أولاً للوصول إلى النظام',
                subscription_required: true
            });
        }

        // إعداد بيانات الاشتراك
        const subscriptionStatus = {
            is_active: true,
            plan_type: user.plan_type,
            start_date: user.start_date,
            end_date: user.end_date,
            days_remaining: user.days_remaining || 0,
            is_trial: user.plan_type === 'trial',
            trial_days_remaining: user.plan_type === 'trial' ? (user.days_remaining || 0) : 0
        };

        // إضافة بيانات المستخدم للطلب
        req.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            full_name: user.full_name,
            phone: user.phone,
            subscription: subscriptionStatus
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

        if (!req.user.subscription.is_active) {
            return res.status(403).json({
                error: 'اشتراك غير نشط',
                message: 'يجب تفعيل الاشتراك للوصول لهذا المورد'
            });
        }

        // التحقق من نوع الاشتراك إذا كان مطلوب
        if (requiredPlan && req.user.subscription.plan_type !== requiredPlan) {
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
