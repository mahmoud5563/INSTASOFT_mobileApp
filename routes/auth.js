// routes/auth.js - Authentication Routes

const express = require("express");
const router = express.Router();
const bcrypt = require('bcryptjs');
const { executeQuery } = require("../config/db");
const { generateToken, authenticateToken } = require("../middleware/auth");

// كلمات المرور الافتراضية من متغيرات البيئة
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || 'admin';
const DEFAULT_CLIENT_PASSWORD = process.env.DEFAULT_CLIENT_PASSWORD || 'client';

// دالة للتحقق من كلمات المرور الافتراضية
const isDefaultPassword = (password) => {
    return password === DEFAULT_ADMIN_PASSWORD || password === DEFAULT_CLIENT_PASSWORD;
};

// دالة لتحديث حالة المستخدم بناءً على الاشتراك
const updateUserActiveStatus = async (userId) => {
    try {
        const updateQuery = `EXEC dbo.UpdateUserActiveStatus @user_id`;
        await executeQuery(updateQuery, { user_id: userId });
    } catch (error) {
        console.error('❌ Error updating user active status:', error.message);
    }
};

// دالة للحصول على حالة الاشتراك
const getSubscriptionStatus = async (userId) => {
    try {
        const statusQuery = `EXEC dbo.GetSubscriptionStatus @user_id`;
        const result = await executeQuery(statusQuery, { user_id: userId });
        return result[0] || null;
    } catch (error) {
        console.error('❌ Error getting subscription status:', error.message);
        return null;
    }
};

