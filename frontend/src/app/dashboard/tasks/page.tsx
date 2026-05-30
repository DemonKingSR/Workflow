"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { api } from "../../../utils/api";
import {
  Kanban as KanbanIcon,
  Table as TableIcon,
  Search,
  Plus,
  Brain,
  Calendar,
  AlertCircle,
  Tag,
  MessageSquare,
  History,
  FileCheck,
  User,
  Trash2,
  Edit2,
  Clock,
  ExternalLink,
} from "lucide-react";

interface Comment {
  id: string;
  message: string;
  createdAt: string;
  user: { id: string; name: string; role: string };
}

interface WorkLog {
  id: string;
  description: string;
  hoursWorked: number;
  date: string;
  aiScore: number | null;
  aiFeedback: string | null;
  aiIssues: string | null;
  employee: { name: string };
}

interface Task {
  id: string;
  title: string;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "NOT_STARTED" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED";
  deadline: string;
  category: string;
  assignedToId: string;
  assignedTo: { id: string; name: string; email: string };
  assignedBy: { name: string; email: string };
}

export default function TasksPage() {
  const { user } = useAuth();
  
  // Data lists
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);

  // Layout states
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  
  // Filter states
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Create Task Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskPriority, setTaskPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("MEDIUM");
  const [taskCategory, setTaskCategory] = useState("General");
  const [taskDeadline, setTaskDeadline] = useState("");
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);

  // Task Detail Workspace Modal States
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [taskComments, setTaskComments] = useState<Comment[]>([]);
  const [taskLogs, setTaskLogs] = useState<WorkLog[]>([]);
  
  // Workspace Actions States
  const [newComment, setNewComment] = useState("");
  const [logDesc, setLogDesc] = useState("");
  const [logHours, setLogHours] = useState("");
  const [logLoading, setLogLoading] = useState(false);
  const [logAiScore, setLogAiScore] = useState<number | null>(null);
  const [logAiFeedback, setLogAiFeedback] = useState<string | null>(null);

  const fetchTasks = async () => {
    try {
      const data = await api.get<Task[]>("/tasks");
      setTasks(data);
    } catch (err) {
      console.error("Failed to load tasks:", err);
    }
  };

  const fetchEmployees = async () => {
    if (user?.role !== "EMPLOYEE") {
      try {
        const usersList = await api.get<any[]>("/users");
        setEmployees(usersList.filter((u) => u.role === "EMPLOYEE" && u.status === "ACTIVE"));
      } catch (err) {
        console.error("Failed to load employees:", err);
      }
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchTasks(), fetchEmployees()]);
      setLoading(false);
    };
    if (user) {
      init();
    }
  }, [user]);

  // AI Smart Task Assistant Trigger
  const handleAISuggestions = async () => {
    if (!taskTitle || !taskDesc) {
      setCreateErr("Please enter a title and description first so the AI can analyze requirements.");
      return;
    }

    setCreateErr(null);
    setAiSuggesting(true);
    try {
      const res = await api.post<{ priority: any; estimatedDays: number; category: string }>(
        "/tasks/suggest",
        { title: taskTitle, description: taskDesc }
      );
      
      setTaskPriority(res.priority);
      setTaskCategory(res.category);
      
      // Calculate projected deadline date: today + suggested days
      const date = new Date();
      date.setDate(date.getDate() + res.estimatedDays);
      setTaskDeadline(date.toISOString().split("T")[0]);
    } catch (err: any) {
      setCreateErr(`AI suggestion failed: ${err.message}. Manual details set instead.`);
    } finally {
      setAiSuggesting(false);
    }
  };

  // Submit New Task Creator
  const handleCreateTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle || !taskDesc || !taskAssignee || !taskDeadline) {
      setCreateErr("Please provide all fields.");
      return;
    }

    setCreateErr(null);
    try {
      await api.post("/tasks", {
        title: taskTitle,
        description: taskDesc,
        assignedToId: taskAssignee,
        priority: taskPriority,
        category: taskCategory,
        deadline: taskDeadline,
      });

      // Reset & refresh
      setIsCreateOpen(false);
      setTaskTitle("");
      setTaskDesc("");
      setTaskAssignee("");
      setTaskDeadline("");
      setTaskPriority("MEDIUM");
      setTaskCategory("General");
      await fetchTasks();
    } catch (err: any) {
      setCreateErr(err.message || "Failed to create task.");
    }
  };

  // Switch Task Status (Unified state modifier)
  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await api.put(`/tasks/${taskId}`, { status: newStatus });
      
      // Local state optimistic update
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus as any } : t))
      );
      
      // Update selected task in detail modal if active
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask((prev) => (prev ? { ...prev, status: newStatus as any } : null));
      }
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  // Delete task action (Admin/Manager)
  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      if (selectedTask?.id === taskId) {
        setIsDetailOpen(false);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Trigger task workspace details drawer
  const handleOpenWorkspace = async (task: Task) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
    setNewComment("");
    setLogDesc("");
    setLogHours("");
    setLogAiScore(null);
    setLogAiFeedback(null);
    
    // Fetch comments and work logs for selected task
    try {
      const taskDetail = await api.get<any>(`/tasks/${task.id}`);
      setTaskComments(taskDetail.comments || []);
      setTaskLogs(taskDetail.workLogs || []);
    } catch (err) {
      console.error("Failed to load task details:", err);
    }
  };

  // Submit Comments in detail panel
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedTask) return;

    try {
      const comment = await api.post<Comment>(`/tasks/${selectedTask.id}/comments`, {
        message: newComment,
      });
      setTaskComments((prev) => [...prev, comment]);
      setNewComment("");
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Submit Work Log
  const handleAddWorkLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logDesc.trim() || !logHours || !selectedTask) return;

    setLogLoading(true);
    setLogAiScore(null);
    setLogAiFeedback(null);
    
    try {
      const log = await api.post<any>("/worklogs", {
        taskId: selectedTask.id,
        description: logDesc,
        hoursWorked: logHours,
      });

      // Prepend to active list
      setTaskLogs((prev) => [
        {
          id: log.id,
          description: log.description,
          hoursWorked: log.hoursWorked,
          date: log.date,
          aiScore: log.aiScore,
          aiFeedback: log.aiFeedback,
          aiIssues: log.aiIssues,
          employee: { name: user?.name || "Employee" },
        },
        ...prev,
      ]);

      setLogAiScore(log.aiScore);
      setLogAiFeedback(log.aiFeedback);
      setLogDesc("");
      setLogHours("");
      
      // Auto toggle task status to COMPLETED if AI verification suggests success
      if (log.aiScore >= 80 && selectedTask.status !== "COMPLETED") {
        await handleStatusChange(selectedTask.id, "COMPLETED");
      }
    } catch (err: any) {
      alert(err.message || "Failed to log hours.");
    } finally {
      setLogLoading(false);
    }
  };

  // Filter computations
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.assignedTo.name.toLowerCase().includes(search.toLowerCase());
    
    const matchesPriority = filterPriority === "" || t.priority === filterPriority;
    const matchesStatus = filterStatus === "" || t.status === filterStatus;

    return matchesSearch && matchesPriority && matchesStatus;
  });

  const getPriorityBadge = (p: string) => {
    const badges = {
      LOW: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      MEDIUM: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
      HIGH: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
      CRITICAL: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 glow-btn",
    };
    return badges[p as keyof typeof badges] || "bg-slate-500/10 text-slate-500";
  };

  if (loading) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-purple-500/10 border-t-purple-600 rounded-full animate-spin" />
        <span className="text-sm text-slate-400 font-semibold">Syncing task list...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Workspace Header actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white">Workspace Taskboard</h2>
          <p className="text-xs text-slate-400 font-medium">Collaborate, update pipeline progressions, and submit AI audited work logs.</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* View mode toggle */}
          <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-1 rounded-xl shrink-0 shadow-sm">
            <button
              onClick={() => setViewMode("kanban")}
              className={`p-2 rounded-lg transition-all ${
                viewMode === "kanban" ? "bg-purple-600 text-white shadow" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
              title="Kanban Board"
            >
              <KanbanIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-2 rounded-lg transition-all ${
                viewMode === "table" ? "bg-purple-600 text-white shadow" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
              title="Task Table View"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Create Task Button (Manager/Admin Only) */}
          {(user?.role === "ADMIN" || user?.role === "MANAGER") && (
            <button
              onClick={() => {
                setIsCreateOpen(true);
                setCreateErr(null);
              }}
              className="flex items-center gap-2 px-4.5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-purple-500/10 w-full sm:w-auto justify-center"
            >
              <Plus className="w-4 h-4" />
              <span>Define Task</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between shadow-md">
        {/* Search */}
        <div className="relative w-full md:max-w-xs">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, description, assignee..."
            className="w-full bg-slate-100 dark:bg-slate-900 border border-transparent focus:border-purple-500 rounded-xl px-3 py-2 pl-9 text-xs outline-none transition-all placeholder-slate-400"
          />
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
        </div>

        {/* Dynamic filters */}
        <div className="flex flex-wrap gap-3 w-full md:w-auto items-center justify-end">
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="bg-slate-100 dark:bg-slate-900 border border-transparent rounded-xl px-3 py-2 text-xs text-slate-600 dark:text-slate-300 outline-none transition-all"
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-100 dark:bg-slate-900 border border-transparent rounded-xl px-3 py-2 text-xs text-slate-600 dark:text-slate-300 outline-none transition-all"
          >
            <option value="">All Statuses</option>
            <option value="NOT_STARTED">Not Started</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="BLOCKED">Blocked</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      </div>

      {/* KANBAN BOARD VIEW */}
      {viewMode === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "COMPLETED"].map((statusCol) => {
            const columnTasks = filteredTasks.filter((t) => t.status === statusCol);
            const displayTitle = statusCol.replace("_", " ");
            
            let colorHeader = "border-t-slate-400 dark:border-t-slate-800";
            if (statusCol === "IN_PROGRESS") colorHeader = "border-t-yellow-500";
            if (statusCol === "BLOCKED") colorHeader = "border-t-red-500";
            if (statusCol === "COMPLETED") colorHeader = "border-t-green-500";

            return (
              <div key={statusCol} className={`glass-panel border-t-[3px] ${colorHeader} rounded-2xl p-4 flex flex-col max-h-[75vh]`}>
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    {displayTitle}
                    <span className="bg-slate-200 dark:bg-slate-800 text-[10px] text-slate-500 px-1.5 py-0.5 rounded-full font-extrabold">
                      {columnTasks.length}
                    </span>
                  </span>
                </div>

                <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                  {columnTasks.length > 0 ? (
                    columnTasks.map((task) => (
                      <div
                        key={task.id}
                        className="p-4 rounded-xl border border-slate-205 dark:border-slate-800/40 bg-white/40 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-900 shadow-sm cursor-pointer transition-all duration-200"
                        onClick={() => handleOpenWorkspace(task)}
                      >
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <span className="text-[10px] font-bold uppercase text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            {task.category || "General"}
                          </span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${getPriorityBadge(task.priority)}`}>
                            {task.priority}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1 group-hover:text-purple-600 line-clamp-1">{task.title}</h4>
                        <p className="text-[11px] text-slate-400 leading-relaxed mb-4 line-clamp-2">{task.description}</p>

                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-semibold">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-purple-500" />
                            {new Date(task.deadline).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1 text-slate-500 max-w-[50%] truncate">
                            <User className="w-3 h-3" />
                            {task.assignedTo.name}
                          </span>
                        </div>
                      </div>
                    ))
                    ) : (
                      <div className="py-12 text-center text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                        No tasks in queue.
                      </div>
                    )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TASK TABLE VIEW */}
      {viewMode === "table" && (
        <div className="glass-panel overflow-x-auto rounded-2xl shadow-md">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-200/50 dark:border-slate-800/40 text-slate-400 uppercase tracking-widest font-extrabold">
                <th className="p-4">Task Details</th>
                <th className="p-4">Category</th>
                <th className="p-4">Assignee</th>
                <th className="p-4">Deadline</th>
                <th className="p-4">Priority</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.length > 0 ? (
                filteredTasks.map((task) => (
                  <tr
                    key={task.id}
                    className="border-b border-slate-100 dark:border-slate-800/40 hover:bg-slate-100/30 dark:hover:bg-slate-900/20 cursor-pointer transition-all font-medium"
                    onClick={() => handleOpenWorkspace(task)}
                  >
                    <td className="p-4 max-w-xs">
                      <p className="font-bold text-slate-800 dark:text-slate-100 mb-0.5 truncate">{task.title}</p>
                      <p className="text-[10px] text-slate-400 line-clamp-1">{task.description}</p>
                    </td>
                    <td className="p-4 font-semibold text-slate-500 dark:text-slate-400">{task.category || "General"}</td>
                    <td className="p-4 text-slate-600 dark:text-slate-300 font-bold">{task.assignedTo.name}</td>
                    <td className="p-4 text-slate-400 font-semibold">{new Date(task.deadline).toLocaleDateString()}</td>
                    <td className="p-4">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${getPriorityBadge(task.priority)}`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        task.status === "COMPLETED"
                          ? "bg-green-500/10 text-green-600 dark:text-green-400"
                          : task.status === "IN_PROGRESS"
                          ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                          : task.status === "BLOCKED"
                          ? "bg-red-500/10 text-red-600 dark:text-red-400"
                          : "bg-slate-500/10 text-slate-600 dark:text-slate-400"
                      }`}>
                        {task.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleOpenWorkspace(task)}
                        className="p-2 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 rounded-xl transition-all"
                        title="Enter workspace"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                    No matching tasks found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE TASK DRAWER/MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-xl rounded-2xl p-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-purple-500" />
            
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="text-base font-black text-slate-800 dark:text-slate-200">Define Team Task</h3>
              <button
                type="button"
                onClick={handleAISuggestions}
                disabled={aiSuggesting}
                className="flex items-center gap-1 text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400 hover:text-purple-500 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-xl disabled:opacity-50 hover:scale-105 transition-all"
              >
                <Brain className="w-3.5 h-3.5 animate-pulse" />
                <span>{aiSuggesting ? "Analyzing..." : "Use AI Assistant"}</span>
              </button>
            </div>

            {createErr && (
              <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-800/40 text-red-300 text-xs">
                {createErr}
              </div>
            )}

            <form onSubmit={handleCreateTaskSubmit} className="space-y-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <div>
                <label className="block text-slate-400 uppercase tracking-wider mb-1.5">Task Title</label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Map Database Relational Schema"
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-transparent focus:border-purple-500 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-100 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 uppercase tracking-wider mb-1.5">Requirements / Description</label>
                <textarea
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder="Detail the specifications so the AI Smart Assistant can estimate timeframes and categories..."
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-transparent focus:border-purple-500 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-100 outline-none h-24 resize-none font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 uppercase tracking-wider mb-1.5">Assigned Employee</label>
                  <select
                    value={taskAssignee}
                    onChange={(e) => setTaskAssignee(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-900 border border-transparent rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-300 outline-none font-medium"
                    required
                  >
                    <option value="">Select Assignee</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 uppercase tracking-wider mb-1.5">Category</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={taskCategory}
                      onChange={(e) => setTaskCategory(e.target.value)}
                      placeholder="e.g. Backend"
                      className="w-full bg-slate-100 dark:bg-slate-900 border border-transparent focus:border-purple-500 rounded-xl px-3 py-2.5 pl-8 text-slate-800 dark:text-slate-100 outline-none font-medium"
                      required
                    />
                    <Tag className="absolute left-2.5 top-3 w-3.5 h-3.5 text-slate-500" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 uppercase tracking-wider mb-1.5">Priority Level</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                    className="w-full bg-slate-100 dark:bg-slate-900 border border-transparent rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-350 outline-none font-medium"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 uppercase tracking-wider mb-1.5">Target Deadline</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={taskDeadline}
                      onChange={(e) => setTaskDeadline(e.target.value)}
                      className="w-full bg-slate-100 dark:bg-slate-900 border border-transparent focus:border-purple-500 rounded-xl px-3 py-2.5 pl-8 text-slate-800 dark:text-slate-100 outline-none font-medium"
                      required
                    />
                    <Calendar className="absolute left-2.5 top-3.5 w-3.5 h-3.5 text-slate-500" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4.5 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold hover:from-purple-500 hover:to-indigo-500"
                >
                  Define Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TASK DETAIL / WORKSPACE DIALOG */}
      {isDetailOpen && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-4xl rounded-2xl max-h-[85vh] overflow-hidden flex flex-col relative animate-in fade-in zoom-in-95 duration-200">
            <div className="absolute top-0 left-0 w-full h-[4px] bg-purple-500" />
            
            {/* Header info */}
            <div className="p-5 border-b border-slate-150 dark:border-slate-800/40 shrink-0 flex justify-between items-start bg-slate-50/50 dark:bg-slate-900/40 gap-4">
              <div>
                <div className="flex flex-wrap gap-2 items-center mb-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400 bg-slate-200 dark:bg-slate-800 px-2.5 py-0.5 rounded">
                    {selectedTask.category}
                  </span>
                  <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full border ${getPriorityBadge(selectedTask.priority)}`}>
                    {selectedTask.priority}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    Deadline: {new Date(selectedTask.deadline).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-base font-black text-slate-800 dark:text-slate-100">{selectedTask.title}</h3>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Status Switcher Dropdown */}
                {selectedTask.assignedToId === user?.id || user?.role !== "EMPLOYEE" ? (
                  <select
                    value={selectedTask.status}
                    onChange={(e) => handleStatusChange(selectedTask.id, e.target.value)}
                    className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-350 outline-none"
                  >
                    <option value="NOT_STARTED">Not Started</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="BLOCKED">Blocked</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                ) : (
                  <span className="text-xs font-bold px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg">
                    {selectedTask.status.replace("_", " ")}
                  </span>
                )}

                {/* Supervisor Delete */}
                {user?.role !== "EMPLOYEE" && (
                  <button
                    onClick={() => handleDeleteTask(selectedTask.id)}
                    className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                    title="Delete Task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                
                <button
                  onClick={() => setIsDetailOpen(false)}
                  className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg font-bold"
                >
                  Close Workspace
                </button>
              </div>
            </div>

            {/* Split panels container */}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row text-xs">
              
              {/* Left Column: Specifications & Work Log Submission */}
              <div className="w-full md:w-1/2 p-5 overflow-y-auto border-b md:border-b-0 md:border-r border-slate-150 dark:border-slate-800/40 space-y-5 flex flex-col justify-between">
                
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Specifications</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-300 leading-relaxed bg-slate-50/50 dark:bg-slate-900/40 p-3 rounded-xl border font-medium">
                      {selectedTask.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-[11px] text-slate-400">
                    <div>
                      <span className="block font-bold">Assigned By:</span>
                      <span className="text-slate-800 dark:text-slate-200 font-bold">{selectedTask.assignedBy.name}</span>
                    </div>
                    <div>
                      <span className="block font-bold">Assigned To:</span>
                      <span className="text-slate-800 dark:text-slate-200 font-bold">{selectedTask.assignedTo.name}</span>
                    </div>
                  </div>
                </div>

                {/* Submitting Daily Work Log (Employee only) */}
                {selectedTask.assignedToId === user?.id && selectedTask.status !== "COMPLETED" && (
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3 shrink-0">
                    <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-bold uppercase tracking-widest text-[10px]">
                      <FileCheck className="w-4 h-4" />
                      <span>Submit Daily Progress Log</span>
                    </div>

                    {logAiScore !== null && (
                      <div className={`p-3 rounded-xl border text-[11px] font-medium leading-relaxed animate-in fade-in duration-300 ${
                        logAiScore >= 80
                          ? "bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400"
                          : logAiScore >= 60
                          ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-400"
                          : "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400"
                      }`}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-extrabold text-xs">AI Evaluation Index:</span>
                          <span className="font-extrabold text-sm px-2 py-0.5 rounded-full bg-slate-900 text-white shadow-md">
                            {logAiScore}/100
                          </span>
                        </div>
                        <p>{logAiFeedback}</p>
                      </div>
                    )}

                    <form onSubmit={handleAddWorkLog} className="space-y-3 font-semibold">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                          <input
                            type="text"
                            value={logDesc}
                            onChange={(e) => setLogDesc(e.target.value)}
                            placeholder="Detail your engineering progress..."
                            className="w-full bg-slate-100 dark:bg-slate-900 border border-transparent focus:border-purple-500 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 outline-none"
                            required
                          />
                        </div>
                        <div>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.5"
                              value={logHours}
                              onChange={(e) => setLogHours(e.target.value)}
                              placeholder="Hours"
                              className="w-full bg-slate-100 dark:bg-slate-900 border border-transparent focus:border-purple-500 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 outline-none pr-7"
                              required
                            />
                            <Clock className="absolute right-2 top-2.5 w-3.5 h-3.5 text-slate-500" />
                          </div>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={logLoading}
                        className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 uppercase text-[10px] tracking-wider"
                      >
                        {logLoading ? (
                          <>
                            <div className="w-3.5 h-3.5 rounded-full border border-slate-300 border-t-transparent animate-spin" />
                            <span>AI Evaluating Compliance...</span>
                          </>
                        ) : (
                          <span>Verify & Submit Log</span>
                        )}
                      </button>
                    </form>
                  </div>
                )}
              </div>

              {/* Right Column: Work Logs Review & Comments Timeline */}
              <div className="w-full md:w-1/2 flex flex-col justify-between overflow-hidden">
                
                {/* Top Panel: Work logs list */}
                <div className="h-1/2 p-5 border-b border-slate-150 dark:border-slate-800/40 overflow-y-auto space-y-3 bg-slate-50/20 dark:bg-slate-900/10">
                  <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-400 mb-1.5 shrink-0">
                    <History className="w-4 h-4 text-purple-500" />
                    <span>Submitted Work Logs ({taskLogs.length})</span>
                  </div>

                  <div className="space-y-3 overflow-y-auto">
                    {taskLogs.length > 0 ? (
                      taskLogs.map((log) => (
                        <div
                          key={log.id}
                          className="p-3 rounded-xl border border-slate-100 dark:border-slate-800/50 bg-white/40 dark:bg-slate-900/40 relative overflow-hidden"
                        >
                          <div className="flex justify-between items-start gap-2 mb-1.5">
                            <span className="font-bold text-[10px] text-slate-700 dark:text-slate-300">
                              {log.employee.name} • {new Date(log.date).toLocaleDateString()}
                            </span>
                            <div className="flex items-center gap-1">
                              <span className="font-bold bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[9px] text-slate-500 shrink-0">
                                {log.hoursWorked} hrs
                              </span>
                              {log.aiScore !== null && (
                                <span className={`font-bold px-1.5 py-0.5 rounded text-[9px] shadow-sm text-white ${
                                  log.aiScore >= 80
                                    ? "bg-green-600"
                                    : log.aiScore >= 60
                                    ? "bg-yellow-600"
                                    : "bg-red-600"
                                }`}>
                                  AI: {log.aiScore}%
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <p className="text-[10px] text-slate-600 dark:text-slate-300 leading-relaxed font-semibold mb-1">{log.description}</p>
                          {log.aiFeedback && (
                            <p className="text-[9px] text-purple-500/90 dark:text-purple-400 leading-relaxed bg-purple-500/5 dark:bg-purple-900/10 p-2 rounded-lg border border-purple-500/10 font-bold">
                              AI: "{log.aiFeedback}"
                            </p>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-slate-400 text-[10px] py-4">No hours logged yet.</p>
                    )}
                  </div>
                </div>

                {/* Bottom Panel: Comments board */}
                <div className="h-1/2 flex flex-col justify-between overflow-hidden p-5">
                  <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-400 mb-2 shrink-0">
                    <MessageSquare className="w-4 h-4 text-purple-500" />
                    <span>Discussion Board ({taskComments.length})</span>
                  </div>

                  {/* Comments feed */}
                  <div className="flex-1 overflow-y-auto space-y-2 mb-3 pr-1">
                    {taskComments.length > 0 ? (
                      taskComments.map((cmt) => (
                        <div key={cmt.id} className="p-2.5 rounded-xl border border-slate-100/50 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/30">
                          <div className="flex justify-between items-baseline mb-0.5 text-[9px] text-slate-400 font-bold">
                            <span className="text-slate-800 dark:text-slate-200">
                              {cmt.user.name}{" "}
                              <span className="text-[8px] uppercase tracking-wider text-slate-500 px-1 bg-slate-200 dark:bg-slate-850 rounded">
                                {cmt.user.role}
                              </span>
                            </span>
                            <span>{new Date(cmt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-[10px] leading-relaxed text-slate-600 dark:text-slate-350 font-semibold">{cmt.message}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-slate-400 text-[10px] py-4">No comments posted.</p>
                    )}
                  </div>

                  {/* Add comment Form */}
                  <form onSubmit={handleAddComment} className="flex gap-2 shrink-0 font-semibold">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Post a query or update details..."
                      className="w-full bg-slate-100 dark:bg-slate-900 border border-transparent focus:border-purple-500 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 outline-none"
                      required
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold uppercase text-[10px] tracking-wider"
                    >
                      Post
                    </button>
                  </form>
                </div>

              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
