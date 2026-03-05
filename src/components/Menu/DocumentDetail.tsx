"use client";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

const mockDocuments = [
  {
    id: 1,
    title: "Advanced Machine Learning Notes",
    category: "engineering",
    size: "4.2 MB",
    downloads: 1240,
    author: "Prof. Alan Turing",
    year: 2024,
    pages: 120,
    format: "PDF",
    description:
      "Comprehensive notes covering supervised learning, deep neural networks, reinforcement learning, and transformer architectures. Includes practical examples with Python and PyTorch.",
  },
  {
    id: 2,
    title: "Microeconomics Case Studies",
    category: "business",
    size: "1.8 MB",
    downloads: 890,
    author: "Dr. Adam Smith",
    year: 2023,
    pages: 45,
    format: "DOCX",
    description:
      "A collection of real-world microeconomics case studies analyzing market structures, consumer behavior, and pricing strategies across various industries.",
  },
  {
    id: 3,
    title: "Modern Philosophy Anthology",
    category: "arts",
    size: "5.5 MB",
    downloads: 2100,
    author: "Nietzsche Fan",
    year: 2023,
    pages: 300,
    format: "EPUB",
    description:
      "An anthology of modern philosophical works from existentialism to post-structuralism. Features excerpts from Sartre, Foucault, Derrida, and contemporary thinkers.",
  },
  {
    id: 4,
    title: "Human Anatomy Lab Manual",
    category: "medical",
    size: "15.0 MB",
    downloads: 3400,
    author: "MedStudent99",
    year: 2025,
    pages: 85,
    format: "PDF",
    description:
      "Detailed lab manual with high-resolution anatomical diagrams, dissection guides, and clinical correlation notes for first-year medical students.",
  },
  {
    id: 5,
    title: "Cognitive Psychology Survey",
    category: "social",
    size: "2.1 MB",
    downloads: 430,
    author: "PsychDept",
    year: 2024,
    pages: 62,
    format: "PDF",
    description:
      "Survey of cognitive psychology research covering memory, attention, perception, language processing, and decision-making frameworks.",
  },
  {
    id: 6,
    title: "Corporate Law Precedents",
    category: "law",
    size: "8.3 MB",
    downloads: 110,
    author: "LegalEagle",
    year: 2024,
    pages: 410,
    format: "PDF",
    description:
      "Collection of landmark corporate law cases with detailed analysis, legal reasoning breakdowns, and implications for modern business practice.",
  },
];

