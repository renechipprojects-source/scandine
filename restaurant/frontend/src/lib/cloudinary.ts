import { getApiUrl } from "./api";
import { supabase } from "./supabase";

function getCloudinaryCredentials() {
  const cloudName = (
    import.meta.env.VITE_CLOUDINARY_CLOUD_NAME ||
    import.meta.env.CLOUDINARY_CLOUD_NAME ||
    "gjldiqd9"
  ).trim();
  const uploadPreset = (
    import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET ||
    import.meta.env.CLOUDINARY_UPLOAD_PRESET ||
    "r17mbgbt"
  ).trim();

  if (!cloudName || !uploadPreset) {
    throw new Error("Missing Cloudinary configuration credentials (VITE_CLOUDINARY_CLOUD_NAME / VITE_CLOUDINARY_UPLOAD_PRESET).");
  }
  return { cloudName, uploadPreset };
}

export async function uploadToCloudinary(fileOrUrl: File | Blob | string): Promise<string> {
  // If already a valid Cloudinary secure_url or HTTP/HTTPS image URL, return as is
  if (typeof fileOrUrl === "string") {
    const trimmed = fileOrUrl.trim();
    if (trimmed.startsWith("https://res.cloudinary.com/") || (trimmed.startsWith("https://") && !trimmed.startsWith("blob:") && !trimmed.startsWith("file:"))) {
      return trimmed;
    }
  }

  const { cloudName, uploadPreset } = getCloudinaryCredentials();

  // Try backend Cloudinary endpoint first if available for base64
  try {
    const backendUrl = getApiUrl();
    if (typeof fileOrUrl === "string" && fileOrUrl.startsWith("data:")) {
      const response = await fetch(`${backendUrl}/api/cloudinary/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: fileOrUrl }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.secure_url) return data.secure_url;
      }
    }
  } catch (backendError) {
    console.warn("Backend Cloudinary endpoint notice, using direct Cloudinary REST upload:", backendError);
  }

  // Direct Cloudinary REST API Unsigned Upload
  const formData = new FormData();
  formData.append("file", fileOrUrl);
  formData.append("upload_preset", uploadPreset);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Cloudinary upload failed:", errorText);
    throw new Error(`Cloudinary upload failed: ${response.statusText || errorText}`);
  }

  const data = await response.json();
  if (!data.secure_url) {
    throw new Error("Cloudinary did not return a valid secure_url.");
  }

  return data.secure_url;
}

export async function deleteFromCloudinary(urlOrPublicId: string): Promise<boolean> {
  if (!urlOrPublicId) return false;
  try {
    const backendUrl = getApiUrl();
    const isUrl = urlOrPublicId.includes("http");
    const payload = isUrl ? { url: urlOrPublicId } : { public_id: urlOrPublicId };

    const response = await fetch(`${backendUrl}/api/cloudinary/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const resData = await response.json();
      return resData.success === true;
    }
  } catch (err) {
    console.warn("Cloudinary delete call error:", err);
  }
  return false;
}