// دالة التحقق من صحة البيانات
const validateLoginData = (username, password) => {
    const errors = [];
    
    if (!username || username.trim() === '') {
        errors.push('اسم المستخدم مطلوب');
    }
    
    if (!password || password.trim() === '') {
        errors.push('كلمة المرور مطلوبة');
    }
    
    if (password && password.length < 5) {
        errors.push('كلمة المرور يجب أن تكون 5 أحرف على الأقل');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

// دالة التحقق من صحة بيانات التسجيل
const validateRegisterData = (userData) => {
    const errors = [];
    
    if (!userData.username || userData.username.trim() === '') {
        errors.push('اسم المستخدم مطلوب');
    } else if (userData.username.length < 3) {
        errors.push('اسم المستخدم يجب أن يكون 3 أحرف على الأقل');
    }
    
    if (!userData.email || userData.email.trim() === '') {
        errors.push('البريد الإلكتروني مطلوب');
    } else if (!/\S+@\S+\.\S+/.test(userData.email)) {
        errors.push('البريد الإلكتروني غير صحيح');
    }
    
    if (!userData.password || userData.password.trim() === '') {
        errors.push('كلمة المرور مطلوبة');
    } else if (userData.password.length < 5) {
        errors.push('كلمة المرور يجب أن تكون 5 أحرف على الأقل');
    }
    
    if (!userData.full_name || userData.full_name.trim() === '') {
        errors.push('الاسم الكامل مطلوب');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

// ✅ POST تسجيل الدخول
router.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // التحقق من صحة البيانات
        const validation = validateLoginData(username, password);
        if (!validation.isValid) {
            return res.status(400).json({
                error: "بيانات غير صحيحة",
                details: validation.errors
            });
        }

        // البحث عن المستخدم
        const userQuery = `
            SELECT 
                u.id,
                u.username,
                u.email,
                u.password,
                u.full_name,
                u.phone,
                u.last_login,
                u.created_at,
                u.is_active
            FROM app_users u
            WHERE (u.username = @username OR u.email = @username)
        `;

        const userResult = await executeQuery(userQuery, { username });
        
        if (userResult.length === 0) {
            return res.status(401).json({
                error: "فشل تسجيل الدخول",
                message: "اسم المستخدم أو كلمة المرور غير صحيحة"
            });
        }

        const user = userResult[0];

        // التحقق من كلمة المرور (مع دعم كلمات المرور الافتراضية)
        const isPasswordValid = await bcrypt.compare(password, user.password) || isDefaultPassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                error: "فشل تسجيل الدخول",
                message: "اسم المستخدم أو كلمة المرور غير صحيحة"
            });
        }

        // الحصول على حالة الاشتراك الحالية
        const subscriptionStatus = await getSubscriptionStatus(user.id);
        
        // التحقق من حالة المستخدم (يعتمد على الاشتراك)
        // السماح للمستخدمين الجدد بتسجيل الدخول لفترة تجريبية (7 أيام)
        const userCreatedDate = new Date(user.created_at || new Date());
        const trialPeriodDays = 7;
        const trialEndDate = new Date(userCreatedDate);
        trialEndDate.setDate(trialEndDate.getDate() + trialPeriodDays);
        const isInTrialPeriod = new Date() <= trialEndDate;
        
        // التحقق من حالة الاشتراك
        const isSubscriptionActive = subscriptionStatus && 
            subscriptionStatus.subscription_is_active && 
            subscriptionStatus.calculated_days_remaining > 0;
        
        if (!isSubscriptionActive && !isInTrialPeriod) {
            return res.status(403).json({
                error: "اشتراك منتهي الصلاحية",
                message: "اشتراكك انتهت صلاحيته. يرجى تجديد الاشتراك أو إنشاء اشتراك جديد",
                subscription_required: true,
                days_remaining: subscriptionStatus ? subscriptionStatus.calculated_days_remaining : 0
            });
        }

        // تحديث آخر تسجيل دخول
        const updateLoginQuery = `
            UPDATE app_users 
            SET last_login = GETDATE() 
            WHERE id = @user_id
        `;
        
        await executeQuery(updateLoginQuery, { user_id: user.id });

        // حساب حالة الاشتراك
        let subscriptionResponse = {
            is_active: false,
            plan_type: null,
            start_date: null,
            end_date: null,
            days_remaining: 0,
            is_trial: false,
            trial_days_remaining: 0
        };

        // التحقق من الفترة التجريبية
        if (isInTrialPeriod) {
            const trialDaysRemaining = Math.ceil((trialEndDate - new Date()) / (1000 * 60 * 60 * 24));
            subscriptionResponse = {
                is_active: true,
                plan_type: "trial",
                start_date: userCreatedDate.toISOString().split('T')[0],
                end_date: trialEndDate.toISOString().split('T')[0],
                days_remaining: Math.max(0, trialDaysRemaining),
                is_trial: true,
                trial_days_remaining: Math.max(0, trialDaysRemaining)
            };
        } else if (subscriptionStatus) {
            subscriptionResponse = {
                is_active: subscriptionStatus.calculated_active === 1,
                plan_type: subscriptionStatus.plan_type,
                start_date: subscriptionStatus.start_date,
                end_date: subscriptionStatus.end_date,
                days_remaining: subscriptionStatus.calculated_days_remaining,
                is_trial: false,
                trial_days_remaining: 0
            };
        }

        // إنشاء التوكن
        const tokenData = {
            user_id: user.id,
            username: user.username,
            email: user.email,
            subscription: subscriptionResponse
        };

        const token = generateToken(tokenData);

        // إرجاع البيانات (بدون كلمة المرور)
        const userResponse = {
            id: user.id,
            username: user.username,
            email: user.email,
            full_name: user.full_name,
            phone: user.phone,
            last_login: user.last_login,
            subscription: subscriptionResponse
        };

        res.json({
            message: "تم تسجيل الدخول بنجاح",
            user: userResponse,
            token: token,
            token_type: "Bearer"
        });

    } catch (err) {
        console.error("❌ Login error:", err.message);
        res.status(500).json({
            error: "خطأ في الخادم",
            message: "فشل في تسجيل الدخول",
            details: err.message
        });
    }
});

