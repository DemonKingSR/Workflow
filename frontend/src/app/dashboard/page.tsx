"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../utils/api";
import {
  Users,
  ShieldCheck,
  UserCheck,
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  Award,
  Sparkles,
  TrendingUp,
  FileCheck2,
  ArrowRight,
  BrainCircuit,
  UserPlus,
  Mail,
  Lock,
} from "lucide-react";
import { useRouter } from "next/navigation";

// Define backend responses
interface AdminStats {
  totalUsers: number;
  totalManagers: number;
  totalEmployees: number;
  totalTasks: number;
  activeTasks: number;
  completedTasks: number;
  overdueTasks: number;
}

interface ManagerStats {
  totalTeamMembers: number;
  totalTasks: number;
  activeTasks: number;
  completedTasks: number;
  overdueTasks: number;
  avgTeamScore: number;
  teamMembers: Array<{ id: string; name: string; email: string; status: string }>;
}

interface EmployeeStats {
  pendingTasks: number;
  completedTasks: number;
  upcomingDeadlines: number;
  overdueTasks: number;
  avgScore: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // States for dynamic roles
  const [adminData, setAdminData] = useState<AdminStats | null>(null);
  const [managerData, setManagerData] = useState<ManagerStats | null>(null);
  const [employeeData, setEmployeeData] = useState<EmployeeStats | null>(null);

  // AI Summary States
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  // Account Requests States
  const [requests, setRequests] = useState<any[]>([]);
  
