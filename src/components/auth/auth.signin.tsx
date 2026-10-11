"use client";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Toast } from "primereact/toast";
import React, { useEffect, useRef, useState } from "react";
import logo from "../../../public/image/login.webp"; // with import
import Image from "next/image";
import SwitchTheme from "../switchbtn/switch.btn";
import LocalSwitcher from "../SwitchLangue/switcherLangue";
import { useTranslations } from "next-intl";
import HaravanLoginButton from "@/components/auth/HaravanLoginButton";

function Login() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [errUser, setErrUser] = useState("");
  const [errpass, setErrpass] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const toast = useRef(null);
  const t = useTranslations("LoginPage");


  const showError = (Message: string) => {
    //@ts-ignore
    toast.current.show({
      severity: "error",
      summary: "Error",
      detail: Message,
      life: 3000,
    });
  };

  /**
   * Cach 1: tai khoan co san trong he thong (so dien thoai + mat khau).
   */
  const handleSubmit = async () => {
    if (!phone || !password) {
      showError(t("missingCredentials"));
      return;
    }

    setLoading(true);
    try {
      const res = await signIn("credentials", {
        phone: phone.trim(),
        password,
        redirect: false,
      });

      if (res?.error) {
        showError(t("invalidCredentials"));
        return;
      }

      setPhone("");
      setPassword("");
      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const headertitle = () => {
    return (
      <div>
        <div className=" pl-5 pt-0 h-[160px] sm:pl-3 sm:pl-0 sm:mb-0 sm:h-[240px] sm:pt-6 lg:h-[165px]  lg:pt-3 xl:mb-4 xl:ml-0 xl:h-[180px] 2xl:pt-4 2xl:mb-5 ">
          <h1 className="text-white text-4xl  sm:text-blue-500  font-normal text-start  ml-4  sm:ml-3 sm:text-4xl lg:ml-0 sm:text-3xl 2xl:mb-2">
            Hello,
          </h1>
          <h2 className="text-white text-4xl sm:text-4xl lg:text-3xl sm:text-blue-500 font-black text-start  ml-4  sm:ml-3  sm:mt-2 lg:ml-0 sm:mt-0">
            Wellcome!
          </h2>
          <p className="text-white text-xl sm:text-lg  w-[380px] sm:dark:text-white sm:text-black sm:w-[300px] ml-4  sm:ml-3 mt-3 h-[40px] block sm:mt-5 lg:mt-0 xl:mt-2">
            {t("title1")}
            <Link
              href="/auth/register"
              className="font-bold text-blue-600 sm:text-blue-500 pl-1 pr-1"
            >
              {t("title2")}
            </Link>
            {t("title3")}
          </p>
        </div>
      </div>
    );
  };
  const formInput = () => {
    return (
      <div className=" lg:mt-3 xl:mt-8">
        <div className="xl:mt-7 ml-3 w-full  pl-7 pr-14 sm:px-0">
          <label
            htmlFor="Phone"
            className="text-lg sm:text-base font-semibold block mb-1 xl:text-base sm:dark:text-white "
          >
            {t("phone")}
          </label>
          <input
            type="tel"
            inputMode="tel"
            id="Phone"
            placeholder={t("phonePlaceholder")}
            className="border w-full  px-2 py-1 focus:outline-none focus:ring-0 focus:border-gray-600 rounded-md"
            value={phone}
            autoFocus
            onChange={(e) => {
              setErrUser(e.target.value.trim() ? "" : t("phoneRequired"));
              setPhone(e.target.value);
            }}
          />

          <span className="text-white mt-3 font-medium sm:mt-1 sm:h-3 lg:mt-1 xl:mt-1 mb-0 sm:text-red-500 block lg:h-3 xl:h-5 xl:text-base xl:text-xl items-center ">
            {errUser}
          </span>
        </div>
        <div className="sm:mt-4 lg:mt-3 ml-3 w-full xl:mt-[6px] pl-7 pr-14 sm:px-0">
          <label
            htmlFor="Password "
            className="text-lg sm:text-base sm:dark:text-white block mb-1  font-semibold  xl:text-base  "
          >
            {t("password")}
          </label>
          <input
            type="password"
            id="Password"
            placeholder={t("passwordPlaceholder")}
            className="border w-full  px-2 py-1 focus:outline-none focus:ring-0 focus:border-gray-600 rounded-md"
            value={password}
            onChange={(e) => {
              setErrpass(e.target.value ? "" : t("passwordRequired"));
              setPassword(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSubmit();
              }
            }}
          />

          <span className="text-white mt-3 font-medium sm:h-3  sm:mt-1 lg:mt-1 xl:mt-1 mb-0 sm:text-red-500 block lg:h-3 xl:h-5 xl:text-base xl:text-xl items-center ">
            {errpass}
          </span>
        </div>
      </div>
    );
  };
  const footerLogin = () => {
    return (
      <>
        <button
          className="block border-none rounded-[50px] py-[5px] w-[60%] mx-auto text-xl text-white font-semibold bg-gradient-to-r from-blue-400  to-pink-400 sm:hover:opacity-70 mt-10 sm:mt-6 lg:text-lg lg:py-[3px] lg:mt-4 xl:mt-5 2xl:mt-5 xl:py-[5px] disabled:opacity-60"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? t("loggingIn") : t("login")}
        </button>

        {/* Dung chung mot component voi man dashboard de hai noi dung khong lech nhau. */}
        <HaravanLoginButton className="w-[60%] mx-auto mt-6 sm:w-full" />
      </>
    );
  };
  const imgright = () => {
    return (
      <>
        <Image src={logo} className="w-[100%] h-full xl:object-cover" alt="" />
      </>
    );
  };
  return (
    <div>
      <div className="flex justify-center items-center h-screen bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 dark:bg-gradient-to-r dark:from-gray-800 dark:via-gray-800 dark:to-gray-800 ">
        <div
          className="card flex justify-content-center"
          style={{ height: "30px !important" }}
        >
          <Toast ref={toast} position="bottom-right" />
        </div>

        {/*
          Chieu cao tuong doi + `overflow-y-auto` chu khong dung chieu cao co dinh kem
          `overflow-hidden`: noi dung trang dang nhap da vuot qua 600px (tieu de + 2 o + nut
          dang nhap + nut Haravan) nen phan duoi bi clip, nguoi dung khong thay nut Haravan.
        */}
        <div className="relative dark:bg-gray-600 bg-gradient-login-main  sm:bg-none overflow-y-auto max-h-[100vh] w-[100vw] px-10 py-6 shadow-lg bg-white rounded-md flex justify-center items-start sm:px-0 sm:w-[450px] sm:max-h-[92vh] lg:w-[800px] lg:max-h-[92vh] lg:grid-cols-2 xl:w-[1000px] 2xl:w-[1300px]">
          <div className="">
            {headertitle()}
            {formInput()}

            {footerLogin()}
          </div>
          <div className=" ml-10 dark:bg-gray-600 overflow-hidden hidden lg:block w-[50%]">
            {imgright()}
          </div>
          <div className="absolute top-[15px] right-4">
            <SwitchTheme />
          </div>
          <div className="absolute top-[55px] right-4">
            <LocalSwitcher />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;