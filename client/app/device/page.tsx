"use client"
import { authclient } from "@/lib/auth-client"
import type React from "react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { ShieldAlert } from "lucide-react"
// import { set } from "date-fns"

const Page = () => {
  const [usercode,setusercode] = useState("")
  const [error,seterror] = useState<string | null>(null)
  const [isloading,setisloading] = useState(false)
  const router = useRouter()

  const handlesubmit = async(e:React.FormEvent) => {
    e.preventDefault()
    seterror(null)
    setisloading(true)

    try {
      const formatedcode = usercode.trim().replace(/-/g,"").toUpperCase()
      const response = await authclient.device({
        query:{user_code:formatedcode}
      })
      if(response.data){
        router.push(`/approve?user_code=${formatedcode}`)
      }
      
    } catch (error) {
      seterror("invalid or expired code")
    }
    finally{
      setisloading(false)
    }
  }


  const handlecodechange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,"")
    if(value.length > 4){
      value = value.slice(0,4) + "-" + value.slice(4,8);
    }
    setusercode(value)
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center font-mono">
  <div className="border border-zinc-700 p-8 w-96 flex flex-col gap-6">
    
    <div className="flex items-center gap-3">
      <ShieldAlert className="text-zinc-500 w-4 h-4" />
      <p className="text-zinc-500 text-xs uppercase tracking-widest">Device Authorization</p>
    </div>

    <div className="border-t border-zinc-800" />

    <div className="flex flex-col gap-1">
      <p className="text-white text-xs uppercase tracking-widest">Enter your code</p>
      <p className="text-zinc-600 text-xs">Enter the code displayed in your terminal to authorize this device.</p>
    </div>

    <input
      type="text"
      value={usercode}
      onChange={handlecodechange}
      placeholder="XXXX-XXXX"
      className="bg-transparent border border-zinc-700 text-white text-center text-lg tracking-[0.5em] py-3 px-4 outline-none focus:border-zinc-400 transition-colors placeholder:text-zinc-700"
    />

    {error && (
      <p className="text-red-500 text-xs tracking-widest">[ {error} ]</p>
    )}  

    <button
      disabled={isloading || !usercode}
      onClick={handlesubmit}
      className="w-full text-xs text-zinc-400 border border-zinc-700 py-2 hover:bg-zinc-900 hover:text-white transition-all tracking-widest uppercase disabled:opacity-30 disabled:cursor-not-allowed"
    >
      {isloading ? "[ verifying... ]" : "[ authorize device ]"}
    </button>

    <p className="text-zinc-700 text-xs text-center">
      session expires after use — do not share this code
    </p>
  </div>
</div>
  )
}

export default Page
