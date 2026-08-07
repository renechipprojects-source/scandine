import { getApiUrl } from "./api";
import { supabase } from "./supabase";

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
  // If already a persistent HTTP/HTTPS, Cloudinary, or Data URL, return as is
  if (typeof fileOrUrl === "string") {
    if (fileOrUrl.startsWith("http://") || fileOrUrl.startsWith("https://") || fileOrUrl.startsWith("data:")) {
      return fileOrUrl;
    }
  }

  // 1. Try Cloudinary Upload
  try {
    const { cloudName, uploadPreset } = getCloudinaryCredentials();
    const formData = new FormData();
    formData.append("file", fileOrUrl);
    formData.append("upload_preset", uploadPreset);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: formData,
    });

    if (response.ok) {
      const data = await response.json();
      if (data.secure_url) return data.secure_url;
    }
  } catch (cloudinaryErr) {
    console.warn("Cloudinary upload fallback to Supabase Storage / Data URL:", cloudinaryErr);
  }

  // 2. Try Supabase Storage Bucket ("sd_menu_items")
  if (fileOrUrl instanceof File || fileOrUrl instanceof Blob) {
    try {
      const ext = fileOrUrl instanceof File ? fileOrUrl.name.split(".").pop() : "jpg";
      const fileName = `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
      const { data: storageData, error: storageError } = await supabase.storage
        .from("sd_menu_items")
        .upload(fileName, fileOrUrl, { upsert: true, contentType: fileOrUrl.type || "image/jpeg" });

      if (!storageError && storageData) {
        const { data: publicUrlData } = supabase.storage.from("sd_menu_items").getPublicUrl(fileName);
        if (publicUrlData?.publicUrl) {
          return publicUrlData.publicUrl;
        }
      }
    } catch (supabaseErr) {
      console.warn("Supabase Storage upload fallback to Data URL:", supabaseErr);
    }

    // 3. Fallback: Convert File/Blob to Base64 Data URL (guaranteed accessible across all tabs/devices)
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("Failed to read image file as Data URL"));
        }
      };
      reader.onerror = () => reject(new Error("FileReader error reading image file"));
      reader.readAsDataURL(fileOrUrl);
    });
  }

  return typeof fileOrUrl === "string" ? fileOrUrl : "";
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
