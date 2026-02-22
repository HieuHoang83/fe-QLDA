"use client";

import Link from "next/link";

async function Test1() {
  await new Promise((resolve) =>
    setTimeout(() => {
      resolve(true);
    }, 1000)
  );
  return (
    <div className="h-[300px] w-[300px]  bg-red-300 flex items-center justify-center flex-col">
      <div>Page 1A</div>
      <Link className="bg-slate-300 block" href="/test/link1">
        Click
      </Link>
    </div>
  );
}

export default Test1;
