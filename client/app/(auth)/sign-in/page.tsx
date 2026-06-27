"use client"
import { LoginForm } from '@/components/ui/login-form'
import { Spinner } from '@/components/ui/spinner';
import { authclient } from '@/lib/auth-client';
import { useRouter } from 'next/dist/client/components/navigation';
import React from 'react'
const Page = () => {
      const router = useRouter();

  const {data, isPending} = authclient.useSession();
  if(isPending){
    return(
      <div className="flex items-center justify-center flex-col h-screen">
        <Spinner ></Spinner>
      </div>
    )
  }

  if(data?.user && data?.session){
    router.push("/sign-in");
  }
    return (
        <>
        <LoginForm />
        </>
    )
}

export default Page