  // Manager Request Modal States
  const [isReqOpen, setIsReqOpen] = useState(false);
  const [reqName, setReqName] = useState("");
  const [reqEmail, setReqEmail] = useState("");
  const [reqPassword, setReqPassword] = useState("");
  const [reqRole, setReqRole] = useState("EMPLOYEE");
  const [reqErr, setReqErr] = useState<string | null>(null);
  const [reqSuccess, setReqSuccess] = useState<string | null>(null);
  const [reqLoading, setReqLoading] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const stats = await api.get<any>("/dashboard/stats");
      if (user?.role === "ADMIN") {
        setAdminData(stats);
      } else if (user?.role === "MANAGER") {
        setManagerData(stats);
      } else {
        setEmployeeData(stats);
      }
    } catch (error) {
      console.error("Failed to load metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    if (user?.role === "ADMIN" || user?.role === "MANAGER") {
      try {
        const data = await api.get<any[]>("/requests");
        setRequests(data);
      } catch (error) {
        console.error("Failed to load account requests:", error);
      }
    }
  };

  useEffect(() => {
    if (user) {
      fetchStats();
      fetchRequests();
    }
  }, [user]);

  const handleGenerateAISummary = async () => {
    setAiLoading(true);
    setIsReportOpen(true);
    setAiReport(null);
    try {
      const res = await api.get<{ report: string }>("/worklogs/team-summary");
      setAiReport(res.report);
    } catch (error: any) {
      setAiReport(`### System Notification\nFailed to compile AI summary report: ${error.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  // Manager Request Submitter
  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReqErr(null);
    setReqSuccess(null);
    setReqLoading(true);

    try {
      await api.post("/requests", {
        name: reqName,
        email: reqEmail,
        password: reqPassword,
        role: reqRole,
      });

      setReqSuccess("Account creation request submitted to corporate administrator.");
      setReqName("");
      setReqEmail("");
      setReqPassword("");
      setReqRole("EMPLOYEE");
      await fetchRequests();
    } catch (error: any) {
      setReqErr(error.message || "Failed to submit account request.");
    } finally {
      setReqLoading(false);
    }
  };

  // Admin approval handlers
  const handleApproveRequest = async (id: string) => {
    try {
      await api.put(`/requests/${id}/approve`, {});
      await Promise.all([fetchRequests(), fetchStats()]);
    } catch (error: any) {
      alert(`Approval failed: ${error.message}`);
    }
  };

  const handleRejectRequest = async (id: string) => {
    if (!confirm("Are you sure you want to reject this account request?")) return;
    try {
      await api.put(`/requests/${id}/reject`, {});
      await fetchRequests();
    } catch (error: any) {
      alert(`Rejection failed: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-purple-500/10 border-t-purple-600 rounded-full animate-spin" />
        <span className="text-sm text-slate-400 font-semibold tracking-wider">Aggregating real-time metrics...</span>
      </div>
    );
  }

  // Helper renderer for Stat Cards
  const renderCard = (title: string, value: string | number, icon: any, colorClass: string, subtitle?: string) => {
    const Icon = icon;
    return (
      <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group hover:scale-[1.02] transition-all duration-300">
        <div className={`absolute top-0 left-0 w-1.5 h-full ${colorClass}`} />
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-2">{title}</p>
            <h3 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">{value}</h3>
            {subtitle && <p className="text-[11px] text-slate-400 font-semibold mt-1">{subtitle}</p>}
          </div>
          <div className={`p-3 rounded-xl ${colorClass.replace("bg-", "bg-")}/10 shrink-0`}>
            <Icon className={`w-6 h-6 ${colorClass.replace("bg-", "text-")}`} />
          </div>
        </div>
      </div>
    );
  };

  const pendingRequests = requests.filter((r) => r.status === "PENDING");

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Welcome Banner */}
      <div className="glass-panel p-6 rounded-3xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-purple-600 dark:text-purple-400 font-bold uppercase tracking-widest">Active Workspace</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white">
            Welcome back, {user?.name}!
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl leading-relaxed">
            Here is your accountability snapshot. You are currently logged in as a{" "}
            <strong className="text-purple-600 dark:text-purple-400 font-bold capitalize">{user?.role.toLowerCase()}</strong>.
          </p>
        </div>

        {/* AI Action button for supervisors */}
        {(user?.role === "ADMIN" || user?.role === "MANAGER") && (
          <button
            onClick={handleGenerateAISummary}
            className="glow-btn flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs tracking-wider uppercase transition-all shrink-0 duration-200"
          >
            <BrainCircuit className="w-4 h-4" />
            <span>Generate AI Team Summary</span>
          </button>
        )}
      </div>

      {/* ADMIN METRICS DASHBOARD */}
      {user?.role === "ADMIN" && adminData && (
        <div className="space-y-6">
          
          {/* Pending account requests approvals drawer */}
          {pendingRequests.length > 0 && (
            <div className="glass-panel p-6 rounded-3xl border-l-[3px] border-l-yellow-500 mb-8 animate-in slide-in-from-top-3 duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BrainCircuit className="w-5 h-5 text-yellow-500" />
                  <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Pending Account Requests ({pendingRequests.length})</h4>
                </div>
                <span className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 font-bold px-2.5 py-0.5 rounded-full text-[9px] uppercase tracking-widest border border-yellow-500/20">
                  Review Required
                </span>
              </div>

              <div className="space-y-3.5">
                {pendingRequests.map((req) => (
                  <div key={req.id} className="p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/40 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs font-semibold">
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {req.name}{" "}
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 uppercase tracking-widest ml-1">
                          {req.role}
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1 font-semibold">
                        Email: <code className="text-slate-500 dark:text-slate-300 bg-slate-200 dark:bg-slate-800 px-1 rounded">{req.email}</code> • Requested by Manager: <strong className="text-slate-600 dark:text-slate-350">{req.requestedBy.name}</strong>
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                      <button
                        onClick={() => handleApproveRequest(req.id)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleRejectRequest(req.id)}
                        className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-2">Corporate Directories</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {renderCard("Total Directory Users", adminData.totalUsers, Users, "bg-purple-600")}
            {renderCard("Assigned Managers", adminData.totalManagers, ShieldCheck, "bg-blue-600")}
            {renderCard("Subordinate Employees", adminData.totalEmployees, UserCheck, "bg-emerald-600")}
          </div>

          <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mt-8 mb-2">Work Milestones</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {renderCard("Total Platform Tasks", adminData.totalTasks, ClipboardList, "bg-indigo-600")}
            {renderCard("Active Task Pipelines", adminData.activeTasks, TrendingUp, "bg-yellow-600")}
            {renderCard("Completed Achievements", adminData.completedTasks, CheckCircle2, "bg-green-600")}
            {renderCard("Overdue Slip Risks", adminData.overdueTasks, AlertTriangle, "bg-red-600", "Critical action required")}
          </div>
        </div>
      )}

      {/* MANAGER METRICS DASHBOARD */}
      {user?.role === "MANAGER" && managerData && (
        <div className="space-y-6">
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-2">Department Overview</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {renderCard("Assigned Team Members", managerData.totalTeamMembers, Users, "bg-purple-600")}
            {renderCard("Team Work Logs Score", `${managerData.avgTeamScore.toFixed(0)}%`, Award, "bg-emerald-600", "AI validation index")}
            {renderCard("Department Tasks", managerData.totalTasks, ClipboardList, "bg-indigo-600")}
          </div>

          <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mt-8 mb-2">Task Milestones</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {renderCard("Active Progress Pipelines", managerData.activeTasks, TrendingUp, "bg-yellow-600")}
            {renderCard("Completed Tasks", managerData.completedTasks, CheckCircle2, "bg-green-600")}
            {renderCard("Overdue Slip Risks", managerData.overdueTasks, AlertTriangle, "bg-red-600", "Follow up immediately")}
          </div>

          {/* Team Member directory quick peek */}
          <div className="glass-panel p-6 rounded-3xl mt-8">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">My Team Directory</h4>
              <button
                onClick={() => {
                  setIsReqOpen(true);
                  setReqErr(null);
                  setReqSuccess(null);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Request Staff Account</span>
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {managerData.teamMembers.map((member) => (
                <div key={member.id} className="p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/40 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between">
                  <div className="truncate">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{member.name}</p>
                    <p className="text-[11px] text-slate-400 font-semibold truncate">{member.email}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    member.status === "ACTIVE"
                      ? "bg-green-500/10 text-green-600 dark:text-green-400"
                      : "bg-red-500/10 text-red-600 dark:text-red-400"
                  }`}>
                    {member.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Submitted account requests history table */}
          <div className="glass-panel p-6 rounded-3xl mt-6">
            <h4 className="text-sm font-black text-slate-850 dark:text-slate-100 mb-4 uppercase tracking-wider">Account Requests History ({requests.length})</h4>
            <div className="space-y-3.5 max-h-60 overflow-y-auto">
              {requests.length > 0 ? (
                requests.map((req) => (
                  <div key={req.id} className="p-3.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/40 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between text-xs font-semibold">
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {req.name}{" "}
                        <span className="text-[8px] font-bold px-1.5 bg-slate-200 dark:bg-slate-800 text-slate-500 rounded uppercase tracking-wider ml-1">
                          {req.role}
                        </span>
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">{req.email}</p>
                    </div>
                    
                    <span className={`text-[9px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider ${
                      req.status === "APPROVED"
                        ? "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20"
                        : req.status === "REJECTED"
                        ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                        : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20"
                    }`}>
                      {req.status}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">No account requests submitted yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EMPLOYEE METRICS DASHBOARD */}
      {user?.role === "EMPLOYEE" && employeeData && (
        <div className="space-y-6">
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-2">My Taskboard Stats</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {renderCard("Pending Work Items", employeeData.pendingTasks, ClipboardList, "bg-yellow-600")}
            {renderCard("Completed Tasks", employeeData.completedTasks, CheckCircle2, "bg-green-600")}
            {renderCard("Upcoming Deadlines", employeeData.upcomingDeadlines, TrendingUp, "bg-indigo-600")}
            {renderCard("Overdue Slippages", employeeData.overdueTasks, AlertTriangle, "bg-red-600")}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
            {/* AI compliance rating widget */}
            <div className="glass-panel p-6 rounded-3xl col-span-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">AI Quality rating</h4>
                  <Award className="w-5 h-5 text-emerald-500" />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                  Every submitted work log is analyzed for task relevance and level of description specificity. Keep logging complete progress logs to maintain a high metric.
                </p>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black tracking-tighter text-slate-800 dark:text-slate-100">
                  {employeeData.avgScore.toFixed(0)}%
                </span>
                <span className="text-xs font-bold text-slate-400">average AI score</span>
              </div>
            </div>

            {/* Quick launch card */}
            <div className="glass-panel p-6 rounded-3xl col-span-2 relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-36 h-36 bg-purple-500/5 dark:bg-purple-900/10 rounded-full blur-xl pointer-events-none" />
              <div>
                <h4 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-2">My Task Workspace</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-md">
                  Jump straight into your taskboard to update progression timelines, comment on requirements, submit daily work logs, or check off finished items.
                </p>
              </div>
              <button
                onClick={() => router.push("/dashboard/tasks")}
                className="mt-6 flex items-center gap-2 self-start px-4.5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs tracking-wider uppercase transition-all duration-200 group"
              >
                <span>Enter Workspace</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANAGER REQUEST STAFF ACCOUNT MODAL */}
      {isReqOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-purple-500" />
            
            <h3 className="text-base font-black text-slate-800 dark:text-slate-200 pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              Request Staff Account Creation
            </h3>

            {reqErr && (
              <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-800/40 text-red-300 text-xs">
                {reqErr}
              </div>
            )}

            {reqSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs">
                {reqSuccess}
              </div>
            )}

            <form onSubmit={handleRequestSubmit} className="space-y-4.5 text-xs font-semibold text-slate-600 dark:text-slate-350">
              <div>
                <label className="block text-slate-400 uppercase tracking-wider mb-1.5">Employee Full Name</label>
                <div className="relative">
                  <input
                    type="text"
                    value={reqName}
                    onChange={(e) => setReqName(e.target.value)}
                    placeholder="e.g. Charlie Employee"
                    className="w-full bg-slate-100 dark:bg-slate-900 border border-transparent focus:border-purple-500 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-100 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    value={reqEmail}
                    onChange={(e) => setReqEmail(e.target.value)}
                    placeholder="charlie@company.com"
                    className="w-full bg-slate-100 dark:bg-slate-900 border border-transparent focus:border-purple-500 rounded-xl px-3 py-2.5 pl-8 text-slate-800 dark:text-slate-100 outline-none"
                    required
                  />
                  <Mail className="absolute left-2.5 top-3.5 w-3.5 h-3.5 text-slate-500" />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 uppercase tracking-wider mb-1.5">Temporary Password</label>
                <div className="relative">
                  <input
                    type="text"
                    value={reqPassword}
                    onChange={(e) => setReqPassword(e.target.value)}
                    placeholder="Provide temporary password"
                    className="w-full bg-slate-100 dark:bg-slate-900 border border-transparent focus:border-purple-500 rounded-xl px-3 py-2.5 pl-8 text-slate-800 dark:text-slate-100 outline-none"
                    required
                  />
                  <Lock className="absolute left-2.5 top-3.5 w-3.5 h-3.5 text-slate-500" />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 uppercase tracking-wider mb-1.5">Requested Role</label>
                <select
                  value={reqRole}
                  onChange={(e) => setReqRole(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-transparent rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-350 outline-none font-medium"
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="MANAGER">Manager</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsReqOpen(false)}
                  className="px-4.5 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-300 rounded-xl font-bold"
                >
                  Close Drawer
                </button>
                <button
                  type="submit"
                  disabled={reqLoading}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50"
                >
                  {reqLoading ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Summary Report Modal */}
      {isReportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-3xl rounded-3xl max-h-[85vh] overflow-hidden flex flex-col relative animate-in fade-in zoom-in-95 duration-200">
            <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-purple-500 via-violet-600 to-indigo-500" />
            
            <div className="p-6 border-b border-slate-200/50 dark:border-slate-800/40 shrink-0 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/40">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-purple-500" />
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">AI Team Summary Audit</h3>
              </div>
              <button
                onClick={() => setIsReportOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg font-bold transition-all"
              >
                Close Report
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sans prose dark:prose-invert max-w-none">
              {aiLoading ? (
                <div className="h-48 flex flex-col items-center justify-center gap-4">
                  <div className="relative w-12 h-12 flex items-center justify-center">
                    <div className="absolute w-full h-full rounded-full border-4 border-purple-500/10" />
                    <div className="absolute w-full h-full rounded-full border-4 border-t-purple-600 animate-spin" />
                  </div>
                  <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 tracking-wider">
                    COMPILING DEPARTMENT KPIs & QUERYING GEMINI AI ANALYTICS...
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {aiReport ? (
                    <div className="markdown-content space-y-4">
                      {/* Simple client markdown renderer helper */}
                      {aiReport.split("\n").map((line, idx) => {
                        if (line.startsWith("# ")) {
                          return <h1 key={idx} className="text-2xl font-black text-slate-800 dark:text-white mt-4 border-b pb-2">{line.replace("# ", "")}</h1>;
                        }
                        if (line.startsWith("## ")) {
                          return <h2 key={idx} className="text-lg font-extrabold text-slate-800 dark:text-white mt-4">{line.replace("## ", "")}</h2>;
                        }
                        if (line.startsWith("### ")) {
                          return <h3 key={idx} className="text-sm font-extrabold uppercase tracking-widest text-purple-600 dark:text-purple-400 mt-4">{line.replace("### ", "")}</h3>;
                        }
                        if (line.startsWith("- ") || line.startsWith("* ")) {
                          return <li key={idx} className="list-disc ml-4 text-xs font-medium text-slate-600 dark:text-slate-300 mt-1">{line.substring(2)}</li>;
                        }
                        if (line.trim() === "") return <div key={idx} className="h-1" />;
                        return <p key={idx} className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">{line}</p>;
                      })}
                    </div>
                  ) : (
                    <p className="text-center text-slate-400 py-8">No report generated.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
