import { redirect } from "next/navigation";
import { AppRoutes } from "./routes";

export default function HomePage() {
  redirect(AppRoutes.log.path);
}
