import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/features/next-auth";

export default async function Home() {
  const session = await getServerAuthSession();

  if (!session.user.name || !session.user.image) {
    redirect(`/set-up-profile`);
  }

  redirect(`/home`);
}
