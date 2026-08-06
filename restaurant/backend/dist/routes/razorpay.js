import { Router } from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
const router = Router();
// Lazy initialization of Razorpay instance
const getRazorpayInstance = () => {
    const key_id = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || "rzp_test_TI7XNrxQP5GRTJ";
    const key_secret = process.env.RAZORPAY_KEY_SECRET || "rPL5yd7n2hbvb6sEfxColuPl";
    return new Razorpay({ key_id, key_secret });
};
// Create Razorpay Order endpoint
router.post("/create-order", async (req, res) => {
    try {
        const { amount, currency = "INR", receipt } = req.body;
        if (!amount || typeof amount !== "number") {
            return res.status(400).json({ error: "Invalid or missing amount" });
        }
        const razorpay = getRazorpayInstance();
        const options = {
            amount: Math.round(amount * 100), // amount in lowest currency unit (paise)
            currency,
            receipt: receipt || `receipt_${Date.now()}`,
        };
        const order = await razorpay.orders.create(options);
        res.status(200).json({
            success: true,
            order_id: order.id,
            amount: order.amount,
            currency: order.currency,
            key_id: process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || "rzp_test_TI7XNrxQP5GRTJ",
        });
    }
    catch (err) {
        res.status(500).json({
            success: false,
            error: err?.message || String(err),
        });
    }
});
// Verify Razorpay Payment Signature
router.post("/verify", (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        const secret = process.env.RAZORPAY_KEY_SECRET || "rPL5yd7n2hbvb6sEfxColuPl";
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ error: "Missing required payment verification fields" });
        }
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", secret)
            .update(body.toString())
            .digest("hex");
        const isAuthentic = expectedSignature === razorpay_signature;
        if (isAuthentic) {
            res.status(200).json({
                success: true,
                message: "Payment verified successfully",
            });
        }
        else {
            res.status(400).json({
                success: false,
                message: "Invalid payment signature",
            });
        }
    }
    catch (err) {
        res.status(500).json({
            success: false,
            error: err?.message || String(err),
        });
    }
});
export default router;