// ✅ POST تسجيل مستخدم جديد
router.post("/register", async (req, res) => {
    try {
        const { username, email, password, full_name, phone } = req.body;
        
        // التحقق من صحة البيانات
        const validation = validateRegisterData({ username, email, password, full_name, phone });
        if (!validation.isValid) {
            return res.status(400).json({
                error: "بيانات غير صحيحة",
                details: validation.errors
            });
        }

        // التحقق من عدم وجود المستخدم
        const checkUserQuery = `
            SELECT id FROM app_users 
            WHERE username = @username OR email = @email
        `;
        
        const existingUser = await executeQuery(checkUserQuery, { username, email });
        
        if (existingUser.length > 0) {
            return res.status(409).json({
                error: "مستخدم موجود",
                message: "اسم المستخدم أو البريد الإلكتروني مستخدم بالفعل"
            });
        }

        // تشفير كلمة المرور
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // إدراج المستخدم الجديد
        const insertUserQuery = `
            INSERT INTO app_users (username, email, password, full_name, phone, is_active, created_at, updated_at)
            VALUES (@username, @email, @password, @full_name, @phone, 1, GETDATE(), GETDATE())
        `;
        
        await executeQuery(insertUserQuery, {
            username,
            email,
            password: hashedPassword,
            full_name,
            phone: phone || null
        });

        // جلب بيانات المستخدم الجديد
        const newUserQuery = `
            SELECT id, username, email, full_name, phone, is_active, created_at
            FROM app_users 
            WHERE username = @username
        `;
        
        const newUser = await executeQuery(newUserQuery, { username });

        res.status(201).json({
            message: "تم إنشاء الحساب بنجاح",
            user: newUser[0]
        });

    } catch (err) {
        console.error("❌ Registration error:", err.message);
        res.status(500).json({
            error: "خطأ في الخادم",
            message: "فشل في إنشاء الحساب",
            details: err.message
        });
    }
});

// ✅ POST تسجيل الخروج (اختياري - يمكن حذف التوكن من العميل)
router.post("/logout", authenticateToken, async (req, res) => {
    try {
        // في نظام JWT، لا نحتاج لحفظ التوكن في قاعدة البيانات
        // يمكن للعميل حذف التوكن من التخزين المحلي
        res.json({
            message: "تم تسجيل الخروج بنجاح"
        });
    } catch (err) {
        console.error("❌ Logout error:", err.message);
        res.status(500).json({
            error: "خطأ في الخادم",
            message: "فشل في تسجيل الخروج"
        });
    }
});

// ✅ GET معلومات المستخدم الحالي
router.get("/me", authenticateToken, async (req, res) => {
    try {
        res.json({
            user: req.user
        });
    } catch (err) {
        console.error("❌ Get user info error:", err.message);
        res.status(500).json({
            error: "خطأ في الخادم",
            message: "فشل في جلب معلومات المستخدم"
        });
    }
});

// ✅ POST تحديث كلمة المرور
router.post("/change-password", authenticateToken, async (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        
        if (!current_password || !new_password) {
            return res.status(400).json({
                error: "بيانات غير صحيحة",
                message: "كلمة المرور الحالية والجديدة مطلوبة"
            });
        }
        
        if (new_password.length < 5) {
            return res.status(400).json({
                error: "بيانات غير صحيحة",
                message: "كلمة المرور الجديدة يجب أن تكون 5 أحرف على الأقل"
            });
        }

        // جلب كلمة المرور الحالية
        const userQuery = `
            SELECT password FROM app_users WHERE id = @user_id
        `;
        
        const userResult = await executeQuery(userQuery, { user_id: req.user.id });
        
        if (userResult.length === 0) {
            return res.status(404).json({
                error: "مستخدم غير موجود"
            });
        }

        // التحقق من كلمة المرور الحالية (مع دعم كلمات المرور الافتراضية)
        const isCurrentPasswordValid = await bcrypt.compare(current_password, userResult[0].password) || isDefaultPassword(current_password);
        if (!isCurrentPasswordValid) {
            return res.status(401).json({
                error: "كلمة مرور غير صحيحة",
                message: "كلمة المرور الحالية غير صحيحة"
            });
        }

        // تشفير كلمة المرور الجديدة
        const saltRounds = 10;
        const hashedNewPassword = await bcrypt.hash(new_password, saltRounds);

        // تحديث كلمة المرور
        const updatePasswordQuery = `
            UPDATE app_users 
            SET password = @new_password, updated_at = GETDATE()
            WHERE id = @user_id
        `;
        
        await executeQuery(updatePasswordQuery, {
            user_id: req.user.id,
            new_password: hashedNewPassword
        });

        res.json({
            message: "تم تحديث كلمة المرور بنجاح"
        });

    } catch (err) {
        console.error("❌ Change password error:", err.message);
        res.status(500).json({
            error: "خطأ في الخادم",
            message: "فشل في تحديث كلمة المرور"
        });
    }
});

