"use client";
import { PrimeReactProvider, PrimeReactContext } from "primereact/api";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "primereact/button";
import { Menu } from "primereact/menu";
import { Toast } from "primereact/toast";
import { useEffect, useRef, useState } from "react";
import axios, { AxiosResponse } from "axios";
import SwitchTheme from "@/components/switchbtn/switch.btn";
import { useThemeContext } from "@/library/ThemeProvider";
import LocalSwitcher from "../SwitchLangue/switcherLangue";
import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { logout as logoutLocal } from "@/services/api/auth";
type Callback = () => void;
function NavigateHome() {
  const { data: session, status, update } = useSession();
  //@ts-ignore
  const localActive = useLocale();
  const router = useRouter();
  let current = usePathname();
  const handleLogout = async () => {
    logoutLocal();
    await signOut({ redirect: true, callbackUrl: `/${localActive}/auth/login` });
  };

  const Setting = ({ isShow = false }) => {
    const isVi = localActive === "vi";
    const titleLabel = isVi ? "Người dùng" : "User";
    const signInLabel = isVi ? "Đăng nhập" : "Sign in";
    const signOutLabel = isVi ? "Đăng xuất" : "Sign out";
    const profileLabel = isVi ? "Thông tin tài khoản" : "User info";

    const userName =
      // @ts-ignore
      session?.user?.username ||
      // @ts-ignore
      session?.user?.name ||
      "User";
    const userInitial = userName.charAt(0).toUpperCase();

    return (
      <div className="relative ml-2 z-[60]">
        <button
          className={`setting-button font-black uppercase text-base border-2 border-transparent hover:border-black dark:hover:border-white transition-all px-3 py-1 w-full ${
            isShow ? "text-white bg-black" : "text-black dark:text-white"
          }`}
          onClick={() => {
            const settingMenu = document.querySelector(".setting-menu");
            if (settingMenu) settingMenu.classList.toggle("hidden");
          }}
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center text-sm">
              {userInitial}
            </div>
            {session && (
              <span className="hidden sm:inline-block text-xs font-semibold normal-case max-w-[120px] truncate">
                {userName}
              </span>
            )}
          </div>
        </button>
        <div className="setting-menu hidden bg-white dark:bg-black border-4 border-black dark:border-white shadow-[8px_8px_0_0_#000] dark:shadow-[8px_8px_0_0_#fff] fixed top-[80px] right-[10px] w-[220px] z-[60]">
          <ul className="text-black dark:text-white font-bold">
            {session && (
              <>
                <li className="text-sm w-full border-b-2 border-black dark:border-white">
                  <button
                    onClick={() => router.push(`/${localActive}/private`)}
                    className="block w-full bg-white dark:bg-black text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 font-semibold py-3 px-4 text-left"
                  >
                    {profileLabel}
                  </button>
                </li>
                <li className="text-lg w-full">
                  <button
                    onClick={handleLogout}
                    className="block w-full bg-[#ff3333] text-white hover:bg-black uppercase font-black py-4 transition-colors"
                  >
                    {signOutLabel}
                  </button>
                </li>
              </>
            )}
            {!session && (
              <li className="text-lg w-full">
                <button
                  onClick={() => router.push(`/${localActive}/auth/login`)}
                  className="block w-full bg-black text-white hover:bg-[#cbfe00] hover:text-black uppercase font-black py-4 border-t-2 border-black dark:border-white transition-colors"
                >
                  {signInLabel}
                </button>
              </li>
            )}
          </ul>
        </div>
      </div>
    );
  };

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

          {/* Ở giữa lệch sang phải: Home + Menu */}
          <div className="flex items-center gap-4 ml-auto mr-4">
            <Link
              className="text-black font-extrabold tracking-tighter dark:text-white hover:bg-[#cbfe00] dark:hover:text-black px-2 transition-colors"
              href={`/${localActive}`}
            >
              Home
            </Link>
            <Link
              className="text-black font-extrabold tracking-tighter dark:text-white hover:bg-[#ff3333] hover:text-white px-2 transition-colors"
              href={`/${localActive}/menu`}
            >
              Menu
            </Link>
          </div>

          {/* Bên phải cạnh Home/Menu: icon user */}
          <div className="mr-4">
            <Setting />
          </div>
        </div>
      </div>
    </header>
  );
}

export default NavigateHome;
