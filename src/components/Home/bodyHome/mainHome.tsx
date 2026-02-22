"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import logo from "../../../../public/image/4c629861-7991-447c-ba00-6aca97e09ebe-removebg-preview.png";
import { useTranslations } from "next-intl";
function MainHome() {
  const { data: session } = useSession();
  const { status } = useSession({
    required: false,
  });
  const t = useTranslations("HomePage");
  //@ts-ignore
  //sd ->session

  return (
    <div
      className={`relative  mt-[80px]  font-poppins bg-cover  h-[calc(100vh-80px)] flex justify-start dark:pl-0 items-center bg-[url('https://www.sidechef.com/category/4c629861-7991-447c-ba00-6aca97e09ebe.jpg')] dark:bg-none  bg-[top_50%_right_0px]`}
    >
      <h1 className="text-gray-800  dark:text-gray-200 w-[650px] text-4xl font-bold mb-4 z-10 hidden xl:block xl:ml-[80px] 2xl:ml-[180px] ">
        {t("welcome_message")}
      </h1>
      <Image
        src={logo}
        className="absolute  hidden dark:block object-cover h-full w-full bg-[top_50%_right_0px]"
        alt=""
      />
    </div>
  );
}

export default MainHome;
