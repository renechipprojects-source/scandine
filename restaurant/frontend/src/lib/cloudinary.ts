import { getApiUrl } from "./api";

function getCloudinaryCredentials() {
  const cloudName = (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || import.meta.env.CLOUDINARY_CLOUD_NAME || "").trim();
  const uploadPreset = (import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || import.meta.env.CLOUDINARY_UPLOAD_PRESET || "").trim();

  if (!cloudName) {
    throw new Error("Cloudinary configuration error: Missing VITE_CLOUDINARY_CLOUD_NAME in frontend environment variables.");
  }
  if (!uploadPreset) {
    throw new Error("Cloudinary configuration error: Missing VITE_CLOUDINARY_UPLOAD_PRESET in frontend environment variables.");
  }

  return { cloudName, uploadPreset };
}

export async function uploadToCloudinary(fileOrUrl: File | Blob | string): Promise<string> {
  // If already a Cloudinary secure url, return as is
  if (typeof fileOrUrl === "string" && fileOrUrl.includes("res.cloudinary.com")) {
    return fileOrUrl;
  }

  const { cloudName, uploadPreset } = getCloudinaryCredentials();

  // Try backend endpoint first if available
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
    console.warn("Backend Cloudinary upload endpoint unavailable, falling back to direct upload:", backendError);
  }

  // Direct Cloudinary REST API upload using environment variables
  const formData = new FormData();
  formData.append("file", fileOrUrl);
  formData.append("upload_preset", uploadPreset);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Cloudinary upload error:", errorText);
    throw new Error(`Cloudinary upload failed: ${response.statusText}`);
  }

  const data = await response.json();
  if (!data.secure_url) {
    throw new Error("Cloudinary did not return a secure_url");
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
