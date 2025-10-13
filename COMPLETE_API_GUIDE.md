# 🚀 دليل APIs شامل - نظام الفواتير مع JWT

## 📋 نظرة عامة
دليل شامل لاستخدام جميع APIs في نظام الفواتير مع نظام مصادقة JWT متقدم وإدارة الاشتراكات.

---

## 🔧 الإعداد المطلوب

### 1. متغيرات البيئة (.env)
```env
DB_USER=admin1
DB_PASSWORD=Insta-soft2025
DB_SERVER=instasoft.cj806kqga15m.eu-north-1.rds.amazonaws.com
DB_PORT=1433
DB_DATABASE=instasoft
DB_ENCRYPTION=true
DB_TRUSTED_CONNECTION=false

JWT_SECRET=instasoft_aa.com
JWT_EXPIRES_IN=24h

PORT=5000
NODE_ENV=development
```

### 2. جداول قاعدة البيانات
```sql
-- جدول المستخدمين
CREATE TABLE app_users (
    id INT PRIMARY KEY IDENTITY(1,1),
    username NVARCHAR(50) UNIQUE NOT NULL,
    email NVARCHAR(100) UNIQUE NOT NULL,
    password NVARCHAR(255) NOT NULL,
    full_name NVARCHAR(100) NOT NULL,
    phone NVARCHAR(20),
    is_active BIT DEFAULT 1,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    last_login DATETIME
);

-- جدول الاشتراكات
CREATE TABLE subscriptions (
    id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT NOT NULL,
    plan_type NVARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BIT DEFAULT 1,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES app_users(id)
);
```

---

## 🔐 1. APIs المصادقة (Authentication)

### 1.1 تسجيل مستخدم جديد
```http
POST /api/auth/register
Content-Type: application/json

{
    "username": "ahmed123",
    "email": "ahmed@example.com",
    "password": "password123",
    "full_name": "أحمد محمد",
    "phone": "01234567890"
}
```

**الاستجابة:**
```json
{
    "message": "تم إنشاء الحساب بنجاح",
    "user": {
        "id": 1,
        "username": "ahmed123",
        "email": "ahmed@example.com",
        "full_name": "أحمد محمد",
        "phone": "01234567890",
        "is_active": true,
        "created_at": "2024-01-15T10:30:00.000Z"
    }
}
```

### 1.2 تسجيل الدخول
```http
POST /api/auth/login
Content-Type: application/json

{
    "username": "ahmed123",
    "password": "password123"
}
```

**الاستجابة:**
```json
{
    "message": "تم تسجيل الدخول بنجاح",
    "user": {
        "id": 1,
        "username": "ahmed123",
        "email": "ahmed@example.com",
        "full_name": "أحمد محمد",
        "phone": "01234567890",
        "last_login": "2024-01-15T10:35:00.000Z",
        "subscription": {
            "is_active": false,
            "plan_type": null,
            "start_date": null,
            "end_date": null,
            "days_remaining": 0
        }
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer"
}
```

### 1.3 معلومات المستخدم الحالي
```http
GET /api/auth/me
Authorization: Bearer YOUR_JWT_TOKEN
```

**الاستجابة:**
```json
{
    "user": {
        "id": 1,
        "username": "ahmed123",
        "email": "ahmed@example.com",
        "full_name": "أحمد محمد",
        "phone": "01234567890",
        "subscription": {
            "is_active": false,
            "plan_type": null,
            "start_date": null,
            "end_date": null,
            "days_remaining": 0
        }
    }
}
```

### 1.4 تغيير كلمة المرور
```http
POST /api/auth/change-password
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
    "current_password": "password123",
    "new_password": "newpassword123"
}
```

**الاستجابة:**
```json
{
    "message": "تم تحديث كلمة المرور بنجاح"
}
```

### 1.5 تسجيل الخروج
```http
POST /api/auth/logout
Authorization: Bearer YOUR_JWT_TOKEN
```

**الاستجابة:**
```json
{
    "message": "تم تسجيل الخروج بنجاح"
}
```

---

## 💳 2. APIs إدارة الاشتراكات

### 2.1 معلومات الاشتراك الحالي
```http
GET /api/auth/subscription
Authorization: Bearer YOUR_JWT_TOKEN
```

**الاستجابة:**
```json
{
    "subscription": {
        "is_active": false,
        "plan_type": null,
        "start_date": null,
        "end_date": null,
        "days_remaining": 0
    }
}
```

