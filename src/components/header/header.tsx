"use client";
import Link from "next/link";
import SwitchTheme from "@/components/switchbtn/switch.btn";
import LocalSwitcher from "../SwitchLangue/switcherLangue";
import { useLocale } from "next-intl";

function NavigateHome() {
  const localActive = useLocale();

  return (
    <header>
      <div className="flex z-50 items-center h-[80px] fixed top-0 left-0 right-0 bg-white dark:bg-black border-b-4 border-black dark:border-white transition-colors duration-300">
        <div className="flex text-xl items-center w-full sm:ml-auto md:text-2xl lg:text-3xl font-black uppercase">
          {/* Bên trái sát cạnh màn hình: switch + language */}
          <div className="flex items-center gap-3 ml-2 mr-4">
            <div className="hidden sm:block">
              <SwitchTheme />
            </div>
            <div className="hidden sm:block">
              <LocalSwitcher />
            </div>
          </div>

          <div className="ml-auto mr-4 text-sm sm:text-base md:text-2xl lg:text-3xl">
            <Link
              className="text-black font-extrabold tracking-tighter dark:text-white hover:bg-[#cbfe00] dark:hover:text-black px-2 transition-colors"
              href={`/${localActive}`}
            >
              Home
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

export default NavigateHome;
