"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { api } from "../../../utils/api";
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  UserPlus,
  ShieldCheck,
  Power,
  ShieldAlert,
} from "lucide-react";

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MANAGER" | "EMPLOYEE";
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
}

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Create/Edit Drawer Modal states
  const [isOpen, setIsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState<"ADMIN" | "MANAGER" | "EMPLOYEE">("EMPLOYEE");
  const [formStatus, setFormStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [formErr, setFormErr] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const data = await api.get<UserRecord[]>("/users");
      setUsers(data);
    } catch (err) {
      console.error("Failed to load users directory:", err);
    }
  };

  useEffect(() => {
    if (currentUser?.role === "ADMIN") {
      setLoading(true);
      fetchUsers().finally(() => setLoading(false));
    }
  }, [currentUser]);

  // Open Drawer in Create mode
  const handleOpenCreate = () => {
    setIsEditMode(false);
    setSelectedUserId(null);
    setFormName("");
    setFormEmail("");
    setFormPassword("");
    setFormRole("EMPLOYEE");
    setFormStatus("ACTIVE");
    setFormErr(null);
    setIsOpen(true);
  };

  // Open Drawer in Edit mode
  const handleOpenEdit = (user: UserRecord) => {
    setIsEditMode(true);
    setSelectedUserId(user.id);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormPassword(""); // Leave blank
    setFormRole(user.role);
    setFormStatus(user.status);
    setFormErr(null);
    setIsOpen(true);
  };

  // Submit Handler (Covers both Create & Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formEmail || (!isEditMode && !formPassword)) {
      setFormErr("Please complete the required fields.");
      return;
    }

    setFormErr(null);
    try {
      if (isEditMode && selectedUserId) {
        await api.put(`/users/${selectedUserId}`, {
          name: formName,
          email: formEmail,
          role: formRole,
          status: formStatus,
          password: formPassword || undefined,
        });
      } else {
        await api.post("/users", {
          name: formName,
          email: formEmail,
          role: formRole,
          status: formStatus,
          password: formPassword,
        });
      }
      
      setIsOpen(false);
      await fetchUsers();
    } catch (err: any) {
      setFormErr(err.message || "An error occurred.");
    }
  };

  // Toggle ACTIVE/INACTIVE status rapidly
  const handleToggleStatus = async (user: UserRecord) => {
    if (user.id === currentUser?.id) {
      alert("You cannot deactivate your own administrative session.");
      return;
    }

    const nextStatus = user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await api.put(`/users/${user.id}`, { status: nextStatus });
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: nextStatus } : u))
      );
    } catch (err: any) {
      alert(`Deactivation failed: ${err.message}`);
    }
  };

  // Delete User Action
  const handleDeleteUser = async (userId: string) => {
    if (userId === currentUser?.id) {
      alert("You cannot delete your own administrative account.");
      return;
    }
    
    if (!confirm("Are you sure you want to permanently delete this user profile? All associated tasks and work logs will be cascade deleted!")) return;

    try {
      await api.delete(`/users/${userId}`);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Filters search matching
  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase())
  );

  if (currentUser?.role !== "ADMIN") {
    return (
      <div className="p-6 text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold">Access Restricted</h2>
        <p className="text-sm text-slate-400">Only corporate administrators hold privileges to view user directories.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-purple-500/10 border-t-purple-600 rounded-full animate-spin" />
        <span className="text-sm text-slate-400 font-semibold">Retrieving corporate registries...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Title Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white">Corporate Directories</h2>
          <p className="text-xs text-slate-400 font-medium">Create employees accounts, assign role permissions, or toggle workspace activation states.</p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4.5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-purple-500/10 w-full sm:w-auto justify-center"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Account</span>
        </button>
      </div>

      {/* Searching Bar */}
      <div className="glass-panel p-4 rounded-2xl flex shadow-sm">
        <div className="relative w-full max-w-xs">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, role..."
            className="w-full bg-slate-100 dark:bg-slate-900 border border-transparent focus:border-purple-500 rounded-xl px-3 py-2 pl-9 text-xs outline-none transition-all placeholder-slate-400 font-medium"
          />
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
        </div>
      </div>

      {/* Directory Registries Grid */}
      <div className="glass-panel overflow-x-auto rounded-2xl shadow-md">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-200/50 dark:border-slate-800/40 text-slate-400 uppercase tracking-widest font-extrabold">
              <th className="p-4">Staff Member</th>
              <th className="p-4">Email Address</th>
              <th className="p-4">Role Privileges</th>
              <th className="p-4">Active Status</th>
              <th className="p-4">Registration Date</th>
              <th className="p-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-slate-100 dark:border-slate-800/40 hover:bg-slate-100/30 dark:hover:bg-slate-900/20 font-medium"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-500/10 dark:bg-purple-900/30 flex items-center justify-center font-bold text-purple-600 dark:text-purple-400 border border-purple-500/10">
                        {item.name.charAt(0)}
                      </div>
                      <span className="font-bold text-slate-800 dark:text-slate-100">{item.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-slate-500 dark:text-slate-400">{item.email}</td>
                  <td className="p-4">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                      item.role === "ADMIN"
                        ? "bg-purple-500/10 text-purple-600 border-purple-500/20"
                        : item.role === "MANAGER"
                        ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                        : "bg-slate-500/10 text-slate-500 border-slate-500/10"
                    }`}>
                      {item.role}
                    </span>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => handleToggleStatus(item)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold transition-all ${
                        item.status === "ACTIVE"
                          ? "bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20"
                          : "bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500/20"
                      }`}
                      title={item.status === "ACTIVE" ? "Click to deactivate" : "Click to activate"}
                    >
                      <Power className="w-3 h-3" />
                      <span>{item.status}</span>
                    </button>
                  </td>
                  <td className="p-4 text-slate-400 font-semibold">{new Date(item.createdAt).toLocaleDateString()}</td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                        title="Edit Profile"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(item.id)}
                        className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                        title="Delete Profile"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400 text-xs">
                  No matching staff registries found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE & EDIT USER DRAWER PANEL */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-purple-500" />
            
            <h3 className="text-base font-black text-slate-800 dark:text-slate-200 pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              {isEditMode ? "Modify Account Details" : "Create Corporate Account"}
            </h3>

            {formErr && (
              <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-800/40 text-red-300 text-xs">
                {formErr}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <div>
                <label className="block text-slate-400 uppercase tracking-wider mb-1.5">Staff Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Charlie Employee"
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-transparent focus:border-purple-500 rounded-xl px-3 py-2.5 text-slate-850 dark:text-slate-100 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="charlie@company.com"
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-transparent focus:border-purple-500 rounded-xl px-3 py-2.5 text-slate-850 dark:text-slate-100 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 uppercase tracking-wider mb-1.5">
                  Password {isEditMode && <span className="text-[10px] text-slate-500 capitalize">(leave blank to keep unchanged)</span>}
                </label>
                <input
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder={isEditMode ? "••••••••" : "Hash password"}
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-transparent focus:border-purple-500 rounded-xl px-3 py-2.5 text-slate-850 dark:text-slate-100 outline-none"
                  required={!isEditMode}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 uppercase tracking-wider mb-1.5">Role Privileges</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as any)}
                    className="w-full bg-slate-100 dark:bg-slate-900 border border-transparent rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-350 outline-none font-medium"
                  >
                    <option value="EMPLOYEE">Employee</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 uppercase tracking-wider mb-1.5">Workspace status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full bg-slate-100 dark:bg-slate-900 border border-transparent rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-350 outline-none font-medium"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Deactivated</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4.5 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold hover:from-purple-500 hover:to-indigo-500"
                >
                  {isEditMode ? "Apply Changes" : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