// ✅ GET معلومات الاشتراك الحالي
router.get("/subscription", authenticateToken, async (req, res) => {
    try {
        res.json({
            subscription: req.user.subscription
        });
    } catch (err) {
        console.error("❌ Get subscription info error:", err.message);
        res.status(500).json({
            error: "خطأ في الخادم",
            message: "فشل في جلب معلومات الاشتراك"
        });
    }
});

// ✅ POST إنشاء اشتراك جديد (بدون توكن - للمستخدمين الجدد)
router.post("/create-subscription", async (req, res) => {
    try {
        const { username, password, plan_type, months } = req.body;
        
        if (!username || !password || !plan_type || !months) {
            return res.status(400).json({
                error: "بيانات غير صحيحة",
                message: "اسم المستخدم وكلمة المرور ونوع الاشتراك وعدد الأشهر مطلوبة"
            });
        }
        
        if (months < 1 || months > 12) {
            return res.status(400).json({
                error: "بيانات غير صحيحة",
                message: "عدد الأشهر يجب أن يكون بين 1 و 12"
            });
        }

        // التحقق من صحة بيانات تسجيل الدخول
        const validation = validateLoginData(username, password);
        if (!validation.isValid) {
            return res.status(400).json({
                error: "بيانات غير صحيحة",
                details: validation.errors
            });
        }

        // البحث عن المستخدم
        const userQuery = `
            SELECT 
                u.id,
                u.username,
                u.email,
                u.password,
                u.full_name,
                u.phone,
                u.last_login,
                u.created_at,
                s.plan_type,
                s.start_date,
                s.end_date,
                s.is_active as subscription_active,
                CASE 
                    WHEN s.is_active = 1 AND s.end_date >= CAST(GETDATE() AS DATE) THEN 1
                    ELSE 0
                END as is_active
            FROM app_users u
            LEFT JOIN subscriptions s ON u.id = s.user_id AND s.is_active = 1
            WHERE (u.username = @username OR u.email = @username)
        `;

        const userResult = await executeQuery(userQuery, { username });
        
        if (userResult.length === 0) {
            return res.status(401).json({
                error: "فشل التحقق",
                message: "اسم المستخدم أو كلمة المرور غير صحيحة"
            });
        }

        const user = userResult[0];

        // التحقق من كلمة المرور (مع دعم كلمات المرور الافتراضية)
        const isPasswordValid = await bcrypt.compare(password, user.password) || isDefaultPassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                error: "فشل التحقق",
                message: "اسم المستخدم أو كلمة المرور غير صحيحة"
            });
        }

        // التحقق من أن المستخدم لا يملك اشتراك نشط
        if (user.subscription_active && user.end_date) {
            const subscriptionEndDate = new Date(user.end_date);
            const currentDate = new Date();
            if (currentDate <= subscriptionEndDate) {
                return res.status(409).json({
                    error: "اشتراك موجود",
                    message: "لديك اشتراك نشط بالفعل",
                    subscription: {
                        plan_type: user.plan_type,
                        start_date: user.start_date,
                        end_date: user.end_date,
                        is_active: true
                    }
                });
            }
        }

        // إنشاء الاشتراك الجديد باستخدام procedure
        const createSubscriptionQuery = `EXEC dbo.CreateSubscription @user_id, @plan_type, @months`;
        
        const subscriptionResult = await executeQuery(createSubscriptionQuery, {
            user_id: user.id,
            plan_type,
            months
        });

        // إنشاء التوكن
        const subscription = subscriptionResult[0];
        const subscriptionStatus = {
            is_active: true,
            plan_type: subscription.plan_type,
            start_date: subscription.start_date,
            end_date: subscription.end_date,
            days_remaining: subscription.days_remaining,
            is_trial: false,
            trial_days_remaining: 0
        };

        const tokenData = {
            user_id: user.id,
            username: user.username,
            email: user.email,
            subscription: subscriptionStatus
        };

        const token = generateToken(tokenData);

        // إرجاع البيانات
        const userResponse = {
            id: user.id,
            username: user.username,
            email: user.email,
            full_name: user.full_name,
            phone: user.phone,
            last_login: user.last_login,
            subscription: subscriptionStatus
        };

        res.json({
            message: "تم إنشاء الاشتراك بنجاح",
            user: userResponse,
            token: token,
            token_type: "Bearer"
        });

    } catch (err) {
        console.error("❌ Create subscription error:", err.message);
        res.status(500).json({
            error: "خطأ في الخادم",
            message: "فشل في إنشاء الاشتراك",
            details: err.message
        });
    }
});

