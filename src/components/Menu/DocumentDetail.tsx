"use client";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import {
  getDocument,
  getDownloadUrl,
  getFormatLabel,
  formatFileSize,
  formatDate,
} from "@/services/api/document";

function DocumentDetail({ id }: { id: string }) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("DocumentDetailPage");
  const [downloading, setDownloading] = useState(false);

  // Fetch document detail
  const {
    data: doc,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["document", id],
    queryFn: async () => {
      const res = await getDocument(id);
      return res.data ?? null;
    },
  });

  // Fetch signed URL for preview (auto-refresh mỗi 14 phút vì URL hết hạn sau 15 phút)
  const { data: previewUrl, isLoading: loadingPreview } = useQuery({
    queryKey: ["document-preview-url", id],
    queryFn: async () => {
      const res = await getDownloadUrl(id);
      if (res.statusCode === 200) return res.data.url;
      return null;
    },
    refetchInterval: 14 * 60 * 1000, // refresh trước khi hết hạn
    enabled: !!doc,
  });

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const result = await getDownloadUrl(id);
      if (result.statusCode === 200) {
        // Tạo link download thay vì window.open
        const a = document.createElement("a");
        a.href = result.data.url;
        a.download = doc?.originalName || "download";
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success(t("download_started"), {
          description: doc?.originalName,
          duration: 3000,
        });
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Không thể tải file");
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f4f4f0] dark:bg-[#121212] flex items-center justify-center">
        <div className="border-4 border-black dark:border-white bg-white dark:bg-[#1a1a1a] p-12 shadow-[8px_8px_0_0_#000] dark:shadow-[8px_8px_0_0_#cbfe00] text-center">
          <p className="text-2xl font-black uppercase text-black dark:text-white animate-pulse">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  if (isError || !doc) {
    return (
      <div className="min-h-screen bg-[#f4f4f0] dark:bg-[#121212] flex items-center justify-center">
        <div className="border-4 border-black dark:border-white bg-white dark:bg-[#1a1a1a] p-12 shadow-[8px_8px_0_0_#ff3333] text-center">
          <h1 className="text-4xl font-black uppercase text-black dark:text-white mb-4">
            {t("not_found")}
          </h1>
          <p className="text-lg font-bold text-gray-600 dark:text-gray-400 mb-8">
            {t("not_found_desc")}
          </p>
          <button
            onClick={() => router.push(`/${locale}/menu`)}
            className="bg-black text-white dark:bg-white dark:text-black font-black uppercase px-8 py-4 border-4 border-black dark:border-white hover:bg-[#cbfe00] hover:text-black transition-colors"
          >
            {t("back_to_library")}
          </button>
        </div>
      </div>
    );
  }

  const format = getFormatLabel(doc.contentType);
  const formatColor: Record<string, string> = {
    PDF: "bg-[#ff3333]",
    DOC: "bg-[#3366ff]",
    DOCX: "bg-[#3366ff]",
  };

  /** Dùng Google Docs Viewer cho tất cả file types — tránh auto download */
  function getViewerUrl(signedUrl: string): string {
    return `https://docs.google.com/gview?url=${encodeURIComponent(signedUrl)}&embedded=true`;
  }

  return (
    <div className="min-h-screen bg-[#f4f4f0] dark:bg-[#121212] font-sans selection:bg-black selection:text-[#cbfe00] dark:selection:bg-[#cbfe00] dark:selection:text-black">
      {/* Back navigation */}
      <section className="pt-8 px-8 md:px-16 lg:px-24">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => router.push(`/${locale}/menu`)}
            className="group inline-flex items-center gap-2 font-black uppercase text-black dark:text-white hover:text-[#ff3333] transition-colors text-lg"
          >
            <span className="text-2xl group-hover:-translate-x-1 transition-transform">
              &larr;
            </span>
            {t("back_to_library")}
          </button>
        </div>
      </section>

      {/* Document Info Bar */}
      <section className="pt-6 pb-4 px-8 md:px-16 lg:px-24">
        <div className="max-w-7xl mx-auto border-4 border-black dark:border-white bg-white dark:bg-[#1a1a1a] p-6 shadow-[8px_8px_0_0_#000] dark:shadow-[8px_8px_0_0_#cbfe00] relative overflow-hidden">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Left: info */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <span
                className={`${formatColor[format] || "bg-gray-500"} text-white font-black text-sm px-3 py-1 border-2 border-black flex-shrink-0`}
              >
                {format}
              </span>
              <h1 className="text-xl md:text-2xl font-black uppercase tracking-tighter text-black dark:text-white leading-tight truncate">
                {doc.originalName}
              </h1>
            </div>

            {/* Right: meta + actions */}
            <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
              <span className="font-mono text-sm font-bold text-gray-500">
                {formatFileSize(doc.size)}
              </span>
              <span className="font-mono text-sm font-bold text-gray-500">
                {formatDate(doc.createdAt)}
              </span>
              {doc.visible ? (
                <span className="bg-green-100 text-green-800 font-black text-xs px-2 py-1 uppercase border-2 border-green-800">
                  Công khai
                </span>
              ) : (
                <span className="bg-red-100 text-red-800 font-black text-xs px-2 py-1 uppercase border-2 border-red-800">
                  Đã ẩn
                </span>
              )}
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="bg-[#cbfe00] text-black font-black uppercase px-4 py-2 text-sm hover:bg-[#ff3333] hover:text-white transition-colors border-2 border-black disabled:opacity-50"
              >
                {downloading ? "..." : t("download_file")} &darr;
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Document Viewer */}
      <section className="pb-8 px-8 md:px-16 lg:px-24">
        <div className="max-w-7xl mx-auto border-4 border-black dark:border-white bg-white dark:bg-[#0a0a0a] shadow-[8px_8px_0_0_#000] dark:shadow-[8px_8px_0_0_#cbfe00] overflow-hidden">
          {loadingPreview && (
            <div className="flex items-center justify-center h-[80vh] bg-[#f4f4f0] dark:bg-[#1a1a1a]">
              <p className="text-2xl font-black uppercase text-black dark:text-white animate-pulse">
                Đang tải tài liệu...
              </p>
            </div>
          )}

          {!loadingPreview && !previewUrl && (
            <div className="flex flex-col items-center justify-center h-[60vh] bg-[#f4f4f0] dark:bg-[#1a1a1a] gap-4">
              <p className="text-2xl font-black uppercase text-[#ff3333]">
                Không thể xem trước tài liệu
              </p>
              <button
                onClick={handleDownload}
                className="bg-[#cbfe00] text-black font-black uppercase px-8 py-4 text-lg border-4 border-black hover:bg-[#ff3333] hover:text-white transition-colors shadow-[4px_4px_0_0_#000]"
              >
                {t("download_file")} &darr;
              </button>
            </div>
          )}

          {!loadingPreview && previewUrl && (
            <iframe
              src={getViewerUrl(previewUrl)}
              className="w-full h-[80vh] border-0"
              title={doc.originalName}
            />
          )}
        </div>
      </section>

    </div>
  );
}

export default DocumentDetail;
