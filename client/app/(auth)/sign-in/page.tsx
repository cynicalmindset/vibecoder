"use client"
import { LoginForm } from '@/components/ui/login-form'
import { Spinner } from '@/components/ui/spinner';
import { authclient } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import React, { useEffect } from 'react'
const Page = () => {
  const { data, isPending } = authclient.useSession();
  const router = useRouter();

  useEffect(() => {
    if (data?.user && data?.session) {
      router.push("/");
    }
  }, [data]);

  if (isPending) {
    return <Spinner />;
  }
    return (
        <>
        <LoginForm />
        </>
    )
}

export default Page