function DocumentDetail({ id }: { id: string }) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("DocumentDetailPage");
  const [downloading, setDownloading] = useState(false);

  const doc = mockDocuments.find((d) => d.id === Number(id));

  if (!doc) {
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

  const handleDownload = () => {
    setDownloading(true);
    toast.success(t("download_started"), {
      description: `${doc.title} (${doc.size})`,
      duration: 3000,
    });
    setTimeout(() => {
      setDownloading(false);
      toast.success(t("download_complete"), {
        description: doc.title,
        duration: 3000,
      });
    }, 2000);
  };

  const formatColor: Record<string, string> = {
    PDF: "bg-[#ff3333]",
    DOCX: "bg-[#3366ff]",
    EPUB: "bg-[#00aa55]",
  };

  return (
    <div className="min-h-screen bg-[#f4f4f0] dark:bg-[#121212] font-sans selection:bg-black selection:text-[#cbfe00] dark:selection:bg-[#cbfe00] dark:selection:text-black">
      {/* Back navigation */}
      <section className="pt-8 px-8 md:px-16 lg:px-24">
        <div className="max-w-5xl mx-auto">
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

      {/* Document Header */}
      <section className="pt-8 pb-12 px-8 md:px-16 lg:px-24">
        <div className="max-w-5xl mx-auto border-4 border-black dark:border-white shadow-[12px_12px_0_0_#000] dark:shadow-[12px_12px_0_0_#cbfe00] bg-white dark:bg-[#1a1a1a] p-8 md:p-12 relative overflow-hidden">
          {/* Format badge */}
          <div className="absolute -top-6 -right-6 w-32 h-32 border-[6px] border-black dark:border-white rounded-full flex items-center justify-center rotate-12 pointer-events-none">
            <span
              className={`${formatColor[doc.format] || "bg-gray-500"} text-white font-black text-xl px-3 py-1 border-2 border-black`}
            >
              {doc.format}
            </span>
          </div>

          {/* ID & Status */}
          <div className="flex justify-between items-center mb-6">
            <span className="bg-black text-[#cbfe00] font-mono px-4 py-2 font-bold text-sm">
              RECORD_ID: {doc.id}
            </span>
            <span className="text-[#3366ff] font-extrabold uppercase text-sm">
              {t("verified")}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-black dark:text-white leading-none mb-6">
            {doc.title}
          </h1>

          {/* Category */}
          <p className="text-xl font-bold text-[#ff3333] border-l-8 border-black dark:border-white pl-4 mb-8">
            {t(`category_${doc.category}`)}
          </p>

          {/* Description */}
          <div className="border-4 border-dashed border-gray-300 dark:border-gray-600 p-6 mb-8 bg-[#f4f4f0] dark:bg-[#0a0a0a]">
            <h3 className="font-black uppercase text-sm text-gray-500 mb-3">
              {t("description")}
            </h3>
            <p className="text-lg text-black dark:text-gray-200 leading-relaxed font-medium">
              {doc.description}
            </p>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <div className="border-4 border-black dark:border-white p-4 bg-[#f4f4f0] dark:bg-[#222] text-center">
              <span className="block text-xs font-bold text-gray-500 uppercase mb-2">
                {t("author")}
              </span>
              <span
                className="font-black text-black dark:text-white text-sm truncate block"
                title={doc.author}
              >
                {doc.author}
              </span>
            </div>
            <div className="border-4 border-black dark:border-white p-4 bg-[#f4f4f0] dark:bg-[#222] text-center">
              <span className="block text-xs font-bold text-gray-500 uppercase mb-2">
                {t("format")}
              </span>
              <span className="font-black text-black dark:text-white">
                {doc.format}
              </span>
            </div>
            <div className="border-4 border-black dark:border-white p-4 bg-[#f4f4f0] dark:bg-[#222] text-center">
              <span className="block text-xs font-bold text-gray-500 uppercase mb-2">
                {t("size")}
              </span>
              <span className="font-black text-black dark:text-white">
                {doc.size}
              </span>
            </div>
            <div className="border-4 border-black dark:border-white p-4 bg-[#f4f4f0] dark:bg-[#222] text-center">
              <span className="block text-xs font-bold text-gray-500 uppercase mb-2">
                {t("pages")}
              </span>
              <span className="font-black text-black dark:text-white">
                {doc.pages}
              </span>
            </div>
            <div className="border-4 border-black dark:border-white p-4 bg-[#f4f4f0] dark:bg-[#222] text-center">
              <span className="block text-xs font-bold text-gray-500 uppercase mb-2">
                {t("year")}
              </span>
              <span className="font-black text-black dark:text-white">
                {doc.year}
              </span>
            </div>
            <div className="border-4 border-black dark:border-white p-4 bg-[#cbfe00] text-center">
              <span className="block text-xs font-bold text-gray-700 uppercase mb-2">
                {t("downloads")}
              </span>
              <span className="font-black text-black text-lg">
                {doc.downloads.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 border-t-8 border-black dark:border-white pt-8">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex-1 bg-[#cbfe00] text-black font-black uppercase px-8 py-5 text-xl hover:bg-[#ff3333] hover:text-white transition-colors border-4 border-black dark:border-white shadow-[6px_6px_0_0_#000] dark:shadow-[6px_6px_0_0_#fff] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloading ? t("downloading") : t("download_file")}
            </button>
            <button
              onClick={() => {
                toast.info(t("preview_coming_soon"));
              }}
              className="flex-1 bg-white dark:bg-black text-black dark:text-white font-black uppercase px-8 py-5 text-xl hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors border-4 border-black dark:border-white"
            >
              {t("preview")}
            </button>
          </div>
        </div>
      </section>

      {/* Related docs hint */}
      <section className="pb-16 px-8 md:px-16 lg:px-24">
        <div className="max-w-5xl mx-auto">
          <div className="border-4 border-black dark:border-white bg-black dark:bg-white p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-white dark:text-black font-black uppercase text-lg">
              {t("explore_more")}
            </p>
            <button
              onClick={() => router.push(`/${locale}/menu`)}
              className="bg-[#cbfe00] text-black font-black uppercase px-6 py-3 border-4 border-white dark:border-black hover:bg-[#ff3333] hover:text-white hover:border-black transition-colors"
            >
              {t("browse_all")}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default DocumentDetail;
