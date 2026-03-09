import axios from "axios";
import apiClient from "@/lib/api-client";

const PUBLIC_BASE_URL = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}/api`;

// ===== Types =====

export interface BaseResponse<T = null> {
  statusCode: number;
  message: string;
  data: T;
}

/** Item trong danh sach tat ca tai lieu (GET /api/documents) */
export interface DocumentItemAll {
  id: string;
  originalName: string;
  contentType: string;
  size: number;
  ownerId: number;
  createdAt: string;
}

/** Item trong danh sach tai lieu cua toi (GET /api/documents/my) + chi tiet */
export interface DocumentItem {
  id: string;
  originalName: string;
  contentType: string;
  size: number;
  visible: boolean;
  createdAt: string;
}

/** Response khi upload / replace */
export interface DocumentUploadData {
  id: string;
  originalName: string;
  contentType: string;
  size: number;
}

/** Response khi lay download URL */
export interface DownloadUrlData {
  url: string;
}

/** Response khi rename */
export interface RenameData {
  id: string;
  originalName: string;
}

/** Response khi toggle visibility */
export interface VisibilityData {
  id: string;
  visible: boolean;
}

// ===== Constraints =====

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// ===== API Calls =====

/** 1. Lay tat ca tai lieu cong khai (visible = true) — KHÔNG cần token */
export async function getAllDocuments(): Promise<
  BaseResponse<DocumentItemAll[]>
> {
  const response = await axios.get<BaseResponse<DocumentItemAll[]>>(
    `${PUBLIC_BASE_URL}/documents`
  );
  return response.data;
}

/** 2. Lay tai lieu cua toi (ca an lan hien) */
export async function getMyDocuments(): Promise<BaseResponse<DocumentItem[]>> {
  const response =
    await apiClient.get<BaseResponse<DocumentItem[]>>("documents/my");
  return response.data;
}

/** 3. Lay chi tiet 1 tai lieu (chi owner) */
export async function getDocument(
  id: string
): Promise<BaseResponse<DocumentItem>> {
  const response = await apiClient.get<BaseResponse<DocumentItem>>(
    `documents/${id}`
  );
  return response.data;
}

/** 4. Upload tai lieu (pdf, doc, docx — toi da 10MB) */
export async function uploadDocument(
  file: File
): Promise<BaseResponse<DocumentUploadData>> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiClient.post<BaseResponse<DocumentUploadData>>(
    "documents",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    }
  );
  return response.data;
}

/** 5. Lay signed URL de tai file (het han sau 15 phut, chi owner) */
export async function getDownloadUrl(
  id: string
): Promise<BaseResponse<DownloadUrlData>> {
  const response = await apiClient.get<BaseResponse<DownloadUrlData>>(
    `documents/${id}/download-url`
  );
  return response.data;
}

/** 6. Doi ten tai lieu (chi owner) */
export async function renameDocument(
  id: string,
  newName: string
): Promise<BaseResponse<RenameData>> {
  const response = await apiClient.put<BaseResponse<RenameData>>(
    `documents/${id}/rename`,
    { newName }
  );
  return response.data;
}

/** 7. Thay the file tai lieu (chi owner) */
export async function replaceDocument(
  id: string,
  file: File
): Promise<BaseResponse<DocumentUploadData>> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiClient.put<BaseResponse<DocumentUploadData>>(
    `documents/${id}/replace`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    }
  );
  return response.data;
}

/** 8. Xoa tai lieu (chi owner) */
export async function deleteDocument(
  id: string
): Promise<BaseResponse<null>> {
  const response = await apiClient.delete<BaseResponse<null>>(
    `documents/${id}`
  );
  return response.data;
}

/** 9. An/hien tai lieu (chi owner) */
export async function toggleVisibility(
  id: string,
  visible: boolean
): Promise<BaseResponse<VisibilityData>> {
  const response = await apiClient.put<BaseResponse<VisibilityData>>(
    `documents/${id}/visibility`,
    { visible }
  );
  return response.data;
}

// ===== Client-side validation =====

export function validateFile(file: File): string | null {
  if (!file || file.size === 0) {
    return "Vui lòng chọn file";
  }

  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  if (![".pdf", ".doc", ".docx"].includes(ext)) {
    return "Chỉ chấp nhận file PDF, DOC, DOCX";
  }

  if (file.size > MAX_FILE_SIZE) {
    return "File không được vượt quá 10MB";
  }

  return null;
}

// ===== Helpers =====

export function getFormatLabel(contentType: string): string {
  switch (contentType) {
    case "application/pdf":
      return "PDF";
    case "application/msword":
      return "DOC";
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return "DOCX";
    default:
      return "FILE";
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
