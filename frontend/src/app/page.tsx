"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push("/dashboard");
      } else {
        router.push("/login");
      }
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-900/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-900/20 rounded-full blur-3xl" />
      
      <div className="z-10 flex flex-col items-center gap-4">
        {/* Loading ring */}
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="absolute w-full h-full rounded-full border-4 border-purple-500/10" />
          <div className="absolute w-full h-full rounded-full border-4 border-t-purple-600 animate-spin" />
        </div>
        <h2 className="text-xl font-bold tracking-widest text-slate-100 bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
          WorkFlow
        </h2>
        <p className="text-sm text-slate-400 font-medium">Checking active credentials...</p>
      </div>
    </div>
  );
}
