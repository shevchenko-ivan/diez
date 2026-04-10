import { redirect } from "next/navigation";

export default function TopSongsRedirect() {
  redirect("/songs?sort=popular");
}
