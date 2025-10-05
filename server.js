require('dotenv').config(); // 1. يجب أن تكون في البداية لتحميل المتغيرات
const express = require("express");
const app = express();

// Routes
const sale_invoicesRoutes = require("./routes/sale_invoices");
const buy_invoicesRoutes = require("./routes/buy_invoices");
const accountsRoutes = require("./routes/accounts");
const inventoryRoutes = require("./routes/inventory");
// تم حذف auth routes 
const subscriptionsRoutes = require("./routes/subscriptions");

app.use(express.json());

// Route للتحقق من حالة الـ server
app.get("/", (req, res) => {
    res.json({
        message: "Invoices API is running!",
        status: "OK",
        timestamp: new Date().toISOString()
    });
});

// تم حذف auth routes 
app.use("/api/sale_invoices", sale_invoicesRoutes);
app.use("/api/buy_invoices", buy_invoicesRoutes);
app.use("/api/accounts", accountsRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/subscriptions", subscriptionsRoutes);



const PORT = process.env.PORT || 5000; 

// معالجة الأخطاء غير المتوقعة
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err.message);
    console.error('❌ Stack:', err.stack);
    console.error('❌ Server will continue running...');
    
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    console.error('❌ Server will continue running...');
    // لا نوقف الـ server، نكمل العمل
});

// معالجة إشارة الخروج
process.on('SIGINT', () => {
    console.log('\n🛑 Server is shutting down gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Server is shutting down gracefully...');
    process.exit(0);
});

const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ API running on http://0.0.0.0:${PORT}`);
    console.log(`📊 Database connection status: ${process.env.DB_SERVER ? 'Configured' : 'Not configured'}`);
    console.log(`🔄 Server is running and will stay alive...`);
});

// معالجة أخطاء الـ server
server.on('error', (err) => {
    console.error('❌ Server error:', err.message);
    console.error('❌ Server will continue running...');
});

// إبقاء الـ server شغال
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;