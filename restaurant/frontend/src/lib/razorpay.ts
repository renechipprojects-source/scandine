import { fetchFromBackend } from "./api";

export interface CreateRazorpayOrderOptions {
  amount: number; // in INR
  currency?: string;
  receipt?: string;
}

export async function createRazorpayOrder(options: CreateRazorpayOrderOptions) {
  try {
    return await fetchFromBackend("/api/razorpay/create-order", {
      method: "POST",
      body: JSON.stringify(options),
    });
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    throw error;
  }
}

export async function verifyRazorpayPayment(paymentData: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}) {
  try {
    return await fetchFromBackend("/api/razorpay/verify", {
      method: "POST",
      body: JSON.stringify(paymentData),
    });
  } catch (error) {
    console.error("Error verifying Razorpay payment:", error);
    throw error;
  }
}
