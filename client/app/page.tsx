"use client";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { authclient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function Home() {
  const router = useRouter();

  const {data, isPending} = authclient.useSession();
  if(isPending){
    return(
      <div className="flex items-center justify-center flex-col h-screen">
        <Spinner ></Spinner>
      </div>
    )
  }

  if(!data?.user && !data?.session){
    router.push("/sign-in");
  }
  return (
  <div className="flex items-center justify-center h-screen bg-black">
  <div className="border border-zinc-700 p-8 w-96 font-mono">
    <div className="flex items-start gap-6 mb-6">
      <div className="border border-zinc-500 rounded-full w-10 h-10 flex items-center justify-center shrink-0 overflow-hidden">
        <Image
          src={data?.user?.image || ""}
          alt="avatar"
          width={40}
          height={40}
          className="object-cover"
        />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-white text-xs uppercase tracking-widest">{data?.user?.name}</p>
        <p className="text-zinc-500 text-xs">--</p>
        <p className="text-white text-xs uppercase tracking-widest">{data?.user?.email}</p>
      </div>
    </div>

    <div className="border-t border-zinc-700 pt-6 flex flex-col gap-2 text-xs text-zinc-400">
      <p>SESSION ACTIVE</p>
      <p className="text-zinc-600">ID: {data?.session?.id?.slice(0, 24)}...</p>
    </div>

    <button
      onClick={() => authclient.signOut().then(() => router.push("/sign-in"))}
      className="mt-6 w-full text-xs text-zinc-400 border border-zinc-700 py-2 hover:bg-zinc-900 hover:text-white transition-all tracking-widest uppercase font-mono"
    >
      [ Sign out ]
    </button>
  </div>
</div>
  );
}
