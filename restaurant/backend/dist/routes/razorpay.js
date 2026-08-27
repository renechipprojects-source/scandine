import { Router } from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import { supabase } from "../server.js";
const router = Router();
// Helper to retrieve Razorpay instance safely
const getRazorpayInstance = () => {
    const key_id = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_secret || !key_id) {
        throw new Error("Razorpay credentials (RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET) are missing from server environment.");
    }
    return new Razorpay({
        key_id,
        key_secret,
    });
};
// Create Razorpay Order endpoint with server-side sd_orders amount validation
router.post("/create-order", async (req, res) => {
    try {
        const { order_id, amount, currency = "INR", receipt } = req.body;
        let finalAmountRupees = amount;
        // Look up authoritative order total from sd_orders if order_id is provided
        if (order_id) {
            const cleanId = String(order_id).replace(/^#/, "").trim();
            const { data: dbOrder, error: fetchErr } = await supabase
                .from("sd_orders")
                .select("total, id, order_id")
                .or(`id.eq.${order_id},order_id.eq.${order_id},id.eq.${cleanId},order_id.eq.${cleanId}`)
                .maybeSingle();
            if (!fetchErr && dbOrder && typeof dbOrder.total === "number" && dbOrder.total > 0) {
                finalAmountRupees = dbOrder.total;
                console.log(`[RAZORPAY ORDER CREATE] Authoritative order total from sd_orders for ${order_id}: ₹${finalAmountRupees}`);
            }
        }
        if (!finalAmountRupees || typeof finalAmountRupees !== "number" || finalAmountRupees <= 0) {
            return res.status(400).json({ success: false, error: "Invalid or missing order amount" });
        }
        const razorpay = getRazorpayInstance();
        const options = {
            amount: Math.round(finalAmountRupees * 100), // amount in lowest currency unit (paise)
            currency,
            receipt: receipt || `receipt_${Date.now()}`,
        };
        const order = await razorpay.orders.create(options);
        res.status(200).json({
            success: true,
            order_id: order.id,
            amount: order.amount,
            currency: order.currency,
            key_id: process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID,
        });
    }
    catch (err) {
        console.error("[RAZORPAY ORDER CREATE ERROR]", err);
        res.status(500).json({
            success: false,
            error: err?.message || String(err),
        });
    }
});
// Verify Razorpay Payment Signature & update sd_orders table directly on server
router.post("/verify", async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = req.body;
        const secret = process.env.RAZORPAY_KEY_SECRET;
        if (!secret) {
            return res.status(500).json({ success: false, error: "Server missing RAZORPAY_KEY_SECRET configuration" });
        }
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ success: false, error: "Missing required payment verification fields" });
        }
        // 1. Timing-safe HMAC SHA-256 Signature Verification
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", secret)
            .update(body)
            .digest("hex");
        const signatureBuffer = Buffer.from(razorpay_signature, "utf8");
        const expectedBuffer = Buffer.from(expectedSignature, "utf8");
        const isAuthentic = signatureBuffer.length === expectedBuffer.length &&
            crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
        if (!isAuthentic) {
            console.error("[RAZORPAY VERIFY FAIL] Invalid payment signature", { razorpay_order_id, razorpay_payment_id });
            return res.status(400).json({
                success: false,
                message: "Invalid payment signature",
            });
        }
        console.log("[RAZORPAY VERIFY SUCCESS] Signature verified successfully for payment:", razorpay_payment_id);
        // 2. Server-side Database Update on sd_orders
        if (order_id) {
            const cleanId = String(order_id).replace(/^#/, "").trim();
            const payMethodName = "Razorpay Online Payment (UPI / Cards)";
            const payCategory = "upi";
            const { data: dbOrder } = await supabase
                .from("sd_orders")
                .select("*")
                .or(`id.eq.${order_id},order_id.eq.${order_id},id.eq.${cleanId},order_id.eq.${cleanId}`)
                .maybeSingle();
            const targetId = dbOrder?.id || order_id;
            // Update primary payment status column 'payment' to 'paid'
            const { error: updateErr } = await supabase
                .from("sd_orders")
                .update({ payment: "paid" })
                .eq("id", targetId);
            if (updateErr) {
                console.warn("[RAZORPAY SERVER DB UPDATE WARN] Secondary update by order_id...", updateErr);
                await supabase
                    .from("sd_orders")
                    .update({ payment: "paid" })
                    .eq("order_id", targetId);
            }
            // Update item JSONB array with payment metadata
            if (dbOrder && Array.isArray(dbOrder.item)) {
                const updatedItems = dbOrder.item.map((it, idx) => ({
                    ...it,
                    ...(idx === 0
                        ? {
                            payment_method: payMethodName,
                            payment_category: payCategory,
                            razorpay_payment_id,
                            razorpay_order_id,
                        }
                        : {}),
                }));
                await supabase
                    .from("sd_orders")
                    .update({ item: updatedItems })
                    .eq("id", dbOrder.id);
            }
            try {
                await supabase
                    .from("sd_orders")
                    .update({ payment_method: payMethodName, payment_category: payCategory })
                    .eq("id", targetId);
            }
            catch { }
        }
        res.status(200).json({
            success: true,
            message: "Payment verified and order updated successfully",
            razorpay_payment_id,
            order_id,
        });
    }
    catch (err) {
        console.error("[RAZORPAY VERIFY ERROR]", err);
        res.status(500).json({
            success: false,
            error: err?.message || String(err),
        });
    }
});
// Authorized Cash Collection update endpoint
router.post("/cash-collect", async (req, res) => {
    try {
        const { order_id, method = "Cash at Counter" } = req.body;
        if (!order_id) {
            return res.status(400).json({ success: false, error: "Missing required order_id" });
        }
        const cleanId = String(order_id).replace(/^#/, "").trim();
        const { data: dbOrder } = await supabase
            .from("sd_orders")
            .select("*")
            .or(`id.eq.${order_id},order_id.eq.${order_id},id.eq.${cleanId},order_id.eq.${cleanId}`)
            .maybeSingle();
        const targetId = dbOrder?.id || order_id;
        let updatedItems = dbOrder?.item;
        if (dbOrder && Array.isArray(dbOrder.item)) {
            updatedItems = dbOrder.item.map((it, idx) => ({
                ...it,
                ...(idx === 0
                    ? {
                        payment_method: method,
                        payment_category: "cash",
                    }
                    : {}),
            }));
        }
        await supabase
            .from("sd_orders")
            .update({
            payment: "paid",
            payment_method: method,
            payment_category: "cash",
            ...(updatedItems ? { item: updatedItems } : {}),
        })
            .or(`id.eq.${targetId},order_id.eq.${targetId}`);
        res.status(200).json({
            success: true,
            message: "Cash payment collected and updated successfully",
            order_id: targetId,
        });
    }
    catch (err) {
        console.error("[CASH COLLECT ERROR]", err);
        res.status(500).json({
            success: false,
            error: err?.message || String(err),
        });
    }
});
export default router;
