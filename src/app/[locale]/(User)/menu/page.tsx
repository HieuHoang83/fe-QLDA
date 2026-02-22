import { getServerSession } from "next-auth";
import MenuPage from "@/components/Menu/Menu";

export default async function HomePage() {
  return <MenuPage />;
}
