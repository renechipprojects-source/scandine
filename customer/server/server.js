import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
const corsOrigin = process.env.CORS_ORIGIN || "*";
app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);

app.use(express.json());

// Initialize Supabase Client
const supabaseUrl =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || supabaseUrl.includes("your-supabase-project") || supabaseUrl.includes("placeholder")) {
  throw new Error(
    "Missing required environment variable: SUPABASE_URL (or VITE_SUPABASE_URL). Please set SUPABASE_URL in your environment."
  );
}

if (!supabaseKey || supabaseKey.includes("your_supabase_") || supabaseKey.includes("placeholder")) {
  throw new Error(
    "Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY. Please set SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) in your environment."
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Health check endpoints (for Render monitoring)
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "Restaurant ERP Backend API",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "Restaurant ERP Backend API",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// System Status Endpoint
app.get("/api/status", (req, res) => {
  res.json({
    status: "online",
    environment: process.env.NODE_ENV || "development",
    supabaseConnected: Boolean(supabaseUrl),
  });
});

// Root route
app.get("/", (req, res) => {
  res.send("Restaurant ERP Backend Service Running");
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Unhandled Server Error:", err);
  res.status(500).json({ error: "Internal Server Error", message: err.message });
});

app.listen(PORT, () => {
  console.log(`🚀 Restaurant ERP Backend running on port ${PORT}`);
});
