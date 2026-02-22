"use client";
import axios, { AxiosResponse } from "axios";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Toast } from "primereact/toast";
import logo from "../../../public/image/register.webp"; // with import
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import SwitchTheme from "../switchbtn/switch.btn";
import { useThemeContext } from "@/library/ThemeProvider";
import { useTranslations } from "next-intl";
import LocalSwitcher from "../SwitchLangue/switcherLangue";
async function fetchData(url: string, body: any) {
  // You can await here
  try {
    const response: AxiosResponse = await axios.post(url, body);

    return response.data;
  } catch (error: any) {
    return {
      statusCode: error?.response?.data?.statusCode ?? 400,
      error: error?.response?.data?.error ?? "error",
      message: error?.response?.data?.message ?? "message",
    };
  }
}
function Register() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmpassword, setConfirmpassword] = useState("");
  const [errUser, setErrUser] = useState("");
  const [errpass, setErrpass] = useState("");
  const [errconfirmpass, setErrConfirmPass] = useState("");
  const router = useRouter();
  const toast = useRef(null);
  const t = useTranslations("RegisterPage");
  const showError = (Message: string) => {
    //@ts-ignore
    toast.current.show({
      severity: "error",
      summary: "Error",
      detail: Message,
      life: 300000,
    });
  };
  const handleSubmit = async () => {
    if (errUser.length != 0 || username.length == 0) {
      if (username.length == 0) {
        setErrUser("Username is required");
      }

      return;
    }
    if (errconfirmpass.length != 0 || confirmpassword.length == 0) {
      if (confirmpassword.length == 0) {
        setErrConfirmPass(" Name display is required");
      }
      return;
    }
    if (errpass.length != 0 || password.length == 0) {
      if (password.length == 0) {
        setErrpass("Password is required");
      }
      return;
    }

    // Add your logic here to call the server to authenticate the user and handle the response.
    const response = await fetchData(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/v1/auth/registerSystem`,
      {
        email: username,
        name: confirmpassword,
        password: password,
      }
    );

    if (response.error) {
      showError(response.message);
      return;
    } else {
      const res = await signIn("credentials", {
        username: username,
        password: password,
        redirect: false,
      });

      if (!res?.error) {
        setUsername("");
        setPassword("");
        router.push("/");
      } else {
        setErrpass(res?.error);
      }
    }
  };
  const headertitle = () => {
    return (
      <div
        className=" mt-3  pl-6 
        sm:pl-0 sm:mb-0 h-[130px] sm:h-[200px] sm:pt-10 
        md:pt-6  lg:h-[90px]  lg:pt-0 
        xl:mb-4 xl:h-[120px]  2xl:pt-5 2xl:mb-5"
      >
        <h1 className="text-white text-4xl sm:text-4xl lg:text-3xl sm:text-blue-500 font-normal text-start  ml-5 sm:ml-4 2xl:mb-2">
          Hello,
        </h1>
        <h2 className="text-white text-4xl sm:text-4xl lg:text-3xl sm:text-blue-500 font-black text-start  ml-5 sm:ml-4 sm:mt-4 lg:mt-0">
          Wellcome!
        </h2>
        <p
          className="text-white text-xl w-[380px]  ml-5 mt-3 h-[40px] block sm:ml-4  sm:mt-5 sm:text-base sm:text-black sm:dark:text-white
          sm:w-[300px] lg:mt-0 xl:mt-2"
        >
          {t("title1")}
          <Link
            href="login"
            className="font-bold text-blue-600 sm:text-blue-500"
          >
            {t("title2")}
          </Link>{" "}
        </p>
      </div>
    );
  };
  const formInput = () => {
    return (
      <div className=" lg:mt-3 xl:mt-8">
        <div className="mt-7 ml-3 w-full xl:mt-10 pl-7 pr-14 sm:px-0">
          <label
            htmlFor="Username"
            className="text-xl text-white sm:text-black sm:dark:text-white sm:text-base font-semibold block mb-1 xl:text-base  "
          >
            Email
          </label>
          <input
            type="text"
            id="Username"
            placeholder="Enter Email..."
            className="border w-full  px-2 py-1 focus:outline-none focus:ring-0 focus:border-gray-600 rounded-md"
            value={username}
            autoFocus
            onChange={(e) => {
              if (e.target.value.length !== 0) {
                setErrUser("");
              } else {
                setErrUser("Username is required");
              }
              setUsername(e.target.value);
            }}
          />

          <span className="text-black font-semibold  text-lg items-center block sm:text-base sm:mt-0  sm:text-red-500  mt-[2px] md:text-base  lg:text-base h-2 xl:mt-0 xl:mb-1 xl:h-2   ">
            {errUser ?? ""}
          </span>
        </div>

        <div className=" mt-2 ml-3 text-base w-full xl:mt-3  pl-7 pr-14 sm:px-0">
          <label
            htmlFor="Password "
            className="text-xl  block mb-1  font-semibold text-white mt-5  sm:text-black sm:dark:text-white sm:text-base md:mt-4 xl:mt-5 xl:text-base  "
          >
            Name display
          </label>
          <input
            type="text"
            id="Password"
            placeholder="Enter Name display..."
            className="border w-full  px-2 py-1 focus:outline-none focus:ring-0 focus:border-gray-600 rounded-md"
            value={confirmpassword}
            onChange={(e) => {
              if (e.target.value.length !== 0) {
                setErrConfirmPass("");
              } else {
                setErrConfirmPass(" Name display is required");
              }
              setConfirmpassword(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSubmit();
              }
            }}
          />

          <span className="text-black font-semibold  text-lg sm:text-base sm:mt-0 items-center block sm:text-red-500  mt-[2px] md:text-base  lg:text-base  h-2 xl:mt-0 xl:mb-1 xl:h-2    ">
            {errconfirmpass ?? ""}
          </span>
        </div>
        <div className=" mt-2 ml-3 text-base w-full xl:mt-3 pl-7 pr-14 sm:px-0">
          <label
            htmlFor="Password "
            className="text-xl text-white mt-5  sm:text-black sm:dark:text-white sm:text-base block mb-1  font-semibold md:mt-4 xl:mt-5  xl:text-base  "
          >
            Password
          </label>
          <input
            type="text"
            id="Password"
            placeholder="Enter Password..."
            className="border w-full  px-2 py-1 focus:outline-none focus:ring-0 focus:border-gray-600 rounded-md"
            value={password}
            onChange={(e) => {
              if (e.target.value.length !== 0) {
                setErrpass("");
              } else {
                setErrpass("Password is required");
              }
              setPassword(e.target.value);
            }}
          />

          <span className="text-black font-semibold  text-lg sm:text-base sm:mt-0 items-center block sm:text-red-500  mt-[2px] md:text-base  lg:text-base   h-2 xl:mt-0 xl:mb-1 xl:h-2    ">
            {errpass ?? ""}
          </span>
        </div>
      </div>
    );
  };
  const footerLogin = () => {
    return (
      <>
        <button
          className="block border-none rounded-[50px] py-2 text-2xl sm:text-xl w-[60%] mx-auto  text-white font-semibold bg-gradient-to-r from-blue-400  to-pink-400 hover:opacity-70 mt-8  sm:mt-10 lg:text-lg lg:py-[3px] lg:mt-8 xl:mt-9 2xl:mt-9 xl:py-[5px]"
          onClick={handleSubmit}
        >
          Register
        </button>
        <div className=" text-white  flex justify-center text-center mt-6  font-medium flex-col text-xl sm:text-lg sm:text-black sm:dark:text-white sm:mt-6 md:st-2 lg:mt-3 xl:mt-5 2xl:mt-4">
          <h2>Or Sign Up Using</h2>
          <div className="mt-4 sm:mt-3 flex justify-center md:mt-3">
            <button
              className="mr-10 sm:mr-3 scale-125 sm:scale-100"
              onClick={() => {
                signIn("google");
              }}
            >
              <img
                src="https://img.shields.io/badge/Google-lightgray?style=for-the-badge&logo=google&logoColor=white"
                alt="Google Sign-in"
                className="rounded-xl"
              />
            </button>

            <button
              className="scale-125 sm:scale-100"
              onClick={() => {
                signIn("github");
              }}
            >
              <img
                src="https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white"
                alt="GitHub Sign-in"
                className="ml-2 rounded-xl "
              />
            </button>
          </div>
        </div>
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
        <div className="relative dark:bg-gray-600 bg-gradient-login-main  sm:bg-none  h-[100vh] w-[100vw] overflow-hidden pb-10 md:pb-0 shadow-lg bg-white rounded-md flex justify-center items-center sm:items-start lg:items-stretch sm:w-[450px] sm:h-[700px]  lg:w-[800px] lg:h-[530px] lg:grid-cols-2 xl:w-[1000px] xl:h-[600px] 2xl:w-[1300px] 2xl:h-[600px]">
          <div className="">
            {headertitle()}
            {formInput()}
            {footerLogin()}
          </div>
          <div className=" ml-10 bg-white dark:bg-gray-600 overflow-hidden hidden lg:block w-[50%]">
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

export default Register;
