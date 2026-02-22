"use client";

import Link from "next/link";

async function Test1() {
  return (
    <div className="h-[300px] w-[300px]  bg-green-300 flex items-center justify-center flex-col ">
      <div>Page 2B</div>
      <Link className="bg-slate-300 block" href="/test">
        Click
      </Link>
    </div>
  );
}

export default Test1;