### 2.2 تجديد الاشتراك
```http
POST /api/auth/renew-subscription
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
    "plan_type": "premium",
    "months": 6
}
```

**الاستجابة:**
```json
{
    "message": "تم تجديد الاشتراك بنجاح",
    "subscription": {
        "plan_type": "premium",
        "start_date": "2024-01-15",
        "end_date": "2024-07-15",
        "is_active": true,
        "days_remaining": 182
    }
}
```

### 2.3 إدارة الاشتراكات (للمدير)
```http
GET /api/subscriptions
Authorization: Bearer YOUR_JWT_TOKEN
```

**الاستجابة:**
```json
[
    {
        "id": 1,
        "user_id": 1,
        "plan_type": "premium",
        "start_date": "2024-01-15",
        "end_date": "2024-07-15",
        "is_active": true,
        "username": "ahmed123",
        "email": "ahmed@example.com"
    }
]
```

---

## 📊 3. APIs الفواتير والمصاريف

### 3.1 فواتير البيع
```http
GET /api/sale_invoices?page=1&limit=10&from=2024-01-01&to=2024-12-31
Authorization: Bearer YOUR_JWT_TOKEN
```

**الاستجابة:**
```json
{
    "invoices": [
        {
            "invoice_number": "1001",
            "user_name": "أحمد محمد",
            "store": "المخزن الرئيسي",
            "invoice_time": "2024-01-15T10:30:00.000Z",
            "Account_name": "عميل نقدي",
            "total_invoices": 1500.00,
            "pay_money": 1500.00,
            "remaining": 0.00,
            "treasury_view": "نقدي",
            "acc_type": "نقدي",
            "balance": 50000.00
        }
    ],
    "pagination": {
        "totalItems": 100,
        "totalPages": 10,
        "currentPage": 1,
        "itemsPerPage": 10,
        "hasNextPage": true,
        "hasPrevPage": false
    }
}
```

### 3.2 فواتير الشراء
```http
GET /api/buy_invoices?page=1&limit=10&from=2024-01-01&to=2024-12-31
Authorization: Bearer YOUR_JWT_TOKEN
```

### 3.3 المصاريف
```http
GET /api/expenses?page=1&limit=10
Authorization: Bearer YOUR_JWT_TOKEN
```

**الاستجابة:**
```json
{
    "expenses": [
        {
            "invoice_number": 104,
            "Expenses_date": "2024-01-15T00:00:00.000Z",
            "treasury_view": "نقدي",
            "total_expenses": 500.00,
            "user_name": "أحمد محمد",
            "expenses_details": [
                {
                    "Exp_name": "إيجار المكتب",
                    "Exp_note": "إيجار شهر يناير",
                    "Exp_money": 500.00
                }
            ]
        }
    ],
    "pagination": {
        "totalItems": 50,
        "totalPages": 5,
        "currentPage": 1,
        "itemsPerPage": 10,
        "hasNextPage": true,
        "hasPrevPage": false
    }
}
```

### 3.4 إحصائيات المصاريف
```http
GET /api/expenses/summary
Authorization: Bearer YOUR_JWT_TOKEN
```

**الاستجابة:**
```json
{
    "summary": {
        "total_invoices": 50,
        "total_amount": 25000.00,
        "average_amount": 500.00,
        "earliest_date": "2024-01-01T00:00:00.000Z",
        "latest_date": "2024-01-15T00:00:00.000Z"
    }
}
```

### 3.5 مصاريف فاتورة معينة
```http
GET /api/expenses/104
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 🏪 4. APIs المخزون والحسابات

### 4.1 المخزون
```http
GET /api/inventory?page=1&limit=10
Authorization: Bearer YOUR_JWT_TOKEN
```

**الاستجابة:**
```json
{
    "inventory": [
        {
            "item_code": "001",
            "barcode": "123456789",
            "item_ar": "منتج تجريبي",
            "item_balace": 100,
            "item_type": "منتج",
            "item_unit": "قطعة",
            "item_minimum": 10,
            "item_maxmimm": 1000,
            "buy": 50.00,
            "price1": 75.00,
            "price2": 100.00,
            "price3": 125.00,
            "total_cost": 5000.00
        }
    ],
    "pagination": {
        "totalItems": 200,
        "totalPages": 20,
        "currentPage": 1,
        "itemsPerPage": 10,
        "hasNextPage": true,
        "hasPrevPage": false
    }
}
```

### 4.2 الحسابات
```http
GET /api/accounts?page=1&limit=10
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 🧪 أمثلة عملية للاستخدام

