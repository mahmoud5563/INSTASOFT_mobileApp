const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool, sql } = require("../config/db");
const { authenticateToken } = require("../middleware/auth");

// JWT Secret Key - يجب أن يكون في متغير البيئة
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-here";

// دالة إنشاء JWT Token
const generateToken = (userId, username) => {
    return jwt.sign(
        { 
            userId, 
            username
        },
        JWT_SECRET,
        { 
            expiresIn: '24h' // انتهاء الصلاحية خلال 24 ساعة
        }
    );
};

// دالة التحقق من صحة البيانات
const validateUserData = (userData) => {
    const errors = [];
    
    if (!userData.username || userData.username.trim().length < 3) {
        errors.push("اسم المستخدم يجب أن يكون 3 أحرف على الأقل");
    }
    
    if (!userData.email || !/\S+@\S+\.\S+/.test(userData.email)) {
        errors.push("البريد الإلكتروني غير صحيح");
    }
    
    if (!userData.password || userData.password.length < 6) {
        errors.push("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
    }
    
    if (!userData.full_name || userData.full_name.trim().length < 2) {
        errors.push("الاسم الكامل يجب أن يكون حرفين على الأقل");
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
        
        // التحقق من وجود البيانات المطلوبة
        if (!username || !password) {
            return res.status(400).json({
                error: "بيانات غير مكتملة",
                message: "يرجى إدخال اسم المستخدم وكلمة المرور"
            });
        }
        
        // البحث عن المستخدم في قاعدة البيانات
        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .query(`
                SELECT id, username, email, password, full_name, is_active, last_login
                FROM users 
                WHERE username = @username AND is_active = 1
            `);
        
        if (result.recordset.length === 0) {
            return res.status(401).json({
                error: "مصادقة فاشلة",
                message: "اسم المستخدم أو كلمة المرور غير صحيحة"
            });
        }
        
        const user = result.recordset[0];
        
        // التحقق من كلمة المرور
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                error: "مصادقة فاشلة",
                message: "اسم المستخدم أو كلمة المرور غير صحيحة"
            });
        }
        
        // تحديث آخر تسجيل دخول
        await pool.request()
            .input('userId', sql.Int, user.id)
            .query('UPDATE users SET last_login = GETDATE() WHERE id = @userId');
        
        // إنشاء JWT Token
        const token = generateToken(user.id, user.username);
        
        res.json({
            message: "تم تسجيل الدخول بنجاح",
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                full_name: user.full_name,
                last_login: user.last_login
            }
        });
        
    } catch (err) {
        console.error("❌ Error during login:", err);
        res.status(500).json({
            error: "خطأ في الخادم",
            message: "فشل في تسجيل الدخول"
        });
    }
});

