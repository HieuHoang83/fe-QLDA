"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";

function MainHome() {
  const { status } = useSession({ required: false });
  const t = useTranslations("HomePage");
  const localActive = useLocale();

  const welcomeText = t("welcome_message") || "";
  // Attempt to split welcome message nicely if there are periods, else just show it
  const parts = welcomeText.includes(".") ? welcomeText.split(".") : [welcomeText, ""];

  return (
    <div className="relative mt-[80px] min-h-[calc(100vh-80px)] w-full bg-[#f4f4f0] dark:bg-[#121212] flex items-center justify-center p-8 overflow-hidden font-sans selection:bg-black selection:text-[#cbfe00] dark:selection:bg-[#cbfe00] dark:selection:text-black">
      {/* Background Decor */}
      <div 
        className="absolute inset-0 z-0 opacity-20 pointer-events-none dark:invert" 
        style={{ backgroundImage: 'radial-gradient(#000 2px, transparent 2px)', backgroundSize: '30px 30px' }}
      ></div>

      <div className="relative z-10 max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left Column: Typography */}
        <div className="flex flex-col gap-8">
          <div className="inline-block w-fit bg-[#ff3333] text-white font-bold tracking-widest uppercase px-4 py-2 text-sm border-2 border-black dark:border-white shadow-[4px_4px_0_0_#000] dark:shadow-[4px_4px_0_0_#fff]">
            Knowledge Base v2.0
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black uppercase leading-[0.9] text-black dark:text-white tracking-tighter">
            {parts[0]}
            {parts.length > 1 && parts[0] && "."}
            <br />
            {parts.slice(1).join(".").trim() && (
              <span className="text-transparent inline-block mt-2" style={{ WebkitTextStroke: '2px currentColor' }}>
                {parts.slice(1).join(".")}
              </span>
            )}
          </h1>

          <p className="text-xl md:text-2xl font-medium text-black dark:text-gray-300 max-w-xl border-l-8 border-[#cbfe00] pl-6 py-2 bg-white/50 dark:bg-black/50 backdrop-blur-sm">
            {t("sub_message")}
          </p>

          <div className="flex flex-wrap gap-6 mt-6">
            <Link href={`/${localActive}/menu`} className="group relative inline-block text-lg font-black uppercase transition-transform hover:-translate-y-1 hover:-translate-x-1">
              <span className="absolute inset-0 border-4 border-black dark:border-white bg-black dark:bg-white translate-x-2 translate-y-2 transition-transform group-hover:translate-x-3 group-hover:translate-y-3"></span>
              <span className="relative flex items-center justify-center border-4 border-black dark:border-white bg-[#cbfe00] text-black px-10 py-5">
                Explore Archives
              </span>
            </Link>
            
            <Link href={`/${localActive}/auth/login`} className="group relative inline-block text-lg font-black uppercase transition-transform hover:-translate-y-1 hover:-translate-x-1">
              <span className="absolute inset-0 border-4 border-black dark:border-white bg-black dark:bg-white translate-x-2 translate-y-2 transition-transform group-hover:translate-x-3 group-hover:translate-y-3"></span>
              <span className="relative flex items-center justify-center border-4 border-black dark:border-white bg-white dark:bg-black dark:text-white text-black px-10 py-5">
                Contribute Now
              </span>
            </Link>
          </div>
        </div>

        {/* Right Column: Visual Elements */}
        <div className="hidden lg:flex justify-center items-center relative h-full min-h-[500px]">
          {/* Decorative Post-its / Folders */}
          <div className="absolute w-[400px] h-[480px] bg-[#3366ff] border-4 border-black dark:border-white shadow-[16px_16px_0_0_#000] dark:shadow-[16px_16px_0_0_#cbfe00] rotate-[-4deg] transition-all hover:rotate-0 hover:z-20 duration-300 z-10 flex flex-col p-6">
             <div className="border-b-4 border-black dark:border-white pb-4 mb-4 flex justify-between items-center text-white">
                <span className="font-extrabold text-3xl tracking-tight">MATERIAL_01.PDF</span>
                <span className="font-mono text-lg font-bold bg-black text-[#cbfe00] px-2 py-1">2.4MB</span>
             </div>
             <div className="flex-1 bg-[#f4f4f0] border-4 border-black dark:border-white overflow-hidden relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-black text-9xl opacity-10 tracking-tighter text-black">FILE</span>
                </div>
                {/* Abstract Content Lines */}
                <div className="h-full w-full p-6 flex flex-col gap-4 z-10 relative">
                  <div className="h-6 bg-black w-3/4 hover:w-full transition-all"></div>
                  <div className="h-6 bg-black w-full hover:bg-[#ff3333] transition-colors"></div>
                  <div className="h-6 bg-black w-5/6"></div>
                  <div className="h-6 bg-black w-1/2"></div>
                  <div className="h-6 bg-transparent"></div>
                  <div className="h-6 bg-[#cbfe00] border-2 border-black w-full"></div>
                  <div className="h-6 bg-black w-2/3"></div>
                </div>
             </div>
          </div>
          
          <div className="absolute w-[360px] h-[440px] bg-white dark:bg-[#222] border-4 border-black dark:border-white shadow-[16px_16px_0_0_#000] dark:shadow-[16px_16px_0_0_#fff] rotate-[6deg] hover:rotate-0 hover:z-20 transition-all duration-300 z-0 ml-32 mt-32">
             <div className="w-full h-full p-6 text-black dark:text-white flex flex-col">
                <h3 className="text-4xl font-black uppercase border-b-4 border-black dark:border-white pb-4 tracking-tighter">Top Downloads</h3>
                <ul className="mt-6 flex flex-col gap-6 font-bold text-xl flex-1">
                  <li className="flex justify-between items-end border-b-4 border-black dark:border-white pb-2 border-dotted">
                    <span className="truncate pr-4 bg-[#cbfe00] dark:text-black px-2">CS101_Midterm.pdf</span>
                    <span className="whitespace-nowrap font-mono text-sm">2.1k DL</span>
                  </li>
                  <li className="flex justify-between items-end border-b-4 border-black dark:border-white pb-2 border-dotted">
                    <span className="truncate pr-4 hover:bg-[#ff3333] hover:text-white px-2 transition-colors">Econ_Notes.docx</span>
                    <span className="whitespace-nowrap font-mono text-sm">1.8k DL</span>
                  </li>
                  <li className="flex justify-between items-end border-b-4 border-black dark:border-white pb-2 border-dotted">
                    <span className="truncate pr-4">Chem_Cheatsheet.png</span>
                    <span className="whitespace-nowrap font-mono text-sm">3.4k DL</span>
                  </li>
                </ul>
                <div className="mt-auto pt-4 border-t-4 border-black dark:border-white text-center font-black text-2xl uppercase tracking-widest text-[#ff3333]">
                  Updated Daily
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MainHome;
