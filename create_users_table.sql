-- إنشاء جدول المستخدمين
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

-- إنشاء فهرس على اسم المستخدم والبريد الإلكتروني لتحسين الأداء
CREATE INDEX IX_users_username ON users(username);
CREATE INDEX IX_users_email ON users(email);
CREATE INDEX IX_users_is_active ON users(is_active);

-- إدراج مستخدم افتراضي
-- كلمة المرور: admin123 (مشفرة بـ bcrypt)
INSERT INTO users (username, email, password, full_name, is_active) 
VALUES (
    'admin', 
    'admin@example.com', 
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 
    'مدير النظام', 
    1
);

-- إدراج مستخدم عادي للاختبار
-- كلمة المرور: user123 (مشفرة بـ bcrypt)
INSERT INTO users (username, email, password, full_name, is_active) 
VALUES (
    'user', 
    'user@example.com', 
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 
    'مستخدم عادي', 
    1
);

