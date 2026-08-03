import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import cloudinaryRouter from "./routes/cloudinary.js";
import razorpayRouter from "./routes/razorpay.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Dynamic CORS configuration allowing Vercel deployment & local development origins
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.CUSTOMER_APP_URL,
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:4173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app") ||
        process.env.NODE_ENV !== "production"
      ) {
        return callback(null, true);
      }
      return callback(new Error(`CORS origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

const SUPABASE_URL = process.env.SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0NzQ2NTMsImV4cCI6MjEwMTA1MDY1M30.KxjH42Wg0IVLfXLLJSbBLvcZ098hvJRUHkDu10NJfB4";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Health check endpoint
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    service: "Restaurant ERP Backend",
    timestamp: new Date().toISOString(),
  });
});

// Database status endpoint verifying active Supabase tables
app.get("/api/status", async (_req: Request, res: Response) => {
  try {
    const [employees, menuItems, notifications, orders, purchaseOrders] = await Promise.all([
      supabase.from("sd_employees").select("id", { count: "exact", head: true }),
      supabase.from("sd_menu_items").select("id", { count: "exact", head: true }),
      supabase.from("sd_notifications").select("id", { count: "exact", head: true }),
      supabase.from("sd_orders").select("id", { count: "exact", head: true }),
      supabase.from("sd_purchase_orders").select("id", { count: "exact", head: true }),
    ]);

    res.status(200).json({
      status: "online",
      database: "Supabase Connected",
      tables: {
        sd_employees: employees.count ?? 0,
        sd_menu_items: menuItems.count ?? 0,
        sd_notifications: notifications.count ?? 0,
        sd_orders: orders.count ?? 0,
        sd_purchase_orders: purchaseOrders.count ?? 0,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({
      status: "error",
      message: err?.message || String(err),
    });
  }
});

// Mount Cloudinary and Razorpay server routers
app.use("/api/cloudinary", cloudinaryRouter);
app.use("/api/razorpay", razorpayRouter);

app.listen(PORT, () => {
  console.log(`🚀 Restaurant ERP Backend Server running on port ${PORT}`);
});