### مثال 1: تسجيل مستخدم جديد وإنشاء اشتراك
```bash
# 1. تسجيل مستخدم جديد
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "email": "newuser@example.com",
    "password": "password123",
    "full_name": "مستخدم جديد",
    "phone": "01234567890"
  }'

# 2. تسجيل الدخول
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "password": "password123"
  }'

# 3. تجديد الاشتراك
curl -X POST http://localhost:5000/api/auth/renew-subscription \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "plan_type": "premium",
    "months": 12
  }'
```

### مثال 2: استخدام APIs المحمية
```bash
# 1. جلب المصاريف
curl -X GET http://localhost:5000/api/expenses \
  -H "Authorization: Bearer YOUR_TOKEN"

# 2. جلب فواتير البيع
curl -X GET "http://localhost:5000/api/sale_invoices?page=1&limit=5" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. جلب المخزون
curl -X GET "http://localhost:5000/api/inventory?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### مثال 3: PowerShell
```powershell
# تسجيل الدخول
$loginResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method POST -ContentType "application/json" -Body '{"username":"newuser","password":"password123"}'
$token = $loginResponse.token

# استخدام التوكن
$headers = @{"Authorization" = "Bearer $token"}
$expenses = Invoke-RestMethod -Uri "http://localhost:5000/api/expenses" -Method GET -Headers $headers
```

---

## 🔄 سيناريو كامل للاستخدام

### الخطوة 1: تسجيل مستخدم جديد
```http
POST /api/auth/register
{
    "username": "company_admin",
    "email": "admin@company.com",
    "password": "secure123",
    "full_name": "مدير الشركة",
    "phone": "01234567890"
}
```

### الخطوة 2: تسجيل الدخول
```http
POST /api/auth/login
{
    "username": "company_admin",
    "password": "secure123"
}
```

### الخطوة 3: إنشاء اشتراك
```http
POST /api/auth/renew-subscription
Authorization: Bearer TOKEN
{
    "plan_type": "enterprise",
    "months": 12
}
```

### الخطوة 4: استخدام النظام
```http
# جلب المصاريف
GET /api/expenses
Authorization: Bearer TOKEN

# جلب فواتير البيع
GET /api/sale_invoices
Authorization: Bearer TOKEN

# جلب المخزون
GET /api/inventory
Authorization: Bearer TOKEN

# جلب الحسابات
GET /api/accounts
Authorization: Bearer TOKEN
```

---

## 🚨 معالجة الأخطاء

### خطأ 401 - غير مصرح
```json
{
    "error": "غير مصرح",
    "message": "التوكن مطلوب للوصول"
}
```

### خطأ 403 - انتهت صلاحية الاشتراك
```json
{
    "error": "انتهت صلاحية الاشتراك",
    "message": "يرجى تجديد الاشتراك للوصول للخدمة",
    "subscription_expired": true,
    "end_date": "2024-01-15",
    "subscription": {
        "is_active": false,
        "plan_type": "premium",
        "start_date": "2023-01-15",
        "end_date": "2024-01-15",
        "days_remaining": 0
    }
}
```

### خطأ 400 - بيانات غير صحيحة
```json
{
    "error": "بيانات غير صحيحة",
    "details": [
        "اسم المستخدم مطلوب",
        "كلمة المرور يجب أن تكون 6 أحرف على الأقل"
    ]
}
```

---

## 📝 ملاحظات مهمة

1. **جميع APIs المحمية** تحتاج إلى `Authorization: Bearer TOKEN`
2. **التوكن صالح لمدة 24 ساعة** (قابل للتعديل)
3. **الاشتراكات** يتم التحقق منها تلقائياً
4. **كلمات المرور** مشفرة بـ bcryptjs
5. **جميع التواريخ** بصيغة ISO 8601

---

## 🎯 الخلاصة

هذا النظام يوفر:
- ✅ مصادقة آمنة مع JWT
- ✅ إدارة شاملة للاشتراكات
- ✅ APIs محمية لجميع العمليات
- ✅ معالجة شاملة للأخطاء
- ✅ دعم الصفحات والفلترة
- ✅ تشفير آمن لكلمات المرور

**النظام جاهز للاستخدام في الإنتاج!** 🚀
