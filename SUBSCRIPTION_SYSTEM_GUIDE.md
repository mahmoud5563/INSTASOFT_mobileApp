# دليل نظام إدارة الاشتراكات

## نظرة عامة
تم تطوير نظام متقدم لإدارة الاشتراكات مع العمود `days_remaining` الذي يحسب تلقائياً الأيام المتبقية من الاشتراك.

## المميزات الجديدة

### 1. عمود days_remaining
- **حساب تلقائي**: يحسب الأيام المتبقية من `start_date` و `end_date`
- **تحديث فوري**: يتحدث تلقائياً عند تغيير أي من التواريخ
- **PERSISTED**: محفوظ في قاعدة البيانات لتحسين الأداء

### 2. إدارة تلقائية لحالة المستخدم
- **is_active = 1**: عندما يكون `days_remaining > 0`
- **is_active = 0**: عندما يكون `days_remaining = 0`
- **تحديث فوري**: عبر trigger عند تغيير الاشتراكات

## الجداول والإجراءات

### جدول subscriptions المحدث
```sql
CREATE TABLE subscriptions (
    id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT NOT NULL,
    plan_type NVARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BIT DEFAULT 1,
    days_remaining AS (
        CASE 
            WHEN end_date >= CAST(GETDATE() AS DATE) 
            THEN DATEDIFF(day, CAST(GETDATE() AS DATE), end_date)
            ELSE 0 
        END
    ) PERSISTED,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES app_users(id)
);
```

### الإجراءات المخزنة الجديدة

#### 1. UpdateUserActiveStatus
```sql
EXEC dbo.UpdateUserActiveStatus @user_id
```
- يحدث حالة المستخدم بناءً على الاشتراك
- يمكن استدعاؤه لمستخدم محدد أو جميع المستخدمين

#### 2. CreateSubscription
```sql
EXEC dbo.CreateSubscription @user_id, @plan_type, @months
```
- ينشئ اشتراك جديد
- يلغي الاشتراكات السابقة
- يحدث حالة المستخدم تلقائياً

#### 3. RenewSubscription
```sql
EXEC dbo.RenewSubscription @user_id, @months
```
- يجدد الاشتراك الحالي
- يضيف الأشهر المطلوبة للتاريخ الحالي

#### 4. GetSubscriptionStatus
```sql
EXEC dbo.GetSubscriptionStatus @user_id
```
- يحصل على حالة الاشتراك الكاملة
- يتضمن `days_remaining` المحسوب

## API Endpoints الجديدة

### 1. الحصول على حالة الاشتراك
```bash
GET /api/auth/subscription-status
Authorization: Bearer your_token
```

**الاستجابة:**
```json
{
    "subscription": {
        "id": 1,
        "plan_type": "premium",
        "start_date": "2024-01-01",
        "end_date": "2024-12-31",
        "is_active": true,
        "days_remaining": 45,
        "user_is_active": true
    }
}
```

### 2. تسجيل الدخول مع فحص الاشتراك
```bash
POST /api/auth/login
{
    "username": "your_username",
    "password": "your_password"
}
```

**في حالة انتهاء الاشتراك:**
```json
{
    "error": "اشتراك منتهي الصلاحية",
    "message": "اشتراكك انتهت صلاحيته. يرجى تجديد الاشتراك أو إنشاء اشتراك جديد",
    "subscription_required": true,
    "days_remaining": 0
}
```

## التحديثات التلقائية

### 1. Trigger تلقائي
- **tr_subscription_update**: يحدث حالة المستخدم عند تغيير الاشتراكات
- **يعمل على**: INSERT, UPDATE, DELETE
- **يحدث**: is_active في جدول app_users

### 2. حساب days_remaining
- **تلقائي**: يحسب عند كل استعلام
- **دقيق**: يعتمد على التاريخ الحالي
- **فوري**: يتحدث مع كل تغيير في التواريخ

## استخدام النظام

### 1. إنشاء اشتراك جديد
```javascript
// في routes/auth.js
const createSubscriptionQuery = `EXEC dbo.CreateSubscription @user_id, @plan_type, @months`;
const result = await executeQuery(createSubscriptionQuery, {
    user_id: user.id,
    plan_type: 'premium',
    months: 6
});
```

### 2. تجديد اشتراك موجود
```javascript
const renewQuery = `EXEC dbo.RenewSubscription @user_id, @months`;
const result = await executeQuery(renewQuery, {
    user_id: req.user.id,
    months: 3
});
```

### 3. فحص حالة الاشتراك
```javascript
const status = await getSubscriptionStatus(userId);
if (status.calculated_days_remaining <= 0) {
    // الاشتراك منتهي
}
```

## الأمان والتحقق

### 1. فحص تسجيل الدخول
- يتحقق من `days_remaining > 0`
- يمنع الدخول عند انتهاء الاشتراك
- يعطي رسالة واضحة للمستخدم

### 2. تحديث تلقائي
- يحدث `is_active` تلقائياً
- لا يحتاج تدخل يدوي
- يعمل في الخلفية

## الصيانة

### 1. تحديث جميع المستخدمين
```sql
EXEC dbo.UpdateUserActiveStatus
```

### 2. فحص الاشتراكات المنتهية
```sql
SELECT * FROM subscriptions 
WHERE days_remaining <= 0 AND is_active = 1
```

### 3. إحصائيات الاشتراكات
```sql
SELECT 
    plan_type,
    COUNT(*) as total_subscriptions,
    SUM(CASE WHEN days_remaining > 0 THEN 1 ELSE 0 END) as active_subscriptions,
    AVG(days_remaining) as avg_days_remaining
FROM subscriptions 
GROUP BY plan_type
```

## ملاحظات مهمة

1. **الأداء**: عمود `days_remaining` محفوظ (PERSISTED) لتحسين الأداء
2. **التزامن**: الـ trigger يضمن التحديث الفوري
3. **الدقة**: الحساب يعتمد على التاريخ الحالي
4. **المرونة**: يمكن تخصيص منطق الحساب حسب الحاجة

## استكشاف الأخطاء

### مشاكل شائعة:
1. **days_remaining = 0**: تحقق من `end_date`
2. **is_active = 0**: تحقق من `days_remaining`
3. **تحديث بطيء**: تحقق من الـ trigger

### حلول:
1. تشغيل `EXEC dbo.UpdateUserActiveStatus`
2. فحص التواريخ في جدول subscriptions
3. التحقق من صحة الـ trigger
