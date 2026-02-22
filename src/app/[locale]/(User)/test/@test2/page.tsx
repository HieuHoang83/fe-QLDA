"use client";

import Link from "next/link";

async function Test2() {
  await new Promise((resolve) =>
    setTimeout(() => {
      resolve(true);
    }, 1500)
  );
  return (
    <div className="h-[300px] w-[300px] bg-green-300 flex items-center justify-center  flex-col">
      <div>Page 2A</div>
      <Link className="bg-slate-300 block" href="/test/link2">
        Click
      </Link>
    </div>
  );
}

export default Test2;
