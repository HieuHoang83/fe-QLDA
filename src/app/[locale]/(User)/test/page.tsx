import Link from "next/link";

async function Test() {
  await new Promise((resolve) =>
    setTimeout(() => {
      resolve(true);
    }, 1500)
  );
  return (
    <div className="h-[300px] w-[300px] bg-gray-300 flex items-center justify-center ">
      children A
      <Link className="bg-blue-300 block" href="/test/child">
        Click
      </Link>
    </div>
  );
}

export default Test;