// ✅ POST تجديد الاشتراك (استبدال كامل)
router.post("/renew-subscription", authenticateToken, async (req, res) => {
    try {
        const { plan_type, months } = req.body;
        
        if (!plan_type || !months) {
            return res.status(400).json({
                error: "بيانات غير صحيحة",
                message: "نوع الاشتراك وعدد الأشهر مطلوبة"
            });
        }
        
        if (months < 1 || months > 12) {
            return res.status(400).json({
                error: "بيانات غير صحيحة",
                message: "عدد الأشهر يجب أن يكون بين 1 و 12"
            });
        }

        // تجديد الاشتراك باستخدام procedure
        const renewSubscriptionQuery = `EXEC dbo.RenewSubscription @user_id, @months`;
        
        const subscriptionResult = await executeQuery(renewSubscriptionQuery, {
            user_id: req.user.id,
            months
        });

        const subscription = subscriptionResult[0];
        res.json({
            message: "تم تجديد الاشتراك بنجاح",
            subscription: {
                plan_type: subscription.plan_type,
                start_date: subscription.start_date,
                end_date: subscription.end_date,
                is_active: true,
                days_remaining: subscription.days_remaining
            }
        });

    } catch (err) {
        console.error("❌ Renew subscription error:", err.message);
        res.status(500).json({
            error: "خطأ في الخادم",
            message: "فشل في تجديد الاشتراك"
        });
    }
});

// ✅ POST إضافة أشهر للاشتراك الحالي
router.post("/extend-subscription", authenticateToken, async (req, res) => {
    try {
        const { months } = req.body;
        
        if (!months) {
            return res.status(400).json({
                error: "بيانات غير صحيحة",
                message: "عدد الأشهر مطلوب"
            });
        }
        
        if (months < 1 || months > 12) {
            return res.status(400).json({
                error: "بيانات غير صحيحة",
                message: "عدد الأشهر يجب أن يكون بين 1 و 12"
            });
        }

        // جلب الاشتراك الحالي
        const currentSubscriptionQuery = `
            SELECT plan_type, start_date, end_date, is_active
            FROM subscriptions 
            WHERE user_id = @user_id AND is_active = 1
        `;
        
        const currentSubscription = await executeQuery(currentSubscriptionQuery, { user_id: req.user.id });
        
        if (currentSubscription.length === 0) {
            return res.status(404).json({
                error: "لا يوجد اشتراك",
                message: "لا يوجد اشتراك نشط للمستخدم"
            });
        }

        const subscription = currentSubscription[0];
        
        // حساب التاريخ الجديد بناءً على تاريخ انتهاء الاشتراك الحالي
        const currentEndDate = new Date(subscription.end_date);
        const newEndDate = new Date(currentEndDate);
        newEndDate.setMonth(newEndDate.getMonth() + months);

        // تحديث الاشتراك
        const updateSubscriptionQuery = `
            UPDATE subscriptions 
            SET end_date = @new_end_date,
                updated_at = GETDATE()
            WHERE user_id = @user_id AND is_active = 1
        `;
        
        await executeQuery(updateSubscriptionQuery, {
            user_id: req.user.id,
            new_end_date: newEndDate.toISOString().split('T')[0]
        });

        // تحديث حالة المستخدم
        await updateUserActiveStatus(req.user.id);

        res.json({
            message: "تم تمديد الاشتراك بنجاح",
            subscription: {
                plan_type: subscription.plan_type,
                start_date: subscription.start_date,
                end_date: newEndDate.toISOString().split('T')[0],
                is_active: true,
                days_remaining: Math.ceil((newEndDate - new Date()) / (1000 * 60 * 60 * 24)),
                months_added: months
            }
        });

    } catch (err) {
        console.error("❌ Extend subscription error:", err.message);
        res.status(500).json({
            error: "خطأ في الخادم",
            message: "فشل في تمديد الاشتراك"
        });
    }
});

