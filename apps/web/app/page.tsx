import { redirect } from "next/navigation";

// The welcome page (D-29) lives at /start, behind sign-in.
export default function Home() {
  redirect("/start");
}
