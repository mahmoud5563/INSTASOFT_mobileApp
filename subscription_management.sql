-- إضافة عمود days_remaining إلى جدول subscriptions
ALTER TABLE subscriptions 
ADD days_remaining AS (
    CASE 
        WHEN end_date >= CAST(GETDATE() AS DATE) 
        THEN DATEDIFF(day, CAST(GETDATE() AS DATE), end_date)
        ELSE 0 
    END
) PERSISTED;

-- إنشاء دالة لحساب حالة الاشتراك
CREATE OR ALTER FUNCTION dbo.CalculateSubscriptionStatus(@user_id INT)
RETURNS TABLE
AS
RETURN
(
    SELECT 
        u.id,
        u.username,
        u.is_active as current_is_active,
        s.plan_type,
        s.start_date,
        s.end_date,
        s.is_active as subscription_is_active,
        CASE 
            WHEN s.is_active = 1 AND s.end_date >= CAST(GETDATE() AS DATE) 
            THEN 1
            ELSE 0 
        END as calculated_is_active,
        CASE 
            WHEN s.is_active = 1 AND s.end_date >= CAST(GETDATE() AS DATE) 
            THEN DATEDIFF(day, CAST(GETDATE() AS DATE), s.end_date)
            ELSE 0 
        END as days_remaining
    FROM app_users u
    LEFT JOIN subscriptions s ON u.id = s.user_id AND s.is_active = 1
    WHERE u.id = @user_id
);

-- إنشاء procedure لتحديث حالة المستخدمين بناءً على الاشتراكات
CREATE OR ALTER PROCEDURE dbo.UpdateUserActiveStatus
    @user_id INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    IF @user_id IS NULL
    BEGIN
        -- تحديث جميع المستخدمين
        UPDATE u 
        SET is_active = CASE 
            WHEN EXISTS (
                SELECT 1 FROM subscriptions s 
                WHERE s.user_id = u.id 
                AND s.is_active = 1 
                AND s.end_date >= CAST(GETDATE() AS DATE)
            ) THEN 1
            ELSE 0
        END
        FROM app_users u;
    END
    ELSE
    BEGIN
        -- تحديث مستخدم محدد
        UPDATE u 
        SET is_active = CASE 
            WHEN EXISTS (
                SELECT 1 FROM subscriptions s 
                WHERE s.user_id = u.id 
                AND s.is_active = 1 
                AND s.end_date >= CAST(GETDATE() AS DATE)
            ) THEN 1
            ELSE 0
        END
        FROM app_users u
        WHERE u.id = @user_id;
    END
END;

-- إنشاء trigger لتحديث حالة المستخدم عند تغيير الاشتراك
CREATE OR ALTER TRIGGER tr_subscription_update
ON subscriptions
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @affected_user_id INT;
    
    -- الحصول على user_id من العملية
    IF EXISTS (SELECT 1 FROM inserted)
        SELECT @affected_user_id = user_id FROM inserted;
    ELSE IF EXISTS (SELECT 1 FROM deleted)
        SELECT @affected_user_id = user_id FROM deleted;
    
    -- تحديث حالة المستخدم
    IF @affected_user_id IS NOT NULL
    BEGIN
        EXEC dbo.UpdateUserActiveStatus @affected_user_id;
    END
END;

-- إنشاء procedure لإنشاء اشتراك جديد مع حساب الأيام
CREATE OR ALTER PROCEDURE dbo.CreateSubscription
    @user_id INT,
    @plan_type NVARCHAR(50),
    @months INT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @start_date DATE = CAST(GETDATE() AS DATE);
    DECLARE @end_date DATE = DATEADD(MONTH, @months, @start_date);
    
    -- إلغاء تفعيل الاشتراكات السابقة
    UPDATE subscriptions 
    SET is_active = 0, updated_at = GETDATE()
    WHERE user_id = @user_id AND is_active = 1;
    
    -- إنشاء الاشتراك الجديد
    INSERT INTO subscriptions (user_id, plan_type, start_date, end_date, is_active)
    VALUES (@user_id, @plan_type, @start_date, @end_date, 1);
    
    -- تحديث حالة المستخدم
    EXEC dbo.UpdateUserActiveStatus @user_id;
    
    -- إرجاع بيانات الاشتراك
    SELECT 
        id,
        user_id,
        plan_type,
        start_date,
        end_date,
        is_active,
        days_remaining,
        created_at
    FROM subscriptions 
    WHERE user_id = @user_id AND is_active = 1;
END;

-- إنشاء procedure لتجديد الاشتراك
CREATE OR ALTER PROCEDURE dbo.RenewSubscription
    @user_id INT,
    @months INT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @current_end_date DATE;
    DECLARE @new_end_date DATE;
    
    -- الحصول على تاريخ انتهاء الاشتراك الحالي
    SELECT @current_end_date = end_date 
    FROM subscriptions 
    WHERE user_id = @user_id AND is_active = 1;
    
    IF @current_end_date IS NULL
    BEGIN
        RAISERROR('لا يوجد اشتراك نشط للمستخدم', 16, 1);
        RETURN;
    END
    
    -- حساب التاريخ الجديد
    SET @new_end_date = DATEADD(MONTH, @months, @current_end_date);
    
    -- تحديث الاشتراك
    UPDATE subscriptions 
    SET end_date = @new_end_date, updated_at = GETDATE()
    WHERE user_id = @user_id AND is_active = 1;
    
    -- تحديث حالة المستخدم
    EXEC dbo.UpdateUserActiveStatus @user_id;
    
    -- إرجاع بيانات الاشتراك المحدثة
    SELECT 
        id,
        user_id,
        plan_type,
        start_date,
        end_date,
        is_active,
        days_remaining,
        updated_at
    FROM subscriptions 
    WHERE user_id = @user_id AND is_active = 1;
END;

-- إنشاء procedure للحصول على حالة الاشتراك
CREATE OR ALTER PROCEDURE dbo.GetSubscriptionStatus
    @user_id INT
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        u.id,
        u.username,
        u.is_active as user_is_active,
        s.id as subscription_id,
        s.plan_type,
        s.start_date,
        s.end_date,
        s.is_active as subscription_is_active,
        s.days_remaining,
        CASE 
            WHEN s.is_active = 1 AND s.end_date >= CAST(GETDATE() AS DATE) 
            THEN 1
            ELSE 0 
        END as calculated_active,
        CASE 
            WHEN s.is_active = 1 AND s.end_date >= CAST(GETDATE() AS DATE) 
            THEN DATEDIFF(day, CAST(GETDATE() AS DATE), s.end_date)
            ELSE 0 
        END as calculated_days_remaining
    FROM app_users u
    LEFT JOIN subscriptions s ON u.id = s.user_id AND s.is_active = 1
    WHERE u.id = @user_id;
END;