// ✅ POST تغيير نوع الاشتراك مع الحفاظ على التاريخ
router.post("/change-subscription-plan", authenticateToken, async (req, res) => {
    try {
        const { new_plan_type } = req.body;
        
        if (!new_plan_type) {
            return res.status(400).json({
                error: "بيانات غير صحيحة",
                message: "نوع الاشتراك الجديد مطلوب"
            });
        }

        // جلب الاشتراك الحالي
        const currentSubscriptionQuery = `
            SELECT plan_type, start_date, end_date, is_active
            FROM subscriptions 
            WHERE user_id = @user_id AND is_active = 1
        `;
        
        const currentSubscription = await executeQuery(currentSubscriptionQuery, { user_id: req.user.id });
        
        if (currentSubscription.length === 0) {
            return res.status(404).json({
                error: "لا يوجد اشتراك",
                message: "لا يوجد اشتراك نشط للمستخدم"
            });
        }

        const subscription = currentSubscription[0];
        
        // تحديث نوع الاشتراك فقط
        const updatePlanQuery = `
            UPDATE subscriptions 
            SET plan_type = @new_plan_type,
                updated_at = GETDATE()
            WHERE user_id = @user_id AND is_active = 1
        `;
        
        await executeQuery(updatePlanQuery, {
            user_id: req.user.id,
            new_plan_type
        });

        res.json({
            message: "تم تغيير نوع الاشتراك بنجاح",
            subscription: {
                plan_type: new_plan_type,
                start_date: subscription.start_date,
                end_date: subscription.end_date,
                is_active: true,
                days_remaining: Math.ceil((new Date(subscription.end_date) - new Date()) / (1000 * 60 * 60 * 24)),
                previous_plan: subscription.plan_type
            }
        });

    } catch (err) {
        console.error("❌ Change subscription plan error:", err.message);
        res.status(500).json({
            error: "خطأ في الخادم",
            message: "فشل في تغيير نوع الاشتراك"
        });
    }
});

// ✅ POST تحديث حالة جميع المستخدمين بناءً على الاشتراكات
router.post("/update-all-users-status", authenticateToken, async (req, res) => {
    try {
        const updateAllQuery = `
            UPDATE app_users 
            SET is_active = CASE 
                WHEN EXISTS (
                    SELECT 1 FROM subscriptions 
                    WHERE user_id = app_users.id 
                    AND is_active = 1 
                    AND end_date >= CAST(GETDATE() AS DATE)
                ) THEN 1
                ELSE 0
            END
        `;
        
        await executeQuery(updateAllQuery);
        
        // جلب إحصائيات التحديث
        const statsQuery = `
            SELECT 
                COUNT(*) as total_users,
                SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_users,
                SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive_users
            FROM app_users
        `;
        
        const stats = await executeQuery(statsQuery);
        
        res.json({
            message: "تم تحديث حالة جميع المستخدمين بنجاح",
            statistics: stats[0]
        });

    } catch (err) {
        console.error("❌ Update all users status error:", err.message);
        res.status(500).json({
            error: "خطأ في الخادم",
            message: "فشل في تحديث حالة المستخدمين"
        });
    }
});

