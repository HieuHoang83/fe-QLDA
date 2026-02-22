import { BarLoader, ClimbingBoxLoader, ClipLoader } from "react-spinners";
function Loading() {
  return (
    <div className="flex h-[100vh] items-center bg-gray-200 z-1000">
      <BarLoader className="mx-auto" height={7} />
    </div>
  );
}
export default Loading;
