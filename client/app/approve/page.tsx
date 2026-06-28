"use client";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { authclient } from "@/lib/auth-client";
import { useRouter,useSearchParams } from "next/navigation";
import { useState } from "react";
import { CheckCircle, XCircle, Smartphone} from "lucide-react";
import { toast } from "sonner";

import React from 'react'

const DeviceApprovalpage = () => {
    const {data,isPending} = authclient.useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const usercode = searchParams.get("user_code")
    const [isprecoessing,setisprocessing] = useState({
        approve:false,
        deny:false,     
    })


    const handleapprove = async () => {
      setisprocessing({
        approve:true,
        deny:false
      })
      try {
        toast.loading("approving deivice...",{id:"loading"})
        await authclient.device.approve({
          userCode:usercode!
        })
        toast.dismiss("loading")
        toast.success("device approved")
        router.push("/")
      } catch (error) {
        toast.error("failed to approve")
      }
      finally{
        setisprocessing({
          approve:false,
          deny:false
        })
      }
    }
    const handledeny = async () => {
      setisprocessing({
        approve:false,
        deny:false
      })
      try {
        toast.loading("approving deivice...",{id:"loading"})
        await authclient.device.deny({
          userCode:usercode!
        })
        toast.dismiss("loading")
        toast.success("device approved")
        router.push("/")
      } catch (error) {
        toast.error("failed to approve")
      }
      finally{
        setisprocessing({
          approve:false,
          deny:false
        })
      }
    }

    if(isPending){
      return (
        <div className="flex flex-col intems-center justify-center h-screen bg-background">
          <Spinner />
        </div>
      )
    }

    if(!data?.session && !data?.user){
      router.push("/sign-in")
    }
  return (
  <div className="min-h-screen bg-black flex items-center justify-center font-mono">
    <div className="border border-zinc-700 p-8 w-96 flex flex-col gap-6">

      <div className="flex items-center gap-3">
        <Smartphone className="text-zinc-500 w-4 h-4" />
        <p className="text-zinc-500 text-xs uppercase tracking-widest">Device Authorization</p>
      </div>

      <div className="border-t border-zinc-800" />

      <div className="flex flex-col gap-1">
        <p className="text-white text-xs uppercase tracking-widest">Authorize this device?</p>
        <p className="text-zinc-600 text-xs">A CLI device is requesting access to your account.</p>
      </div>

      {usercode && (
        <div className="flex flex-col gap-1">
          <p className="text-zinc-600 text-xs uppercase tracking-widest">Code</p>
          <p className="text-white text-2xl tracking-[0.4em]">{usercode}</p>
        </div>
      )}

      <div className="flex flex-col gap-2 mt-2">
        <button
        onClick={handleapprove}
          disabled={isprecoessing.approve || isprecoessing.deny}
          className="w-full flex items-center justify-center gap-2 text-xs text-green-400 border border-green-900 py-2 hover:bg-green-950 transition-all tracking-widest uppercase disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <CheckCircle className="w-3 h-3" />
          [ approve ]
        </button>
        <button
        onClick={handledeny}
          disabled={isprecoessing.approve || isprecoessing.deny}
          className="w-full flex items-center justify-center gap-2 text-xs text-red-400 border border-red-900 py-2 hover:bg-red-950 transition-all tracking-widest uppercase disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <XCircle className="w-3 h-3" />
          [ deny ]
        </button>
      </div>

      <p className="text-zinc-700 text-xs text-center">
        only approve if you initiated this request from your terminal
      </p>

    </div>
  </div>
)
}

export default DeviceApprovalpage