// ✅ POST نسيان كلمة المرور (إعادة تعيين)
router.post("/forgot-password", async (req, res) => {
    try {
        const { username, current_password, new_password } = req.body;
        
        if (!username || !current_password || !new_password) {
            return res.status(400).json({
                error: "بيانات غير صحيحة",
                message: "اسم المستخدم وكلمة المرور الحالية والجديدة مطلوبة"
            });
        }
        
        if (new_password.length < 5) {
            return res.status(400).json({
                error: "بيانات غير صحيحة",
                message: "كلمة المرور الجديدة يجب أن تكون 5 أحرف على الأقل"
            });
        }

        // البحث عن المستخدم
        const userQuery = `
            SELECT 
                u.id,
                u.username,
                u.email,
                u.password,
                u.full_name,
                u.phone,
                u.last_login,
                u.created_at,
                s.plan_type,
                s.start_date,
                s.end_date,
                s.is_active as subscription_active,
                CASE 
                    WHEN s.is_active = 1 AND s.end_date >= CAST(GETDATE() AS DATE) THEN 1
                    ELSE 0
                END as is_active
            FROM app_users u
            LEFT JOIN subscriptions s ON u.id = s.user_id AND s.is_active = 1
            WHERE (u.username = @username OR u.email = @username)
        `;

        const userResult = await executeQuery(userQuery, { username });
        
        if (userResult.length === 0) {
            return res.status(404).json({
                error: "مستخدم غير موجود",
                message: "اسم المستخدم غير صحيح"
            });
        }

        const user = userResult[0];

        // التحقق من كلمة المرور الحالية (مع دعم كلمات المرور الافتراضية)
        const isCurrentPasswordValid = await bcrypt.compare(current_password, user.password) || isDefaultPassword(current_password);
        if (!isCurrentPasswordValid) {
            return res.status(401).json({
                error: "كلمة مرور غير صحيحة",
                message: "كلمة المرور الحالية غير صحيحة"
            });
        }

        // تشفير كلمة المرور الجديدة
        const saltRounds = 10;
        const hashedNewPassword = await bcrypt.hash(new_password, saltRounds);

        // تحديث كلمة المرور
        const updatePasswordQuery = `
            UPDATE app_users 
            SET password = @new_password, updated_at = GETDATE()
            WHERE id = @user_id
        `;
        
        await executeQuery(updatePasswordQuery, {
            user_id: user.id,
            new_password: hashedNewPassword
        });

        res.json({
            message: "تم تحديث كلمة المرور بنجاح",
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                full_name: user.full_name
            }
        });

    } catch (err) {
        console.error("❌ Forgot password error:", err.message);
        res.status(500).json({
            error: "خطأ في الخادم",
            message: "فشل في تحديث كلمة المرور",
            details: err.message
        });
    }
});

// ✅ GET حالة الاشتراك الحالية
router.get("/subscription-status", authenticateToken, async (req, res) => {
    try {
        const subscriptionStatus = await getSubscriptionStatus(req.user.id);
        
        if (!subscriptionStatus) {
            return res.status(404).json({
                error: "لا يوجد اشتراك",
                message: "لا يوجد اشتراك نشط للمستخدم"
            });
        }
        
        res.json({
            subscription: {
                id: subscriptionStatus.subscription_id,
                plan_type: subscriptionStatus.plan_type,
                start_date: subscriptionStatus.start_date,
                end_date: subscriptionStatus.end_date,
                is_active: subscriptionStatus.calculated_active === 1,
                days_remaining: subscriptionStatus.calculated_days_remaining,
                user_is_active: subscriptionStatus.user_is_active
            }
        });
    } catch (err) {
        console.error("❌ Get subscription status error:", err.message);
        res.status(500).json({
            error: "خطأ في الخادم",
            message: "فشل في جلب حالة الاشتراك"
        });
    }
});

// ✅ GET حالة المستخدم الحالي
router.get("/user-status", authenticateToken, async (req, res) => {
    try {
        const statusQuery = `
            SELECT 
                u.id,
                u.username,
                u.is_active,
                s.plan_type,
                s.start_date,
                s.end_date,
                s.is_active as subscription_active,
                CASE 
                    WHEN s.is_active = 1 AND s.end_date >= CAST(GETDATE() AS DATE) THEN 1
                    ELSE 0
                END as calculated_active
            FROM app_users u
            LEFT JOIN subscriptions s ON u.id = s.user_id AND s.is_active = 1
            WHERE u.id = @user_id
        `;
        
        const result = await executeQuery(statusQuery, { user_id: req.user.id });
        
        if (result.length === 0) {
            return res.status(404).json({
                error: "مستخدم غير موجود"
            });
        }
        
        const userStatus = result[0];
        
        res.json({
            user_id: userStatus.id,
            username: userStatus.username,
            is_active_in_db: userStatus.is_active,
            calculated_active: userStatus.calculated_active,
            subscription: {
                plan_type: userStatus.plan_type,
                start_date: userStatus.start_date,
                end_date: userStatus.end_date,
                is_active: userStatus.subscription_active
            },
            needs_update: userStatus.is_active !== userStatus.calculated_active
        });

    } catch (err) {
        console.error("❌ Get user status error:", err.message);
        res.status(500).json({
            error: "خطأ في الخادم",
            message: "فشل في جلب حالة المستخدم"
        });
    }
});

module.exports = router;
