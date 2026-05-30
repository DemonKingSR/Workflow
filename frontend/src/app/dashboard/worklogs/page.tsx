"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { api } from "../../../utils/api";
import {
  FileCheck,
  Search,
  Filter,
  User,
  ClipboardList,
  Clock,
  Award,
  AlertTriangle,
} from "lucide-react";

interface WorkLog {
  id: string;
  description: string;
  hoursWorked: number;
  date: string;
  aiScore: number | null;
  aiFeedback: string | null;
  aiIssues: string | null;
  attachments: string | null;
  employee: { id: string; name: string; email: string };
  task: { id: string; title: string; priority: string; status: string };
}

export default function WorkLogsPage() {
  const { user } = useAuth();
  
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [employees, setEmployees] = useState<Array<{ id: string; name: string }>>([]);
  const [tasks, setTasks] = useState<Array<{ id: string; title: string }>>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterTask, setFilterTask] = useState("");

  const fetchLogs = async () => {
    try {
      let queryParams = [];
      if (filterEmployee) queryParams.push(`employeeId=${filterEmployee}`);
      if (filterTask) queryParams.push(`taskId=${filterTask}`);
      const queryString = queryParams.length > 0 ? `?${queryParams.join("&")}` : "";

      const data = await api.get<WorkLog[]>(`/worklogs${queryString}`);
      setLogs(data);
    } catch (err) {
      console.error("Failed to load work logs:", err);
    }
  };

  const fetchFiltersData = async () => {
    if (user?.role !== "EMPLOYEE") {
      try {
        const [usersList, tasksList] = await Promise.all([
          api.get<any[]>("/users"),
          api.get<any[]>("/tasks"),
        ]);
        setEmployees(usersList.filter((u) => u.role === "EMPLOYEE"));
        setTasks(tasksList);
      } catch (err) {
        console.error("Failed to load filters metadata:", err);
      }
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchLogs(), fetchFiltersData()]);
      setLoading(false);
    };
    if (user) {
      init();
    }
  }, [user, filterEmployee, filterTask]);

  if (loading) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-purple-500/10 border-t-purple-600 rounded-full animate-spin" />
        <span className="text-sm text-slate-400 font-semibold">Retrieving daily work logs...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-black text-slate-800 dark:text-white">Employee Work Logs</h2>
        <p className="text-xs text-slate-400 font-medium">
          {user?.role === "EMPLOYEE"
            ? "Inspect your daily progress log history and review AI accountability ratings."
            : "Monitor staff task logs, aggregate billing hours, and audit AI quality evaluations."}
        </p>
      </div>

      {/* Filters (Managers/Admins only) */}
      {user?.role !== "EMPLOYEE" && (
        <div className="glass-panel p-4 rounded-2xl flex flex-col sm:flex-row gap-4 items-center justify-start shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 text-xs shrink-0 font-bold uppercase tracking-wider">
            <Filter className="w-4 h-4 text-purple-500" />
            <span>Filter logs:</span>
          </div>

          <div className="flex flex-wrap gap-3 w-full sm:w-auto font-semibold">
            <select
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              className="bg-slate-100 dark:bg-slate-900 border border-transparent rounded-xl px-3 py-2 text-xs text-slate-600 dark:text-slate-350 outline-none"
            >
              <option value="">All Employees</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>

            <select
              value={filterTask}
              onChange={(e) => setFilterTask(e.target.value)}
              className="bg-slate-100 dark:bg-slate-900 border border-transparent rounded-xl px-3 py-2 text-xs text-slate-600 dark:text-slate-350 outline-none"
            >
              <option value="">All Tasks</option>
              {tasks.map((tsk) => (
                <option key={tsk.id} value={tsk.id}>{tsk.title}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Logs Feed grid */}
      <div className="grid grid-cols-1 gap-4.5">
        {logs.length > 0 ? (
          logs.map((log) => {
            const dateStr = new Date(log.date).toLocaleDateString("en-US", {
              weekday: "short",
              year: "numeric",
              month: "short",
              day: "numeric",
            });
            const timeStr = new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <div key={log.id} className="glass-panel p-5 rounded-2xl relative overflow-hidden group">
                {/* Score bar indicator */}
                {log.aiScore !== null && (
                  <div className={`absolute left-0 top-0 w-1.5 h-full ${
                    log.aiScore >= 80 ? "bg-green-500" : log.aiScore >= 60 ? "bg-yellow-500" : "bg-red-500"
                  }`} />
                )}

                <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
                  <div>
                    <div className="flex flex-wrap gap-2 items-center mb-1 text-[10px] text-slate-400 font-bold">
                      <span className="flex items-center gap-1 text-slate-800 dark:text-slate-200">
                        <User className="w-3.5 h-3.5" />
                        {log.employee.name}
                      </span>
                      <span>•</span>
                      <span>{dateStr} at {timeStr}</span>
                    </div>
                    
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5 mt-1.5">
                      <ClipboardList className="w-4.5 h-4.5 text-purple-500" />
                      {log.task.title}
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <span className="flex items-center gap-1 text-[10px] font-bold bg-slate-100 dark:bg-slate-900 border px-3 py-1 rounded-xl text-slate-500">
                      <Clock className="w-3.5 h-3.5 text-purple-500" />
                      {log.hoursWorked} hours logged
                    </span>
                    
                    {log.aiScore !== null && (
                      <span className={`flex items-center gap-1 text-[10px] font-extrabold px-3 py-1 rounded-xl shadow-sm text-white ${
                        log.aiScore >= 80 ? "bg-green-600" : log.aiScore >= 60 ? "bg-yellow-600" : "bg-red-600"
                      }`}>
                        <Award className="w-3.5 h-3.5 animate-pulse" />
                        Score: {log.aiScore}%
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-3 pl-0.5 text-xs">
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Work Description</span>
                    <p className="text-[11px] text-slate-600 dark:text-slate-350 leading-relaxed font-semibold">
                      {log.description}
                    </p>
                  </div>

                  {log.aiFeedback && (
                    <div className="bg-purple-500/5 dark:bg-purple-900/10 p-3.5 rounded-xl border border-purple-500/10 space-y-1.5">
                      <span className="block text-[9px] font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                        AI Compliance Audit Log
                      </span>
                      <p className="text-[10px] text-slate-500 dark:text-purple-300 leading-relaxed font-semibold italic">
                        "{log.aiFeedback}"
                      </p>
                      {log.aiIssues && log.aiIssues !== "None" && (
                        <div className="flex items-start gap-1.5 text-[9px] text-red-500 dark:text-red-400 font-extrabold mt-2 border-t border-red-500/10 pt-2 shrink-0">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>AI Warnings: {log.aiIssues}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="glass-panel py-16 text-center text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            No work logs submitted matching these filters.
          </div>
        )}
      </div>
    </div>
  );
}
