import { BarLoader, ClimbingBoxLoader, ClipLoader } from "react-spinners";
function Loading() {
  return (
    <div className="flex  h-[300px] w-[300px]   items-center bg-green-300 z-1000">
      <BarLoader className="mx-auto" height={7} />
    </div>
  );
}
export default Loading;
