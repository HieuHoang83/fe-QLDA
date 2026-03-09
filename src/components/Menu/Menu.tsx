"use client";
import { useSession } from "next-auth/react";
import Loading from "@/components/Loadingpage/loading";
import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAllDocuments,
  getMyDocuments,
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
  type DocumentItemAll,
  type DocumentItem,
} from "@/services/api/document";

type Tab = "all" | "my";

function MenuPage() {
  const { status } = useSession({ required: false });
  const t = useTranslations("MenuPage");
  const locale = useLocale();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [selectedDocAll, setSelectedDocAll] = useState<DocumentItemAll | null>(null);
  const [selectedDocMy, setSelectedDocMy] = useState<DocumentItem | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Rename state
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Replace state
  const [replaceId, setReplaceId] = useState<string | null>(null);
  const replaceFileRef = useRef<HTMLInputElement>(null);

  // ===== Queries =====

  const {
    data: allDocs = [],
    isLoading: loadingAll,
    isError: errorAll,
  } = useQuery({
    queryKey: ["documents", "all"],
    queryFn: async () => {
      const res = await getAllDocuments();
      return res.data ?? [];
    },
  });

  const {
    data: myDocs = [],
    isLoading: loadingMy,
    isError: errorMy,
  } = useQuery({
    queryKey: ["documents", "my"],
    queryFn: async () => {
      const res = await getMyDocuments();
      return res.data ?? [];
    },
  });

  // ===== Mutations =====

  const uploadMutation = useMutation({
    mutationFn: uploadDocument,
    onSuccess: (result) => {
      invalidateAll();
      setShowUpload(false);
      setSelectedFile(null);
      toast.success(t("upload_success"), {
        description: result.data.originalName,
        duration: 3000,
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Upload thất bại");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      invalidateAll();
      setSelectedDocAll(null);
      setSelectedDocMy(null);
      toast.success("Đã xóa tài liệu thành công");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Xóa thất bại");
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, newName }: { id: string; newName: string }) =>
      renameDocument(id, newName),
    onSuccess: (result) => {
      invalidateAll();
      setRenameId(null);
      setRenameValue("");
      toast.success("Đã đổi tên thành " + result.data.originalName);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Đổi tên thất bại");
    },
  });

  const replaceMutation = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      replaceDocument(id, file),
    onSuccess: (result) => {
      invalidateAll();
      setReplaceId(null);
      setSelectedDocMy(null);
      toast.success("Đã thay thế file: " + result.data.originalName);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Thay thế thất bại");
    },
  });

  const visibilityMutation = useMutation({
    mutationFn: ({ id, visible }: { id: string; visible: boolean }) =>
      toggleVisibility(id, visible),
    onSuccess: (result) => {
      invalidateAll();
      toast.success(
        result.data.visible ? "Tài liệu đã được công khai" : "Tài liệu đã được ẩn"
      );
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Thao tác thất bại");
    },
  });

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ["documents"] });
  }

  // ===== Handlers =====

  const handleDownload = async (docId: string, docName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const result = await getDownloadUrl(docId);
      if (result.statusCode === 200) {
        window.open(result.data.url, "_blank");
        toast.success(t("download_started"), {
          description: docName,
          duration: 3000,
        });
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Không thể tải file");
    }
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error("Vui lòng chọn file");
      return;
    }
    const validationError = validateFile(selectedFile);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    uploadMutation.mutate(selectedFile);
  };

  const handleDelete = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Bạn có chắc muốn xóa "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const error = validateFile(file);
      if (error) {
        toast.error(error);
        e.target.value = "";
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleReplaceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !replaceId) return;
    const error = validateFile(file);
    if (error) {
      toast.error(error);
      e.target.value = "";
      return;
    }
    replaceMutation.mutate({ id: replaceId, file });
  };

  const handleRenameSubmit = () => {
    if (!renameId || !renameValue.trim()) {
      toast.error("Tên không được để trống");
      return;
    }
    renameMutation.mutate({ id: renameId, newName: renameValue.trim() });
  };

  // ===== Sections =====

  const TitleSection = () => (
    <section className="pt-32 pb-16 px-8 md:px-16 lg:px-24 bg-[#f4f4f0] dark:bg-[#121212]">
      <div className="max-w-7xl mx-auto border-4 border-black dark:border-white shadow-[12px_12px_0_0_#000] dark:shadow-[12px_12px_0_0_#cbfe00] p-8 md:p-12 relative overflow-hidden bg-white dark:bg-[#1a1a1a]">
        <div className="absolute -top-10 -right-10 w-48 h-48 border-[8px] border-[#ff3333] rounded-full flex items-center justify-center opacity-20 rotate-12 pointer-events-none">
          <span className="text-[#ff3333] font-black text-3xl uppercase tracking-tighter">Verified</span>
        </div>
        <div className="relative z-10 w-full lg:w-2/3">
          <h2 className="text-4xl md:text-6xl font-black mb-6 text-black dark:text-white uppercase tracking-tighter leading-none">
            {t("welcome_message_title")}
          </h2>
          <p className="mb-8 text-xl md:text-2xl font-medium text-black dark:text-gray-300 border-l-8 border-[#cbfe00] pl-6 py-2">
            {t("welcome_message_description")}
          </p>
          <div className="flex flex-wrap gap-4 mt-8">
            <a href="#menu" className="group relative inline-block text-lg font-black uppercase transition-transform hover:-translate-y-1 hover:-translate-x-1">
              <span className="absolute inset-0 border-4 border-black dark:border-white bg-black dark:bg-white translate-x-2 translate-y-2 transition-transform group-hover:translate-x-3 group-hover:translate-y-3"></span>
              <span className="relative flex items-center justify-center border-4 border-black dark:border-white bg-[#cbfe00] text-black px-8 py-4">
                {t("click_to_menu")}
              </span>
            </a>
            <button onClick={() => setShowUpload(true)} className="group relative inline-block text-lg font-black uppercase transition-transform hover:-translate-y-1 hover:-translate-x-1">
              <span className="absolute inset-0 border-4 border-black dark:border-white bg-black dark:bg-white translate-x-2 translate-y-2 transition-transform group-hover:translate-x-3 group-hover:translate-y-3"></span>
              <span className="relative flex items-center justify-center border-4 border-black dark:border-white bg-[#ff3333] text-white px-8 py-4">
                {t("upload_document")}
              </span>
            </button>
            <a href="#contact" className="group relative inline-block text-lg font-black uppercase transition-transform hover:-translate-y-1 hover:-translate-x-1">
              <span className="absolute inset-0 border-4 border-black dark:border-white bg-black dark:bg-white translate-x-2 translate-y-2 transition-transform group-hover:translate-x-3 group-hover:translate-y-3"></span>
              <span className="relative flex items-center justify-center border-4 border-black dark:border-white bg-white dark:bg-black dark:text-white text-black px-8 py-4">
                {t("click_to_contacts")}
              </span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );

  const TabBar = () => (
    <div className="flex gap-0 mb-12">
      <button
        onClick={() => setActiveTab("all")}
        className={`font-black uppercase text-lg px-8 py-4 border-4 border-black dark:border-white transition-colors ${
          activeTab === "all"
            ? "bg-black text-[#cbfe00] dark:bg-white dark:text-black"
            : "bg-white text-black dark:bg-[#111] dark:text-white hover:bg-gray-100 dark:hover:bg-[#222]"
        }`}
      >
        Tất cả ({allDocs.length})
      </button>
      <button
        onClick={() => setActiveTab("my")}
        className={`font-black uppercase text-lg px-8 py-4 border-4 border-l-0 border-black dark:border-white transition-colors ${
          activeTab === "my"
            ? "bg-black text-[#cbfe00] dark:bg-white dark:text-black"
            : "bg-white text-black dark:bg-[#111] dark:text-white hover:bg-gray-100 dark:hover:bg-[#222]"
        }`}
      >
        Của tôi ({myDocs.length})
      </button>
    </div>
  );

  const LoadingState = () => (
    <div className="flex justify-center py-20">
      <div className="bg-white dark:bg-[#111] border-4 border-black dark:border-white shadow-[8px_8px_0_0_#000] dark:shadow-[8px_8px_0_0_#fff] p-8 text-center">
        <p className="text-2xl font-black uppercase text-black dark:text-white animate-pulse">Loading...</p>
      </div>
    </div>
  );

  const ErrorState = () => (
    <div className="flex justify-center py-20">
      <div className="bg-white dark:bg-[#111] border-4 border-[#ff3333] shadow-[8px_8px_0_0_#ff3333] p-8 text-center">
        <p className="text-2xl font-black uppercase text-[#ff3333] mb-4">Không thể tải danh sách tài liệu</p>
        <button
          onClick={() => invalidateAll()}
          className="bg-[#ff3333] text-white font-black uppercase px-6 py-2 border-2 border-black hover:bg-black transition-colors"
        >
          Thử lại
        </button>
      </div>
    </div>
  );

  const EmptyState = () => (
    <div className="flex justify-center py-20">
      <div className="bg-white dark:bg-[#111] border-4 border-black dark:border-white shadow-[8px_8px_0_0_#000] dark:shadow-[8px_8px_0_0_#fff] p-8 text-center max-w-md">
        <p className="text-4xl mb-4">&uarr;</p>
        <p className="text-2xl font-black uppercase text-black dark:text-white mb-4">
          {activeTab === "my" ? "Bạn chưa upload tài liệu nào" : "Chưa có tài liệu nào"}
        </p>
        <button
          onClick={() => setShowUpload(true)}
          className="bg-[#ff3333] text-white font-black uppercase px-6 py-3 border-4 border-black hover:bg-black transition-colors shadow-[4px_4px_0_0_#000]"
        >
          + {t("upload_document")}
        </button>
      </div>
    </div>
  );

  const AllDocCard = ({ doc }: { doc: DocumentItemAll }) => (
    <div
      key={doc.id}
      className="bg-white dark:bg-[#111] border-4 border-black dark:border-white shadow-[8px_8px_0_0_#000] dark:shadow-[8px_8px_0_0_#fff] p-6 hover:-translate-y-2 transition-transform cursor-pointer group flex flex-col"
      onClick={() => setSelectedDocAll(doc)}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="bg-[#ff3333] text-white font-black px-2 py-1 text-xs uppercase border-2 border-black dark:border-white">
          {getFormatLabel(doc.contentType)}
        </div>
        <div className="font-mono text-sm font-bold text-gray-500">
          {formatFileSize(doc.size)}
        </div>
      </div>
      <h3 className="text-xl font-black uppercase mb-2 text-black dark:text-white group-hover:text-[#ff3333] transition-colors leading-tight line-clamp-2 title-font">
        {doc.originalName}
      </h3>
      <p className="text-xs font-mono font-bold text-gray-400 mb-4">
        {formatDate(doc.createdAt)}
      </p>
      <div className="mt-auto border-t-2 border-dashed border-gray-400 dark:border-gray-600 pt-4 flex justify-between items-center text-xs font-mono font-bold uppercase text-black dark:text-white">
        <span>Owner #{doc.ownerId}</span>
        <Link
          href={`/${locale}/menu/${doc.id}`}
          onClick={(e) => e.stopPropagation()}
          className="bg-black text-[#cbfe00] px-2 py-1 group-hover:bg-[#cbfe00] group-hover:text-black transition-colors border-2 border-transparent group-hover:border-black"
        >
          {t("view_details")} &rarr;
        </Link>
      </div>
    </div>
  );

  const MyDocCard = ({ doc }: { doc: DocumentItem }) => (
    <div
      key={doc.id}
      className={`bg-white dark:bg-[#111] border-4 border-black dark:border-white shadow-[8px_8px_0_0_#000] dark:shadow-[8px_8px_0_0_#fff] p-6 hover:-translate-y-2 transition-transform cursor-pointer group flex flex-col ${
        !doc.visible ? "opacity-60" : ""
      }`}
      onClick={() => setSelectedDocMy(doc)}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex gap-2 items-center">
          <div className="bg-[#ff3333] text-white font-black px-2 py-1 text-xs uppercase border-2 border-black dark:border-white">
            {getFormatLabel(doc.contentType)}
          </div>
          {!doc.visible && (
            <div className="bg-gray-800 text-gray-300 font-black px-2 py-1 text-xs uppercase border-2 border-gray-600">
              ẨN
            </div>
          )}
        </div>
        <div className="font-mono text-sm font-bold text-gray-500">
          {formatFileSize(doc.size)}
        </div>
      </div>
      <h3 className="text-xl font-black uppercase mb-2 text-black dark:text-white group-hover:text-[#ff3333] transition-colors leading-tight line-clamp-2 title-font">
        {doc.originalName}
      </h3>
      <p className="text-xs font-mono font-bold text-gray-400 mb-4">
        {formatDate(doc.createdAt)}
      </p>
      <div className="mt-auto border-t-2 border-dashed border-gray-400 dark:border-gray-600 pt-4 flex justify-between items-center text-xs font-mono font-bold uppercase text-black dark:text-white">
        <div className="flex gap-2">
          <button
            onClick={(e) => handleDownload(doc.id, doc.originalName, e)}
            className="bg-[#3366ff] text-white px-2 py-1 hover:bg-black transition-colors border-2 border-transparent hover:border-black"
            title={t("download")}
          >
            {t("download")} &darr;
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              visibilityMutation.mutate({ id: doc.id, visible: !doc.visible });
            }}
            className={`px-2 py-1 border-2 border-transparent hover:border-black transition-colors ${
              doc.visible
                ? "bg-[#cbfe00] text-black hover:bg-black hover:text-white"
                : "bg-gray-600 text-white hover:bg-black"
            }`}
            title={doc.visible ? "Ẩn tài liệu" : "Hiện tài liệu"}
          >
            {doc.visible ? "Ẩn" : "Hiện"}
          </button>
          <button
            onClick={(e) => handleDelete(doc.id, doc.originalName, e)}
            className="bg-[#ff3333] text-white px-2 py-1 hover:bg-black transition-colors border-2 border-transparent hover:border-black"
            title="Xóa"
          >
            Xóa
          </button>
        </div>
      </div>
    </div>
  );

  const DocumentLibrary = () => {
    const isLoading = activeTab === "all" ? loadingAll : loadingMy;
    const isError = activeTab === "all" ? errorAll : errorMy;
    const docs = activeTab === "all" ? allDocs : myDocs;

    return (
      <section className="bg-[#cbfe00] dark:bg-[#222] py-20 px-8 md:px-16 lg:px-24 border-y-4 border-black dark:border-white" id="menu">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-8 border-b-8 border-black dark:border-white pb-4">
            <h2 className="text-5xl md:text-7xl font-black text-black dark:text-white uppercase tracking-tighter leading-none">
              {t("Menu")}
            </h2>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowUpload(true)}
                className="hidden md:inline-block font-mono text-sm font-bold bg-[#ff3333] text-white px-4 py-2 border-2 border-black hover:bg-black transition-colors uppercase"
              >
                + {t("upload_document")}
              </button>
              <span className="hidden md:inline-block font-mono text-xl font-bold bg-black text-[#cbfe00] px-3 py-1">
                {docs.length} ITEMS
              </span>
            </div>
          </div>

          <TabBar />

          {isLoading && <LoadingState />}
          {isError && <ErrorState />}
          {!isLoading && !isError && docs.length === 0 && <EmptyState />}

          {!isLoading && !isError && docs.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {activeTab === "all"
                ? (allDocs as DocumentItemAll[]).map((doc) => <AllDocCard key={doc.id} doc={doc} />)
                : (myDocs as DocumentItem[]).map((doc) => <MyDocCard key={doc.id} doc={doc} />)}
            </div>
          )}
        </div>
      </section>
    );
  };

  // ===== Modals =====

  const UploadModal = () => {
    if (!showUpload) return null;
    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center py-12 px-4 bg-black/80 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) { setShowUpload(false); setSelectedFile(null); }
        }}
      >
        <div className="bg-white dark:bg-[#0a0a0a] border-4 border-black dark:border-white shadow-[16px_16px_0_0_#cbfe00] max-w-2xl w-full max-h-[calc(100vh-6rem)] overflow-y-auto relative animate-in zoom-in-95 duration-200">
          <div className="sticky top-0 z-10 bg-white dark:bg-[#0a0a0a] px-8 pt-8 pb-6 border-b-8 border-black dark:border-white">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-black dark:text-white">{t("upload_document")}</h2>
                <p className="text-[#ff3333] font-bold mt-2">{t("upload_subtitle")}</p>
              </div>
              <button
                onClick={() => { setShowUpload(false); setSelectedFile(null); }}
                className="flex-shrink-0 ml-4 w-12 h-12 flex items-center justify-center bg-[#ff3333] text-white border-4 border-black dark:border-white font-black text-xl hover:bg-black transition-colors shadow-[4px_4px_0_0_#000] dark:shadow-[4px_4px_0_0_#fff]"
              >
                &times;
              </button>
            </div>
          </div>
          <form onSubmit={handleUploadSubmit} className="px-8 pt-6 pb-8">
            <div className="mb-8">
              <label className="block font-black text-sm mb-2 text-black dark:text-white uppercase">{t("upload_file")} *</label>
              <div
                className="border-4 border-dashed border-black dark:border-white p-8 text-center bg-[#f4f4f0] dark:bg-[#222] hover:bg-[#cbfe00] hover:text-black transition-colors cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
              >
                <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={handleFileChange} />
                {selectedFile ? (
                  <div>
                    <p className="font-black text-lg text-black dark:text-white group-hover:text-black">{selectedFile.name}</p>
                    <p className="text-sm font-bold text-gray-500 mt-1 group-hover:text-gray-700">
                      {formatFileSize(selectedFile.size)} &mdash; {t("upload_change_file")}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="font-black text-2xl text-black dark:text-white mb-2 group-hover:text-black">&uarr;</p>
                    <p className="font-black text-lg text-black dark:text-white group-hover:text-black">{t("upload_drag_or_click")}</p>
                    <p className="text-sm font-bold text-gray-500 mt-1 group-hover:text-gray-700">PDF, DOC, DOCX (max 10MB)</p>
                  </div>
                )}
              </div>
            </div>
            <button
              type="submit"
              disabled={uploadMutation.isPending || !selectedFile}
              className="w-full bg-[#cbfe00] text-black font-black uppercase text-xl py-4 border-4 border-black dark:border-white hover:bg-[#ff3333] hover:text-white transition-colors shadow-[6px_6px_0_0_#000] dark:shadow-[6px_6px_0_0_#fff] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploadMutation.isPending ? t("uploading") : t("upload_submit")}
            </button>
          </form>
        </div>
      </div>
    );
  };

  /** Modal xem chi tiet tai lieu cong khai (tab All) */
  const DocModalAll = () => {
    if (!selectedDocAll) return null;
    const doc = selectedDocAll;
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <div className="bg-white dark:bg-[#0a0a0a] border-4 border-black dark:border-white shadow-[16px_16px_0_0_#cbfe00] max-w-3xl w-full p-8 relative animate-in zoom-in-95 duration-200">
          <button
            onClick={() => setSelectedDocAll(null)}
            className="absolute -top-4 -right-4 bg-[#ff3333] text-white border-4 border-black dark:border-white font-black px-4 py-2 uppercase hover:bg-black transition-colors shadow-[4px_4px_0_0_#000] dark:shadow-[4px_4px_0_0_#fff]"
          >
            Close [X]
          </button>
          <div className="border-b-8 border-black dark:border-white pb-6 mb-6">
            <div className="flex justify-between items-end mb-4">
              <span className="bg-black text-white font-mono px-3 py-1 font-bold text-xs truncate max-w-[200px]">ID_{doc.id.slice(0, 8)}</span>
              <span className="text-[#3366ff] font-extrabold uppercase">Record Found</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-black dark:text-white leading-tight break-words">
              {doc.originalName}
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-lg text-black dark:text-white mb-8">
            <div className="border-2 border-black dark:border-white p-4 bg-[#f4f4f0] dark:bg-[#222]">
              <span className="block text-xs font-bold text-gray-500 uppercase mb-1">Format</span>
              <span className="font-black">{getFormatLabel(doc.contentType)}</span>
            </div>
            <div className="border-2 border-black dark:border-white p-4 bg-[#f4f4f0] dark:bg-[#222]">
              <span className="block text-xs font-bold text-gray-500 uppercase mb-1">Size</span>
              <span className="font-black">{formatFileSize(doc.size)}</span>
            </div>
            <div className="border-2 border-black dark:border-white p-4 bg-[#f4f4f0] dark:bg-[#222]">
              <span className="block text-xs font-bold text-gray-500 uppercase mb-1">Owner</span>
              <span className="font-black">#{doc.ownerId}</span>
            </div>
            <div className="border-2 border-black dark:border-white p-4 bg-[#f4f4f0] dark:bg-[#222]">
              <span className="block text-xs font-bold text-gray-500 uppercase mb-1">Date</span>
              <span className="font-black text-sm">{formatDate(doc.createdAt)}</span>
            </div>
          </div>
          <div className="flex justify-end">
            <Link
              href={`/${locale}/menu/${doc.id}`}
              className="bg-black text-[#cbfe00] font-black uppercase px-8 py-4 hover:bg-[#cbfe00] hover:text-black transition-colors border-4 border-black dark:border-white shadow-[6px_6px_0_0_#000] dark:shadow-[6px_6px_0_0_#fff]"
            >
              {t("view_details")} &rarr;
            </Link>
          </div>
        </div>
      </div>
    );
  };

  /** Modal xem chi tiet tai lieu cua toi (tab My) — co day du actions */
  const DocModalMy = () => {
    if (!selectedDocMy) return null;
    const doc = selectedDocMy;
    const isRenaming = renameId === doc.id;

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <div className="bg-white dark:bg-[#0a0a0a] border-4 border-black dark:border-white shadow-[16px_16px_0_0_#cbfe00] max-w-3xl w-full p-8 relative animate-in zoom-in-95 duration-200 max-h-[calc(100vh-4rem)] overflow-y-auto">
          <button
            onClick={() => { setSelectedDocMy(null); setRenameId(null); setReplaceId(null); }}
            className="absolute -top-4 -right-4 bg-[#ff3333] text-white border-4 border-black dark:border-white font-black px-4 py-2 uppercase hover:bg-black transition-colors shadow-[4px_4px_0_0_#000] dark:shadow-[4px_4px_0_0_#fff] z-10"
          >
            Close [X]
          </button>

          {/* Header */}
          <div className="border-b-8 border-black dark:border-white pb-6 mb-6">
            <div className="flex justify-between items-end mb-4">
              <div className="flex gap-2 items-center">
                <span className="bg-black text-white font-mono px-3 py-1 font-bold text-xs truncate max-w-[200px]">ID_{doc.id.slice(0, 8)}</span>
                {!doc.visible && (
                  <span className="bg-gray-800 text-gray-300 font-mono px-3 py-1 font-bold text-xs uppercase">ẨN</span>
                )}
              </div>
              <span className="text-[#3366ff] font-extrabold uppercase">My Document</span>
            </div>

            {isRenaming ? (
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleRenameSubmit(); if (e.key === "Escape") { setRenameId(null); setRenameValue(""); } }}
                  className="flex-1 px-4 py-3 bg-[#f4f4f0] dark:bg-[#222] border-4 border-black dark:border-white focus:outline-none focus:bg-[#cbfe00] focus:text-black text-xl font-black transition-colors"
                  placeholder="Nhập tên mới..."
                  autoFocus
                />
                <button
                  onClick={handleRenameSubmit}
                  disabled={renameMutation.isPending}
                  className="bg-[#cbfe00] text-black font-black px-4 py-3 border-4 border-black hover:bg-black hover:text-white transition-colors disabled:opacity-50"
                >
                  {renameMutation.isPending ? "..." : "OK"}
                </button>
                <button
                  onClick={() => { setRenameId(null); setRenameValue(""); }}
                  className="bg-gray-200 dark:bg-gray-700 text-black dark:text-white font-black px-4 py-3 border-4 border-black dark:border-white hover:bg-[#ff3333] hover:text-white transition-colors"
                >
                  Hủy
                </button>
              </div>
            ) : (
              <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-black dark:text-white leading-tight break-words">
                {doc.originalName}
              </h2>
            )}
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-lg text-black dark:text-white mb-8">
            <div className="border-2 border-black dark:border-white p-4 bg-[#f4f4f0] dark:bg-[#222]">
              <span className="block text-xs font-bold text-gray-500 uppercase mb-1">Format</span>
              <span className="font-black">{getFormatLabel(doc.contentType)}</span>
            </div>
            <div className="border-2 border-black dark:border-white p-4 bg-[#f4f4f0] dark:bg-[#222]">
              <span className="block text-xs font-bold text-gray-500 uppercase mb-1">Size</span>
              <span className="font-black">{formatFileSize(doc.size)}</span>
            </div>
            <div className="border-2 border-black dark:border-white p-4 bg-[#f4f4f0] dark:bg-[#222]">
              <span className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</span>
              <span className={`font-black ${doc.visible ? "text-green-600" : "text-red-500"}`}>
                {doc.visible ? "Công khai" : "Đã ẩn"}
              </span>
            </div>
            <div className="border-2 border-black dark:border-white p-4 bg-[#f4f4f0] dark:bg-[#222]">
              <span className="block text-xs font-bold text-gray-500 uppercase mb-1">Date</span>
              <span className="font-black text-sm">{formatDate(doc.createdAt)}</span>
            </div>
          </div>

          {/* Replace file section */}
          <input ref={replaceFileRef} type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={handleReplaceFileChange} />

          {/* Action buttons */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {/* Download */}
            <button
              onClick={(e) => handleDownload(doc.id, doc.originalName, e)}
              className="bg-[#cbfe00] text-black font-black uppercase px-4 py-4 hover:bg-[#3366ff] hover:text-white transition-colors border-4 border-black dark:border-white shadow-[4px_4px_0_0_#000] dark:shadow-[4px_4px_0_0_#fff] text-sm"
            >
              {t("download")} &darr;
            </button>

            {/* Rename */}
            <button
              onClick={() => {
                const nameWithoutExt = doc.originalName.replace(/\.[^/.]+$/, "");
                setRenameId(doc.id);
                setRenameValue(nameWithoutExt);
              }}
              className="bg-white dark:bg-[#222] text-black dark:text-white font-black uppercase px-4 py-4 hover:bg-[#cbfe00] hover:text-black transition-colors border-4 border-black dark:border-white shadow-[4px_4px_0_0_#000] dark:shadow-[4px_4px_0_0_#fff] text-sm"
            >
              Đổi tên
            </button>

            {/* Replace */}
            <button
              onClick={() => {
                setReplaceId(doc.id);
                replaceFileRef.current?.click();
              }}
              disabled={replaceMutation.isPending}
              className="bg-white dark:bg-[#222] text-black dark:text-white font-black uppercase px-4 py-4 hover:bg-[#cbfe00] hover:text-black transition-colors border-4 border-black dark:border-white shadow-[4px_4px_0_0_#000] dark:shadow-[4px_4px_0_0_#fff] text-sm disabled:opacity-50"
            >
              {replaceMutation.isPending ? "Đang thay..." : "Thay file"}
            </button>

            {/* Toggle Visibility */}
            <button
              onClick={() => visibilityMutation.mutate({ id: doc.id, visible: !doc.visible })}
              disabled={visibilityMutation.isPending}
              className={`font-black uppercase px-4 py-4 transition-colors border-4 border-black dark:border-white shadow-[4px_4px_0_0_#000] dark:shadow-[4px_4px_0_0_#fff] text-sm disabled:opacity-50 ${
                doc.visible
                  ? "bg-gray-800 text-white hover:bg-black"
                  : "bg-[#cbfe00] text-black hover:bg-green-400"
              }`}
            >
              {visibilityMutation.isPending ? "..." : doc.visible ? "Ẩn đi" : "Công khai"}
            </button>

            {/* View Details */}
            <Link
              href={`/${locale}/menu/${doc.id}`}
              className="bg-black text-[#cbfe00] font-black uppercase px-4 py-4 hover:bg-[#cbfe00] hover:text-black transition-colors border-4 border-black dark:border-white shadow-[4px_4px_0_0_#000] dark:shadow-[4px_4px_0_0_#fff] text-sm text-center"
            >
              {t("view_details")}
            </Link>

            {/* Delete */}
            <button
              onClick={(e) => handleDelete(doc.id, doc.originalName, e)}
              disabled={deleteMutation.isPending}
              className="bg-[#ff3333] text-white font-black uppercase px-4 py-4 hover:bg-black transition-colors border-4 border-black dark:border-white shadow-[4px_4px_0_0_#000] dark:shadow-[4px_4px_0_0_#fff] text-sm disabled:opacity-50"
            >
              {deleteMutation.isPending ? "Đang xóa..." : "Xóa"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const ContactForm = () => (
    <section className="bg-[#f4f4f0] dark:bg-[#121212] py-20 px-8 md:px-16 lg:px-24" id="contact">
      <div className="max-w-4xl mx-auto flex flex-col items-center">
        <h2 className="text-4xl md:text-6xl font-black mb-12 text-black dark:text-white uppercase tracking-tighter text-center">
          {t("click_to_contacts")}
        </h2>
        <form className="w-full bg-white dark:bg-black border-4 border-black dark:border-white shadow-[12px_12px_0_0_#000] dark:shadow-[12px_12px_0_0_#fff] p-8 md:p-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <label htmlFor="name" className="block font-black text-xl mb-3 text-black dark:text-white uppercase">Identificator [Name]</label>
              <input type="text" id="name" className="w-full px-4 py-3 bg-[#f4f4f0] dark:bg-[#222] border-4 border-black dark:border-white focus:outline-none focus:bg-[#cbfe00] focus:text-black dark:focus:bg-[#cbfe00] text-lg font-bold transition-colors shadow-[4px_4px_0_0_#000] dark:shadow-[4px_4px_0_0_#555]" placeholder="ENTER NAME" />
            </div>
            <div>
              <label htmlFor="email" className="block font-black text-xl mb-3 text-black dark:text-white uppercase">Transmission [Email]</label>
              <input type="email" id="email" className="w-full px-4 py-3 bg-[#f4f4f0] dark:bg-[#222] border-4 border-black dark:border-white focus:outline-none focus:bg-[#cbfe00] focus:text-black dark:focus:bg-[#cbfe00] text-lg font-bold transition-colors shadow-[4px_4px_0_0_#000] dark:shadow-[4px_4px_0_0_#555]" placeholder="ENTER EMAIL" />
            </div>
          </div>
          <div className="mb-8">
            <label htmlFor="message" className="block font-black text-xl mb-3 text-black dark:text-white uppercase">Data Payload [Message]</label>
            <textarea id="message" className="w-full px-4 py-3 bg-[#f4f4f0] dark:bg-[#222] border-4 border-black dark:border-white focus:outline-none focus:bg-[#cbfe00] focus:text-black dark:focus:bg-[#cbfe00] text-lg font-bold transition-colors shadow-[4px_4px_0_0_#000] dark:shadow-[4px_4px_0_0_#555]" rows={5} placeholder="ENTER MESSAGE"></textarea>
          </div>
          <button type="submit" className="w-full bg-black text-white hover:bg-[#ff3333] hover:text-white dark:bg-white dark:text-black dark:hover:bg-[#ff3333] border-4 border-black dark:border-white text-2xl font-black py-4 uppercase tracking-widest transition-colors shadow-[6px_6px_0_0_#000] dark:shadow-[6px_6px_0_0_#fff]" onClick={(e) => e.preventDefault()}>
            Transmit Data
          </button>
        </form>
      </div>
    </section>
  );

  const Footer = () => (
    <footer className="bg-black text-white py-12 border-t-8 border-[#cbfe00]">
      <div className="container mx-auto text-center flex flex-col items-center">
        <div className="font-black text-4xl tracking-widest mb-4">ARCHIVE_SYS</div>
        <p className="font-mono text-sm text-gray-400">&copy; 2026 UNIVERSITY RECORDS CENTER. ALL PROTOCOLS OBSERVED.</p>
      </div>
    </footer>
  );

  return (
    <>
      {status === "loading" ? (
        <Loading />
      ) : (
        <div className="bg-[#f4f4f0] dark:bg-[#121212] min-h-screen font-sans selection:bg-black selection:text-[#cbfe00] dark:selection:bg-[#cbfe00] dark:selection:text-black">
          <TitleSection />
          <DocumentLibrary />
          <ContactForm />
          <Footer />
          <DocModalAll />
          <DocModalMy />
          <UploadModal />
        </div>
      )}
    </>
  );
}

export default MenuPage;
