import { redirect } from "next/navigation";

export default function NewSongsRedirect() {
  redirect("/songs?sort=new");
}