// ✅ POST تسجيل مستخدم جديد
router.post("/register", async (req, res) => {
    try {
        const { username, email, password, full_name, phone } = req.body;
        
        // التحقق من صحة البيانات
        const validation = validateUserData({ username, email, password, full_name });
        if (!validation.isValid) {
            return res.status(400).json({
                error: "بيانات غير صحيحة",
                details: validation.errors
            });
        }
        
        // التحقق من عدم وجود المستخدم مسبقاً
        const existingUser = await pool.request()
            .input('username', sql.NVarChar, username)
            .input('email', sql.NVarChar, email)
            .query(`
                SELECT id FROM users 
                WHERE username = @username OR email = @email
            `);
        
        if (existingUser.recordset.length > 0) {
            return res.status(409).json({
                error: "مستخدم موجود مسبقاً",
                message: "اسم المستخدم أو البريد الإلكتروني مستخدم بالفعل"
            });
        }
        
        // تشفير كلمة المرور
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // إدراج المستخدم الجديد
        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .input('email', sql.NVarChar, email)
            .input('password', sql.NVarChar, hashedPassword)
            .input('full_name', sql.NVarChar, full_name)
            .input('phone', sql.NVarChar, phone || null)
            .query(`
                INSERT INTO users (username, email, password, full_name, phone)
                OUTPUT INSERTED.id, INSERTED.username, INSERTED.email, INSERTED.full_name, INSERTED.created_at
                VALUES (@username, @email, @password, @full_name, @phone)
            `);
        
        const newUser = result.recordset[0];
        
        // إنشاء JWT Token للمستخدم الجديد
        const token = generateToken(newUser.id, newUser.username);
        
        res.status(201).json({
            message: "تم إنشاء الحساب بنجاح",
            token,
            user: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
                full_name: newUser.full_name,
                created_at: newUser.created_at
            }
        });
        
    } catch (err) {
        console.error("❌ Error during registration:", err);
        res.status(500).json({
            error: "خطأ في الخادم",
            message: "فشل في إنشاء الحساب"
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
        console.error("❌ Error fetching user data:", err);
        res.status(500).json({
            error: "خطأ في الخادم",
            message: "فشل في جلب بيانات المستخدم"
        });
    }
});

// ✅ PUT تحديث معلومات المستخدم
router.put("/me", authenticateToken, async (req, res) => {
    try {
        const { full_name, phone, email } = req.body;
        
        // التحقق من صحة البيانات
        if (email && !/\S+@\S+\.\S+/.test(email)) {
            return res.status(400).json({
                error: "بيانات غير صحيحة",
                message: "البريد الإلكتروني غير صحيح"
            });
        }
        
        // التحقق من عدم استخدام البريد الإلكتروني من قبل مستخدم آخر
        if (email) {
            const existingEmail = await pool.request()
                .input('email', sql.NVarChar, email)
                .input('userId', sql.Int, req.user.id)
                .query('SELECT id FROM users WHERE email = @email AND id != @userId');
            
            if (existingEmail.recordset.length > 0) {
                return res.status(409).json({
                    error: "بريد إلكتروني مستخدم",
                    message: "البريد الإلكتروني مستخدم من قبل مستخدم آخر"
                });
            }
        }
        
        // تحديث البيانات
        const updateFields = [];
        const inputs = { userId: { type: sql.Int, value: req.user.id } };
        
        if (full_name) {
            updateFields.push('full_name = @full_name');
            inputs.full_name = { type: sql.NVarChar, value: full_name };
        }
        
        if (phone) {
            updateFields.push('phone = @phone');
            inputs.phone = { type: sql.NVarChar, value: phone };
        }
        
        if (email) {
            updateFields.push('email = @email');
            inputs.email = { type: sql.NVarChar, value: email };
        }
        
        if (updateFields.length === 0) {
            return res.status(400).json({
                error: "لا توجد بيانات للتحديث",
                message: "يرجى إرسال بيانات للتحديث"
            });
        }
        
        updateFields.push('updated_at = GETDATE()');
        
        const request = pool.request();
        Object.keys(inputs).forEach(key => {
            request.input(key, inputs[key].type, inputs[key].value);
        });
        
        await request.query(`
            UPDATE users 
            SET ${updateFields.join(', ')}
            WHERE id = @userId
        `);
        
        res.json({
            message: "تم تحديث البيانات بنجاح"
        });
        
    } catch (err) {
        console.error("❌ Error updating user data:", err);
        res.status(500).json({
            error: "خطأ في الخادم",
            message: "فشل في تحديث البيانات"
        });
    }
});

// ✅ PUT تغيير كلمة المرور
router.put("/change-password", authenticateToken, async (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        
        if (!current_password || !new_password) {
            return res.status(400).json({
                error: "بيانات غير مكتملة",
                message: "يرجى إرسال كلمة المرور الحالية والجديدة"
            });
        }
        
        if (new_password.length < 6) {
            return res.status(400).json({
                error: "كلمة مرور ضعيفة",
                message: "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل"
            });
        }
        
        // جلب كلمة المرور الحالية
        const result = await pool.request()
            .input('userId', sql.Int, req.user.id)
            .query('SELECT password FROM users WHERE id = @userId');
        
        if (result.recordset.length === 0) {
            return res.status(404).json({
                error: "مستخدم غير موجود",
                message: "المستخدم غير موجود"
            });
        }
        
        // التحقق من كلمة المرور الحالية
        const isCurrentPasswordValid = await bcrypt.compare(current_password, result.recordset[0].password);
        if (!isCurrentPasswordValid) {
            return res.status(401).json({
                error: "كلمة مرور خاطئة",
                message: "كلمة المرور الحالية غير صحيحة"
            });
        }
        
        // تشفير كلمة المرور الجديدة
        const saltRounds = 10;
        const hashedNewPassword = await bcrypt.hash(new_password, saltRounds);
        
        // تحديث كلمة المرور
        await pool.request()
            .input('userId', sql.Int, req.user.id)
            .input('newPassword', sql.NVarChar, hashedNewPassword)
            .query('UPDATE users SET password = @newPassword, updated_at = GETDATE() WHERE id = @userId');
        
        res.json({
            message: "تم تغيير كلمة المرور بنجاح"
        });
        
    } catch (err) {
        console.error("❌ Error changing password:", err);
        res.status(500).json({
            error: "خطأ في الخادم",
            message: "فشل في تغيير كلمة المرور"
        });
    }
});

module.exports = router;