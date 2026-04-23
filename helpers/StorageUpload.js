import supabase from "../configs/Supabase.js";
import https from "https";
import http from "http";

const BUCKET = "profile-images";
const POST_BUCKET = "post-images";

/**
 * Upload a file buffer to Supabase Storage (post-images bucket).
 * Accepts express-fileupload file object or raw buffer.
 * Returns the relative path stored in the DB, or "" on failure.
 */
export const uploadPostImage = async (file) => {
    if (!file) return "";
    try {
        const ext = file.name ? file.name.split(".").pop().toLowerCase() : "jpg";
        if (ext !== "jpg" && ext !== "jpeg" && ext !== "png") return "";
        const fileName = `posts/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const buffer = file.data || file;

        const { error } = await supabase.storage
            .from(POST_BUCKET)
            .upload(fileName, buffer, {
                contentType: ext === "png" ? "image/png" : "image/jpeg",
                upsert: false,
            });

        if (error) {
            console.error("[STORAGE] Post image upload failed:", error.message);
            return "";
        }

        return fileName;
    } catch (err) {
        console.error("[STORAGE] uploadPostImage error:", err.message);
        return "";
    }
};

/**
 * Get public URL for a file in the post-images bucket.
 */
export const getPostImageUrl = (filePath) => {
    if (!filePath) return null;
    const { data } = supabase.storage.from(POST_BUCKET).getPublicUrl(filePath);
    return data?.publicUrl || null;
};

/**
 * Download an image from a URL and upload it to Supabase Storage.
 * Returns the relative path (e.g. "images/1234567890.jpg") stored in the DB.
 * The full public URL = APP_BUCKET_IMAGE + returned path.
 * Falls back to the original URL if upload fails.
 */
export const uploadImageFromUrl = async (imageUrl) => {
    if (!imageUrl) return "";

    try {
        // Download image into a buffer
        const buffer = await new Promise((resolve, reject) => {
            const client = imageUrl.startsWith("https") ? https : http;
            const chunks = [];
            client.get(imageUrl, (res) => {
                if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
                res.on("data", (chunk) => chunks.push(chunk));
                res.on("end", () => resolve(Buffer.concat(chunks)));
                res.on("error", reject);
            }).on("error", reject);
        });

        const fileName = `images/${Date.now()}.jpg`;

        const { error } = await supabase.storage
            .from(BUCKET)
            .upload(fileName, buffer, {
                contentType: "image/jpeg",
                upsert: false,
            });

        if (error) {
            console.error("[STORAGE] Upload failed:", error.message);
            // Fallback: store original URL directly
            return imageUrl;
        }

        return fileName;
    } catch (err) {
        console.error("[STORAGE] uploadImageFromUrl error:", err.message);
        return imageUrl;
    }
};

/**
 * Upload a file buffer (from multipart form) to Supabase Storage.
 * Returns the relative path stored in the DB.
 */
export const uploadFileToStorage = async (fileBuffer, originalName, mimeType = "image/jpeg") => {
    if (!fileBuffer) return "";

    try {
        const ext = originalName?.split(".").pop() || "jpg";
        const fileName = `images/${Date.now()}.${ext}`;

        const { error } = await supabase.storage
            .from(BUCKET)
            .upload(fileName, fileBuffer, {
                contentType: mimeType,
                upsert: false,
            });

        if (error) {
            console.error("[STORAGE] File upload failed:", error.message);
            return "";
        }

        return fileName;
    } catch (err) {
        console.error("[STORAGE] uploadFileToStorage error:", err.message);
        return "";
    }
};
