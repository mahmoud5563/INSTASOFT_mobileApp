# نظام المصادقة (Authentication System)

## نظرة عامة
تم إنشاء نظام مصادقة كامل باستخدام JWT (JSON Web Tokens) مع قاعدة بيانات SQL Server.

## الملفات المضافة/المعدلة

### 1. قاعدة البيانات
- **ملف SQL**: `create_users_table.sql` - يحتوي على إنشاء جدول المستخدمين
- **الجدول**: `users` - يحتوي على بيانات المستخدمين

### 2. ملفات المصادقة
- **`routes/auth.js`** - يحتوي على جميع endpoints للمصادقة
- **`middleware/auth.js`** - middleware للتحقق من JWT tokens
- **`server.js`** - تم إضافة auth routes

### 3. التبعيات المضافة
- `jsonwebtoken` - لإنشاء والتحقق من JWT tokens
- `bcryptjs` - لتشفير كلمات المرور

## كيفية الاستخدام

### 1. إعداد قاعدة البيانات
قم بتشغيل ملف `create_users_table.sql` في قاعدة البيانات لإنشاء جدول المستخدمين.

### 2. إعداد متغيرات البيئة
أضف هذه المتغيرات في ملف `.env`:
```env
JWT_SECRET=your-super-secret-jwt-key-here
```

### 3. تشغيل الخادم
```bash
npm start
```

## API Endpoints

### تسجيل الدخول
```
POST /api/auth/login
Content-Type: application/json

{
    "username": "admin",
    "password": "admin123"
}
```

### تسجيل مستخدم جديد
```
POST /api/auth/register
Content-Type: application/json

{
    "username": "newuser",
    "email": "user@example.com",
    "password": "password123",
    "full_name": "اسم المستخدم",
    "phone": "01234567890"
}
```

### الحصول على معلومات المستخدم الحالي
```
GET /api/auth/me
Authorization: Bearer YOUR_JWT_TOKEN
```

### تحديث معلومات المستخدم
```
PUT /api/auth/me
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
    "full_name": "الاسم الجديد",
    "phone": "01234567890",
    "email": "newemail@example.com"
}
```

### تغيير كلمة المرور
```
PUT /api/auth/change-password
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
    "current_password": "password123",
    "new_password": "newpassword123"
}
```

## المستخدمين الافتراضيين

### مدير النظام
- **اسم المستخدم**: admin
- **كلمة المرور**: admin123
- **البريد الإلكتروني**: admin@example.com

### مستخدم عادي
- **اسم المستخدم**: user
- **كلمة المرور**: user123
- **البريد الإلكتروني**: user@example.com

## حماية الـ Routes

لحماية أي route، استخدم middleware `authenticateToken`:

```javascript
const { authenticateToken } = require("../middleware/auth");

router.get("/protected-route", authenticateToken, (req, res) => {
    // req.user يحتوي على بيانات المستخدم المصادق عليه
    res.json({ message: "مرحباً " + req.user.full_name });
});
```

## ملاحظات مهمة

1. **أمان JWT**: تأكد من استخدام JWT secret قوي ومتغير
2. **تشفير كلمات المرور**: جميع كلمات المرور مشفرة باستخدام bcrypt
3. **انتهاء الصلاحية**: JWT tokens تنتهي صلاحيتها خلال 24 ساعة
4. **التحقق من البيانات**: جميع المدخلات يتم التحقق من صحتها
5. **رسائل الخطأ**: جميع الرسائل باللغة العربية

## هيكل جدول المستخدمين

```sql
CREATE TABLE users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    username NVARCHAR(50) NOT NULL UNIQUE,
    email NVARCHAR(100) NOT NULL UNIQUE,
    password NVARCHAR(255) NOT NULL,
    full_name NVARCHAR(100) NOT NULL,
    phone NVARCHAR(20),
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    last_login DATETIME2
);
```
