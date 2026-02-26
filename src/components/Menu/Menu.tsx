"use client";
import { useSession } from "next-auth/react";
import Loading from "@/components/Loadingpage/loading";
import { useState } from "react";
import { useTranslations } from "next-intl";

function MenuPage() {
  const { status } = useSession({
    required: false,
  });
  const t = useTranslations("MenuPage");

  const [selectedDoc, setSelectedDoc] = useState<any>(null);

  const mockDocuments = [
    { id: 1, title: "Advanced Machine Learning Notes", category: t("Pasta Perfection"), size: "4.2 MB", downloads: 1240, author: "Prof. Alan Turing", year: 2024, pages: 120, format: "PDF" },
    { id: 2, title: "Microeconomics Case Studies", category: t("Sushi Mastery"), size: "1.8 MB", downloads: 890, author: "Dr. Adam Smith", year: 2023, pages: 45, format: "DOCX" },
    { id: 3, title: "Modern Philosophy Anthology", category: t("Smoky BBQ Delights"), size: "5.5 MB", downloads: 2100, author: "Nietzsche Fan", year: 2023, pages: 300, format: "EPUB" },
    { id: 4, title: "Human Anatomy Lab Manual", category: t("Hearty Veggie Bowl"), size: "15.0 MB", downloads: 3400, author: "MedStudent99", year: 2025, pages: 85, format: "PDF" },
    { id: 5, title: "Cognitive Psychology Survey", category: t("Mediterranean Quinoa Salad"), size: "2.1 MB", downloads: 430, author: "PsychDept", year: 2024, pages: 62, format: "PDF" },
    { id: 6, title: "Corporate Law Precedents", category: t("Crunchy Thai Salad"), size: "8.3 MB", downloads: 110, author: "LegalEagle", year: 2024, pages: 410, format: "PDF" },
  ];

  const TitleSection = () => {
    return (
      <section className="pt-32 pb-16 px-8 md:px-16 lg:px-24 bg-[#f4f4f0] dark:bg-[#121212]">
        <div className="max-w-7xl mx-auto border-4 border-black dark:border-white shadow-[12px_12px_0_0_#000] dark:shadow-[12px_12px_0_0_#cbfe00] p-8 md:p-12 relative overflow-hidden bg-white dark:bg-[#1a1a1a]">
          {/* Decorative stamp */}
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
              <a
                href="#menu"
                className="group relative inline-block text-lg font-black uppercase transition-transform hover:-translate-y-1 hover:-translate-x-1"
              >
                <span className="absolute inset-0 border-4 border-black dark:border-white bg-black dark:bg-white translate-x-2 translate-y-2 transition-transform group-hover:translate-x-3 group-hover:translate-y-3"></span>
                <span className="relative flex items-center justify-center border-4 border-black dark:border-white bg-[#cbfe00] text-black px-8 py-4">
                  {t("click_to_menu")}
                </span>
              </a>
              <a
                href="#contact"
                className="group relative inline-block text-lg font-black uppercase transition-transform hover:-translate-y-1 hover:-translate-x-1"
              >
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
  };

  const DocumentLibrary = () => {
    return (
      <section
        className="bg-[#cbfe00] dark:bg-[#222] py-20 px-8 md:px-16 lg:px-24 border-y-4 border-black dark:border-white"
        id="menu"
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-12 border-b-8 border-black dark:border-white pb-4">
            <h2 className="text-5xl md:text-7xl font-black text-black dark:text-white uppercase tracking-tighter leading-none">
              {t("Menu")}
            </h2>
            <span className="hidden md:inline-block font-mono text-xl font-bold bg-black text-[#cbfe00] px-3 py-1 mb-2">
              {mockDocuments.length} ITEMS
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {mockDocuments.map((doc, index) => (
              <div
                key={index}
                className="bg-white dark:bg-[#111] border-4 border-black dark:border-white shadow-[8px_8px_0_0_#000] dark:shadow-[8px_8px_0_0_#fff] p-6 hover:-translate-y-2 transition-transform cursor-pointer group flex flex-col"
                onClick={() => setSelectedDoc(doc)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-[#ff3333] text-white font-black px-2 py-1 text-xs uppercase border-2 border-black dark:border-white">
                    {doc.format}
                  </div>
                  <div className="font-mono text-sm font-bold text-gray-500">
                    {doc.size}
                  </div>
                </div>
                
                <h3 className="text-2xl font-black uppercase mb-4 text-black dark:text-white group-hover:text-[#ff3333] transition-colors leading-tight line-clamp-2 title-font">
                  {doc.title}
                </h3>
                
                <p className="text-sm font-bold border-l-4 border-black dark:border-white pl-3 text-black dark:text-gray-300 mb-6 flex-1">
                  {doc.category}
                </p>
                
                <div className="mt-auto border-t-2 border-dashed border-gray-400 dark:border-gray-600 pt-4 flex justify-between items-center text-xs font-mono font-bold uppercase text-black dark:text-white">
                  <span>DL: {doc.downloads}</span>
                  <span className="bg-black text-[#cbfe00] px-2 py-1 group-hover:bg-[#cbfe00] group-hover:text-black transition-colors border-2 border-transparent group-hover:border-black">View Details &rarr;</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  };

  const ContactForm = () => {
    return (
      <section
        className="bg-[#f4f4f0] dark:bg-[#121212] py-20 px-8 md:px-16 lg:px-24"
        id="contact"
      >
        <div className="max-w-4xl mx-auto flex flex-col items-center">
          <h2 className="text-4xl md:text-6xl font-black mb-12 text-black dark:text-white uppercase tracking-tighter text-center">
            {t("click_to_contacts")}
          </h2>
          
          <form className="w-full bg-white dark:bg-black border-4 border-black dark:border-white shadow-[12px_12px_0_0_#000] dark:shadow-[12px_12px_0_0_#fff] p-8 md:p-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div>
                <label
                  htmlFor="name"
                  className="block font-black text-xl mb-3 text-black dark:text-white uppercase"
                >
                  Identificator [Name]
                </label>
                <input
                  type="text"
                  id="name"
                  className="w-full px-4 py-3 bg-[#f4f4f0] dark:bg-[#222] border-4 border-black dark:border-white focus:outline-none focus:bg-[#cbfe00] focus:text-black dark:focus:bg-[#cbfe00] text-lg font-bold transition-colors shadow-[4px_4px_0_0_#000] dark:shadow-[4px_4px_0_0_#555]"
                  placeholder="ENTER NAME"
                />
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="block font-black text-xl mb-3 text-black dark:text-white uppercase"
                >
                  Transmission [Email]
                </label>
                <input
                  type="email"
                  id="email"
                  className="w-full px-4 py-3 bg-[#f4f4f0] dark:bg-[#222] border-4 border-black dark:border-white focus:outline-none focus:bg-[#cbfe00] focus:text-black dark:focus:bg-[#cbfe00] text-lg font-bold transition-colors shadow-[4px_4px_0_0_#000] dark:shadow-[4px_4px_0_0_#555]"
                  placeholder="ENTER EMAIL"
                />
              </div>
            </div>
            <div className="mb-8">
              <label
                htmlFor="message"
                className="block font-black text-xl mb-3 text-black dark:text-white uppercase"
              >
                Data Payload [Message]
              </label>
              <textarea
                id="message"
                className="w-full px-4 py-3 bg-[#f4f4f0] dark:bg-[#222] border-4 border-black dark:border-white focus:outline-none focus:bg-[#cbfe00] focus:text-black dark:focus:bg-[#cbfe00] text-lg font-bold transition-colors shadow-[4px_4px_0_0_#000] dark:shadow-[4px_4px_0_0_#555]"
                rows={5}
                placeholder="ENTER MESSAGE"
              ></textarea>
            </div>
            <button
              type="submit"
              className="w-full bg-black text-white hover:bg-[#ff3333] hover:text-white dark:bg-white dark:text-black dark:hover:bg-[#ff3333] border-4 border-black dark:border-white text-2xl font-black py-4 uppercase tracking-widest transition-colors shadow-[6px_6px_0_0_#000] dark:shadow-[6px_6px_0_0_#fff]"
              onClick={(e) => e.preventDefault()}
            >
              Transmit Data
            </button>
          </form>
        </div>
      </section>
    );
  };

  const Footer = () => {
    return (
      <footer className="bg-black text-white py-12 border-t-8 border-[#cbfe00]">
        <div className="container mx-auto text-center flex flex-col items-center">
          <div className="font-black text-4xl tracking-widest mb-4">ARCHIVE_SYS</div>
          <p className="font-mono text-sm text-gray-400">© 2026 UNIVERSITY RECORDS CENTER. ALL PROTOCOLS OBSERVED.</p>
        </div>
      </footer>
    );
  };

  const DocModal = () => {
    if (!selectedDoc) return null;
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm shadow-2xl">
        <div className="bg-white dark:bg-[#0a0a0a] border-4 border-black dark:border-white shadow-[16px_16px_0_0_#cbfe00] max-w-3xl w-full p-8 relative animate-in zoom-in-95 duration-200">
          <button 
            onClick={() => setSelectedDoc(null)} 
            className="absolute -top-4 -right-4 bg-[#ff3333] text-white border-4 border-black dark:border-white font-black px-4 py-2 uppercase hover:bg-black transition-colors shadow-[4px_4px_0_0_#000] dark:shadow-[4px_4px_0_0_#fff]"
          >
            Close [X]
          </button>
          
          <div className="border-b-8 border-black dark:border-white pb-6 mb-6">
            <div className="flex justify-between items-end mb-4">
              <span className="bg-black text-white font-mono px-3 py-1 font-bold">ID_{selectedDoc.id}</span>
              <span className="text-[#3366ff] font-extrabold uppercase">Record Found</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-black dark:text-white leading-tight">
              {selectedDoc.title}
            </h2>
            <p className="text-[#ff3333] font-bold text-xl mt-4 border-l-4 border-black dark:border-white pl-4">
              {selectedDoc.category}
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-lg text-black dark:text-white mb-8">
            <div className="border-2 border-black dark:border-white p-4 bg-[#f4f4f0] dark:bg-[#222]">
              <span className="block text-xs font-bold text-gray-500 uppercase mb-1">Author</span>
              <span className="font-black truncate block" title={selectedDoc.author}>{selectedDoc.author}</span>
            </div>
            <div className="border-2 border-black dark:border-white p-4 bg-[#f4f4f0] dark:bg-[#222]">
              <span className="block text-xs font-bold text-gray-500 uppercase mb-1">Format</span>
              <span className="font-black">{selectedDoc.format}</span>
            </div>
            <div className="border-2 border-black dark:border-white p-4 bg-[#f4f4f0] dark:bg-[#222]">
              <span className="block text-xs font-bold text-gray-500 uppercase mb-1">Size</span>
              <span className="font-black">{selectedDoc.size}</span>
            </div>
            <div className="border-2 border-black dark:border-white p-4 bg-[#f4f4f0] dark:bg-[#222]">
              <span className="block text-xs font-bold text-gray-500 uppercase mb-1">Pages</span>
              <span className="font-black">{selectedDoc.pages}</span>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row justify-end gap-4 mt-8">
             <button className="bg-transparent text-black dark:text-white font-black uppercase px-8 py-4 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors border-4 border-black dark:border-white w-full md:w-auto">
               View Extract
             </button>
             <button className="bg-[#cbfe00] text-black font-black uppercase px-8 py-4 hover:bg-[#ff3333] hover:text-white transition-colors border-4 border-black dark:border-white shadow-[6px_6px_0_0_#000] dark:shadow-[6px_6px_0_0_#fff] w-full md:w-auto">
               Download Payload
             </button>
          </div>
        </div>
      </div>
    );
  };

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
          <DocModal />
        </div>
      )}
    </>
  );
}

export default MenuPage;
