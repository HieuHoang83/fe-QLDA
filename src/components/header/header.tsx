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
async function fetchData(url: string, body: any) {
  // You can await here
  try {
    const response: AxiosResponse = await axios.post(url, {}, body);

    return response.data;
  } catch (error: any) {
    return {
      statusCode: error?.response?.data?.statusCode ?? 400,
      error: error?.response?.data?.error ?? "error",
      message: error?.response?.data?.message ?? "message",
    };
  }
}
type Callback = () => void;
function NavigateHome() {
  const { data: session, status, update } = useSession();
  //@ts-ignore
  const localActive = useLocale();
  let current = usePathname();
  const handleLogout = async () => {
    const response = await fetchData(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/v1/auth/logout`,
      {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      }
    ); //token
    //call api by token =>user

    if (response.error) {
      alert(response.message);
    } else {
      signOut();
    }
  };

  const Setting = ({ isShow = false }) => {
    return (
      <div className="relative ml-2 z-[60]">
        <button
          className={`setting-button font-black uppercase text-base border-2 border-transparent hover:border-black dark:hover:border-white transition-all px-4 py-2 w-full ${
            isShow ? "text-white bg-black" : "text-black dark:text-white"
          }`}
          onClick={() => {
            const settingMenu = document.querySelector(".setting-menu");
            if (settingMenu) settingMenu.classList.toggle("hidden");
          }}
        >
          Options
        </button>
        <div className="setting-menu hidden bg-white dark:bg-black border-4 border-black dark:border-white shadow-[8px_8px_0_0_#000] dark:shadow-[8px_8px_0_0_#fff] fixed top-[80px] right-[10px] w-[200px] z-[60]">
          <h3 className="text-xl font-black text-black dark:text-white border-b-4 border-black dark:border-white px-4 py-2 cursor-default uppercase bg-[#cbfe00] dark:bg-[#333]">
            System
          </h3>
          <ul className="text-black dark:text-white font-bold">
            <li className="text-lg py-3 flex justify-end items-center border-b-2 border-black dark:border-white pr-4 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <SwitchTheme />
            </li>
            <li className="text-lg py-3 pl-4 border-b-2 border-black dark:border-white pr-4 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <LocalSwitcher></LocalSwitcher>
            </li>

            <li className="text-lg w-full">
              {session ? (
                <button
                  onClick={handleLogout}
                  className="block w-full bg-[#ff3333] text-white hover:bg-black uppercase font-black py-4 transition-colors"
                >
                  Terminate
                </button>
              ) : (
                <Link
                  href={`/${localActive}/auth/login`}
                  className="flex items-center justify-center w-full bg-black text-white hover:bg-[#cbfe00] hover:text-black uppercase font-black py-4 border-t-2 border-black dark:border-white transition-colors"
                >
                  Authenticate
                </Link>
              )}
            </li>
          </ul>
        </div>
      </div>
    );
  };

  return (
    <header>
      <div className="flex z-50 items-center h-[80px] fixed top-0 left-0 right-0 bg-white dark:bg-black border-b-4 border-black dark:border-white transition-colors duration-300">
        <div className="flex text-xl mr-8 items-center relative w-full sm:ml-auto md:text-2xl md:justify-end lg:text-3xl font-black uppercase">
          <Link
            className="text-black font-extrabold tracking-tighter sm:ml-3 md:ml-8 ml-2 dark:text-white hover:bg-[#cbfe00] dark:hover:text-black px-2 transition-colors"
            href={`/${localActive}`}
          >
            Home
          </Link>
          <Link
            className="text-black font-extrabold tracking-tighter sm:ml-3 md:ml-8 ml-2 dark:text-white hover:bg-[#ff3333] hover:text-white px-2 transition-colors"
            href={`/${localActive}/menu`}
          >
            Menu
          </Link>
          <Setting />
        </div>
      </div>
    </header>
  );
}

export default NavigateHome;
