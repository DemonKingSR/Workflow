"use client";

import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../utils/api";
import { KeyRound, Mail, ShieldAlert, Sparkles } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Forgot password states
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMsg, setForgotMsg] = useState<string | null>(null);
  const [forgotErr, setForgotErr] = useState<string | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all credentials.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || "Failed to log in. Check credentials.");
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      setForgotErr("Please enter your email address.");
      return;
    }

    setForgotErr(null);
    setForgotMsg(null);
    setForgotLoading(true);

    try {
      const res = await api.post<{ message: string }>("/auth/forgot-password", { email: forgotEmail });
      setForgotMsg(res.message);
    } catch (err: any) {
      setForgotErr(err.message || "Something went wrong.");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 relative overflow-hidden px-4">
      {/* Background blobs */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-purple-600/10 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-indigo-600/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "2s" }} />

      <div className="w-full max-w-md z-10">
        {/* Title logo */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20 mb-3 hover:scale-105 transition-transform duration-300">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            WorkFlow
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            AI-powered enterprise accountability hub
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-panel rounded-3xl p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-purple-500 via-violet-600 to-indigo-500" />
          
          <h2 className="text-xl font-bold text-slate-200 mb-6 text-center">
            Sign In to Workspace
          </h2>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-800/40 text-red-300 text-sm flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="employee@workflow.com"
                  className="w-full bg-slate-900/60 border border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl px-4 py-3 pl-11 text-slate-100 placeholder-slate-500 outline-none transition-all duration-200"
                  required
                />
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotOpen(true);
                    setForgotMsg(null);
                    setForgotErr(null);
                    setForgotEmail("");
                  }}
                  className="text-xs text-purple-400 hover:text-purple-300 font-medium transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-900/60 border border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl px-4 py-3 pl-11 text-slate-100 placeholder-slate-500 outline-none transition-all duration-200"
                  required
                />
                <KeyRound className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-indigo-500 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 rounded-full border-2 border-slate-300 border-t-transparent animate-spin" />
                  <span>Logging in...</span>
                </>
              ) : (
                <span>Access Dashboard</span>
              )}
            </button>
          </form>

          {/* Quick seeded instructions */}
          <div className="mt-8 pt-6 border-t border-slate-800/40 text-center">
            <span className="text-xs text-slate-500 font-medium block mb-2">
              Seeded Demo Accounts Available:
            </span>
            <div className="flex flex-wrap justify-center gap-1.5 text-[10px] text-slate-400 font-mono">
              <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800">
                admin@workflow.com
              </span>
              <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800">
                manager@workflow.com
              </span>
              <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800">
                employee@workflow.com
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium mt-1">
              Password for all: <code className="text-slate-400 bg-slate-900 px-1 rounded">*Pass123</code>
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {isForgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-purple-500" />
            <h3 className="text-lg font-bold text-slate-200 mb-2">Reset password instructions</h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter your email address and we will generate a password recovery token in the system console log.
            </p>

            {forgotErr && (
              <div className="mb-4 p-3 rounded-lg bg-red-950/40 border border-red-800/40 text-red-300 text-xs">
                {forgotErr}
              </div>
            )}

            {forgotMsg && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs">
                {forgotMsg}
              </div>
            )}

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="admin@workflow.com"
                  className="w-full bg-slate-900/60 border border-slate-800 focus:border-purple-500 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none"
                  required
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsForgotOpen(false)}
                  className="px-4 py-2 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-lg text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                >
                  {forgotLoading ? "Sending..." : "Recover Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
