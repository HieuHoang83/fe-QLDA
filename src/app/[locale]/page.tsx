import type { Metadata } from "next";

import CmpHome from "@/components/Home/cmpHome";

export const metadata: Metadata = {
  title: "Home page",
  description: "home page description",
};
export default function HomePage() {
  return <CmpHome />;
}
