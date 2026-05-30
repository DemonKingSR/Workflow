"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { api } from "../../../utils/api";
import {
  History,
  Search,
  Filter,
  Eye,
  User,
  ShieldAlert,
  ArrowRight,
  Database,
} from "lucide-react";

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  prevValue: string | null;
  newValue: string | null;
  timestamp: string;
  user: { name: string; email: string; role: string } | null;
}

export default function AuditLogsPage() {
  const { user: currentUser } = useAuth();
  
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("");

  // Expansion panel states
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      let query = [];
      if (filterAction) query.push(`action=${filterAction}`);
      const queryString = query.length > 0 ? `?${query.join("&")}` : "";

      const data = await api.get<AuditLog[]>(`/audit${queryString}`);
      setLogs(data);
    } catch (err) {
      console.error("Failed to load audit trail:", err);
    }
  };

  useEffect(() => {
    if (currentUser && currentUser.role !== "EMPLOYEE") {
      setLoading(true);
      fetchLogs().finally(() => setLoading(false));
    }
  }, [currentUser, filterAction]);

  const parseJson = (str: string | null) => {
    if (!str) return null;
    try {
      return JSON.parse(str);
    } catch (e) {
      return str;
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes("CREATE")) return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20";
    if (action.includes("DELETE")) return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
    if (action.includes("UPDATE") || action.includes("CHANGE")) return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20";
    return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20";
  };

  if (currentUser?.role === "EMPLOYEE") {
    return (
      <div className="p-6 text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold">Access Restricted</h2>
        <p className="text-sm text-slate-400">Only platform managers and administrators can view corporate audit compliance logs.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-purple-500/10 border-t-purple-600 rounded-full animate-spin" />
        <span className="text-sm text-slate-400 font-semibold">Loading system audit trail...</span>
      </div>
    );
  }

  const filteredLogs = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.entityType.toLowerCase().includes(search.toLowerCase()) ||
      (l.user?.name || "System").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-black text-slate-800 dark:text-white">Workspace Audit Trail</h2>
        <p className="text-xs text-slate-400 font-medium">Verify system action histories, analyze administrative changes, and inspect diff logs.</p>
      </div>

      {/* Searching Bar */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col sm:flex-row gap-4 items-center justify-between shadow-sm">
        <div className="relative w-full max-w-xs">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by action, actor, target..."
            className="w-full bg-slate-100 dark:bg-slate-900 border border-transparent focus:border-purple-500 rounded-xl px-3 py-2 pl-9 text-xs outline-none transition-all placeholder-slate-400 font-medium"
          />
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
        </div>

        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="bg-slate-100 dark:bg-slate-900 border border-transparent rounded-xl px-3 py-2 text-xs text-slate-600 dark:text-slate-350 outline-none w-full sm:w-auto font-semibold"
        >
          <option value="">All Action Types</option>
          <option value="USER_LOGIN">User Logins</option>
          <option value="USER_CREATE">User Creations</option>
          <option value="USER_UPDATE">User Updates</option>
          <option value="USER_DELETE">User Deletions</option>
          <option value="TASK_CREATE">Task Creations</option>
          <option value="TASK_UPDATE">Task Updates</option>
          <option value="TASK_DELETE">Task Deletions</option>
          <option value="STATUS_CHANGE">Task Status Changes</option>
          <option value="WORKLOG_SUBMIT">Work Log Submissions</option>
          <option value="COMMENT_ADD">Comments Posted</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="glass-panel overflow-x-auto rounded-2xl shadow-md">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-200/50 dark:border-slate-800/40 text-slate-400 uppercase tracking-widest font-extrabold">
              <th className="p-4">Timestamp</th>
              <th className="p-4">Responsible Actor</th>
              <th className="p-4">Action Event</th>
              <th className="p-4">Target Entity</th>
              <th className="p-4">Target Reference ID</th>
              <th className="p-4 text-center">Difference Inspector</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                const prevObj = parseJson(log.prevValue);
                const newObj = parseJson(log.newValue);
                const hasDiff = prevObj || newObj;

                return (
                  <React.Fragment key={log.id}>
                    <tr className="border-b border-slate-100 dark:border-slate-800/40 hover:bg-slate-100/30 dark:hover:bg-slate-900/20 font-medium">
                      <td className="p-4 text-slate-400 font-semibold">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-purple-500 shrink-0" />
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-100">{log.user?.name || "System"}</span>
                            <span className="text-[9px] text-slate-400 block font-semibold">{log.user?.role || "SYSTEM"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase ${getActionColor(log.action)}`}>
                          {log.action.replace("_", " ")}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-slate-500 dark:text-slate-450 flex items-center gap-1.5 mt-2">
                        <Database className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        {log.entityType}
                      </td>
                      <td className="p-4 font-mono text-[10px] text-slate-400 font-semibold">{log.entityId.substring(0, 8)}...</td>
                      <td className="p-4 text-center">
                        {hasDiff ? (
                          <button
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="p-1.5 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-all"
                            title="Inspect State Difference"
                          >
                            <Eye className="w-4 h-4 mx-auto" />
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400">-</span>
                        )}
                      </td>
                    </tr>

                    {/* Expandable JSON state diff visualizer */}
                    {isExpanded && hasDiff && (
                      <tr className="bg-slate-100/40 dark:bg-slate-900/40 border-b border-slate-150 dark:border-slate-800/40 animate-in slide-in-from-top-2 duration-200">
                        <td colSpan={6} className="p-5">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                                Previous State
                              </span>
                              <pre className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-[10px] text-red-400 font-mono overflow-x-auto max-h-48 shadow-inner">
                                {prevObj ? JSON.stringify(prevObj, null, 2) : "NULL"}
                              </pre>
                            </div>

                            <div>
                              <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                                New State Difference
                              </span>
                              <pre className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-[10px] text-green-400 font-mono overflow-x-auto max-h-48 shadow-inner">
                                {newObj ? JSON.stringify(newObj, null, 2) : "NULL"}
                              </pre>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400 text-xs">
                  No matching transaction logs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
