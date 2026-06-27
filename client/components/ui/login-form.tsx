"use client";
import {useRouter} from "next/navigation";
import {authclient} from "@/lib/auth-client";
import {useState} from "react";

export const LoginForm = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

 return (
  <div className="min-h-screen bg-black flex min-w-screen">
    {/* Left panel */}
    <div className="hidden md:flex w-1/2 border-r border-white/10 items-center justify-center p-16">
      <div className="max-w-xs">
        <div className="text-white/20 text-4xl mb-8 font-mono">⌘</div>
        <p className="text-white/90 text-sm font-mono uppercase tracking-widest leading-relaxed">
          MAKE YOUR CLI{" "}
          <span className="text-white font-bold">smarter</span>
          <br />
          <span className="text-white/50 normal-case tracking-normal font-normal text-xs mt-2 block">
            stop wasting time on repetitive tasks and let your CLI do the work for you.
          </span>
        </p>
        <div className="mt-8 border-l border-white/30 pl-3">
          <p className="text-white/30 text-xs font-mono uppercase tracking-widest">
            MADE WITH SWEAT AND CUM AAAAAHHHHHHHHHHHHHHHH
          </p>
        </div>
      </div>
    </div>

    {/* Right panel */}
    <div className="flex-1 flex flex-col justify-center items-center px-8 py-16">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="self-end text-white/30 text-xs font-mono hover:text-white/60 cursor-pointer transition-colors">
          Create an account
        </div>
        <h1 className="text-white text-4xl font-light tracking-tight">Login</h1>
       <button
  type="button"
  onClick={() => authclient.signIn.social({
    provider: "github",
    callbackURL: "http://localhost:3002"
  })}
  className="w-full flex items-center justify-center gap-3 bg-zinc-900 text-white/80 border border-zinc-700 rounded-md py-3 px-6 text-sm font-mono hover:bg-zinc-800 hover:border-zinc-500 active:scale-95 transition-all"
>
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 shrink-0">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
  </svg>
  Log in with GitHub
</button>
      </div>
    </div>
  </div>
);
};