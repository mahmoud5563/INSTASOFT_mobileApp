const express = require("express");
const app = express();

// Routes
const sale_invoicesRoutes = require("./routes/sale_invoices");
const buy_invoicesRoutes = require("./routes/buy_invoices");
const accountsRoutes = require("./routes/accounts");
const settingsRoutes = require("./routes/settings");

app.use(express.json());

// API routes
app.use("/api/sale_invoices", sale_invoicesRoutes);
app.use("/api/buy_invoices", buy_invoicesRoutes);
app.use("/api/accounts", accountsRoutes);
app.use("/api/settings", settingsRoutes);

app.listen(5000, "0.0.0.0", () => {
  console.log("✅ API running at http://0.0.0.0:5000");
});
