import { AUTH_ENDPOINTS } from "../config/api.config";
import { getAdminAccessToken } from "../utils/auth.utils";

const MAX_UPLOAD_MB = 5;

interface UploadResponse {
  success?: boolean;
  data?: {
    url?: string;
    secure_url?: string;
  };
  message?: string;
  details?: string;
  error?: {
    message?: string;
  };
}

export async function uploadImageMedia(file: File, folder?: string): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files can be uploaded.");
  }

  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
    throw new Error(`Image is too large. Max size is ${MAX_UPLOAD_MB}MB.`);
  }

  const formData = new FormData();
  formData.append("file", file);
  if (folder) {
    formData.append("folder", folder);
  }

  const token = getAdminAccessToken();
  const response = await fetch(AUTH_ENDPOINTS.ADMIN_MEDIA_UPLOAD, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  const payload = (await response.json()) as UploadResponse;
  if (!response.ok || !payload.success) {
    const message =
      payload.error?.message ??
      payload.message ??
      payload.details ??
      "Failed to upload image.";
    throw new Error(message);
  }

  const url = payload.data?.secure_url ?? payload.data?.url;
  if (!url) {
    throw new Error("Upload succeeded but no image URL was returned.");
  }

  return url;
}
