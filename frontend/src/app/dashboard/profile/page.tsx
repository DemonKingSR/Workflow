"use client";

import React, { useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { api } from "../../../utils/api";
import {
  User,
  Shield,
  KeyRound,
  FileCheck2,
  Mail,
  UserCheck2,
} from "lucide-react";

export default function ProfilePage() {
  const { user, refreshProfile } = useAuth();
  
  const [name, setName] = useState(user?.name || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(null);
    setError(null);

    if (password && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setUpdating(true);
    try {
      await api.put("/auth/profile", {
        name,
        password: password || undefined,
      });

      setSuccess("Your profile details have been successfully modified.");
      setPassword("");
      setConfirmPassword("");
      await refreshProfile();
    } catch (err: any) {
      setError(err.message || "Failed to update profile settings.");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-4xl">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-black text-slate-800 dark:text-white">Profile Configurations</h2>
        <p className="text-xs text-slate-400 font-medium">Update your account settings, change your credential passwords, or inspect directory specifications.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Card: Summary details */}
        <div className="glass-panel p-6 rounded-2xl col-span-1 space-y-6 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 dark:bg-purple-900/10 rounded-full blur-xl pointer-events-none" />
          
          <div className="text-center space-y-2 mt-4">
            <div className="w-16 h-16 rounded-full bg-purple-500/20 dark:bg-purple-900/40 flex items-center justify-center text-2xl font-black text-purple-600 dark:text-purple-400 border border-purple-500/10 mx-auto shadow-md">
              {user.name.charAt(0)}
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">{user.name}</h3>
            <span className="inline-block text-[9px] font-bold px-2.5 py-0.5 rounded-full border border-purple-500/25 bg-purple-500/10 text-purple-600 dark:text-purple-400 uppercase tracking-wider">
              {user.role}
            </span>
          </div>

          <div className="space-y-3.5 border-t border-slate-100 dark:border-slate-800/40 pt-4 text-xs font-semibold text-slate-500">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5"><Mail className="w-4 h-4 text-purple-500" /> Email:</span>
              <span className="text-slate-700 dark:text-slate-350">{user.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5"><Shield className="w-4 h-4 text-purple-500" /> Privileges:</span>
              <span className="text-slate-700 dark:text-slate-350 capitalize">{user.role.toLowerCase()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5"><UserCheck2 className="w-4 h-4 text-purple-500" /> Account:</span>
              <span className="text-green-600 dark:text-green-400">Active</span>
            </div>
          </div>
        </div>

        {/* Right Panel: Edit form */}
        <div className="glass-panel p-6 rounded-2xl col-span-2 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-purple-500" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-6 pb-2 border-b border-slate-100 dark:border-slate-800">
            Account Credentials Settings
          </h3>

          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-950/40 border border-red-800/40 text-red-300 text-xs">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <div>
              <label className="block text-slate-400 uppercase tracking-wider mb-1.5">Profile Name</label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Update your name"
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-transparent focus:border-purple-500 rounded-xl px-3 py-2.5 pl-8 text-slate-850 dark:text-slate-100 outline-none font-medium"
                  required
                />
                <User className="absolute left-2.5 top-3 w-3.5 h-3.5 text-slate-500" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 uppercase tracking-wider mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-100 dark:bg-slate-900 border border-transparent focus:border-purple-500 rounded-xl px-3 py-2.5 pl-8 text-slate-850 dark:text-slate-100 outline-none font-medium"
                  />
                  <KeyRound className="absolute left-2.5 top-3.5 w-3.5 h-3.5 text-slate-500" />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 uppercase tracking-wider mb-1.5">Confirm New Password</label>
                <div className="relative">
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-100 dark:bg-slate-900 border border-transparent focus:border-purple-500 rounded-xl px-3 py-2.5 pl-8 text-slate-850 dark:text-slate-100 outline-none font-medium"
                  />
                  <KeyRound className="absolute left-2.5 top-3.5 w-3.5 h-3.5 text-slate-500" />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-150 dark:border-slate-800/40 mt-4">
              <button
                type="submit"
                disabled={updating}
                className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 uppercase text-[10px] tracking-wider"
              >
                {updating ? (
                  <>
                    <div className="w-3.5 h-3.5 rounded-full border border-slate-300 border-t-transparent animate-spin" />
                    <span>Modifying settings...</span>
                  </>
                ) : (
                  <>
                    <FileCheck2 className="w-4 h-4" />
                    <span>Apply Updates</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
