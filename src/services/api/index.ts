// Re-export types để import gọn: import { PaginatedResponse } from "@/services/api"
export type {
  PaginationMeta,
  PaginatedResponse,
  PaginationParams,
} from "./types";

export {
  getAllDocuments,
  getMyDocuments,
  getDocument,
  uploadDocument,
  getDownloadUrl,
  renameDocument,
  replaceDocument,
  deleteDocument,
  toggleVisibility,
  validateFile,
  getFormatLabel,
  formatFileSize,
  formatDate,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
} from "./document";

export type {
  BaseResponse,
  DocumentItemAll,
  DocumentItem,
  DocumentUploadData,
  DownloadUrlData,
  RenameData,
  VisibilityData,
} from "./document";
