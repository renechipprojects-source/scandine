import { Router, Request, Response } from "express";
import { v2 as cloudinary } from "cloudinary";

const router = Router();

function getBackendCloudinaryConfig() {
  const cloudName = (process.env.CLOUDINARY_CLOUD_NAME || "").trim();
  const uploadPreset = (process.env.CLOUDINARY_UPLOAD_PRESET || "").trim();
  const apiKey = (process.env.CLOUDINARY_API_KEY || "").trim();
  const apiSecret = (process.env.CLOUDINARY_API_SECRET || "").trim();

  if (!cloudName) {
    throw new Error("Cloudinary configuration error: Missing CLOUDINARY_CLOUD_NAME in backend environment variables.");
  }
  if (!uploadPreset) {
    throw new Error("Cloudinary configuration error: Missing CLOUDINARY_UPLOAD_PRESET in backend environment variables.");
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });

  return { cloudName, uploadPreset, apiKey, apiSecret };
}

// Generate Cloudinary signature for secure client-side uploads
router.post("/signature", (_req: Request, res: Response) => {
  try {
    const { cloudName, uploadPreset, apiKey, apiSecret } = getBackendCloudinaryConfig();

    if (!apiSecret) {
      return res.status(500).json({ error: "Cloudinary API Secret not configured in backend environment variables" });
    }

    const timestamp = Math.round(new Date().getTime() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      { timestamp, upload_preset: uploadPreset },
      apiSecret
    );

    res.status(200).json({
      timestamp,
      signature,
      cloud_name: cloudName,
      upload_preset: uploadPreset,
      api_key: apiKey,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || String(err) });
  }
});

// Proxy image upload directly through backend
router.post("/upload", async (req: Request, res: Response) => {
  try {
    const { uploadPreset } = getBackendCloudinaryConfig();
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: "Missing image string or base64 payload" });
    }

    const uploadResponse = await cloudinary.uploader.upload(image, {
      upload_preset: uploadPreset,
    });

    res.status(200).json({
      secure_url: uploadResponse.secure_url,
      public_id: uploadResponse.public_id,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || String(err) });
  }
});

// Delete Cloudinary asset by public_id or image URL
router.post("/delete", async (req: Request, res: Response) => {
  try {
    getBackendCloudinaryConfig();
    const { public_id, url } = req.body;
    let targetPublicId = public_id;

    if (!targetPublicId && url && typeof url === "string" && url.includes("res.cloudinary.com")) {
      const parts = url.split("/");
      const filename = parts.pop() || "";
      targetPublicId = filename.split(".")[0];
    }

    if (!targetPublicId) {
      return res.status(400).json({ error: "Missing public_id or valid Cloudinary URL" });
    }

    const result = await cloudinary.uploader.destroy(targetPublicId);
    res.status(200).json({
      success: true,
      result,
      public_id: targetPublicId,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || String(err) });
  }
});

export default router;
