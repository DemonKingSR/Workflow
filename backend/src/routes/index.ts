import { Router } from "express";
import { Role } from "../types/enums";
import { verifyToken, requireRole } from "../middleware/auth";
import {
  login,
  getProfile,
  updateProfile,
  forgotPassword,
} from "../controllers/auth";
import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
} from "../controllers/users";
import {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  addComment,
  runSmartAssistant,
} from "../controllers/tasks";
import {
  submitWorkLog,
  getAllWorkLogs,
  getTeamSummaryReport,
} from "../controllers/worklogs";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from "../controllers/notifications";
import { getAuditLogs } from "../controllers/audit";
import { getDashboardStats } from "../controllers/dashboard";
import {
  createAccountRequest,
  getAccountRequests,
  approveAccountRequest,
  rejectAccountRequest,
} from "../controllers/requests";

const router = Router();

// ==========================================
// AUTH ROUTES
// ==========================================
router.post("/auth/login", login);
router.post("/auth/forgot-password", forgotPassword);
router.get("/auth/profile", verifyToken, getProfile);
router.put("/auth/profile", verifyToken, updateProfile);

// ==========================================
// USER MANAGEMENT ROUTES (ADMIN ONLY)
// ==========================================
router.get("/users", verifyToken, requireRole([Role.ADMIN]), getAllUsers);
router.post("/users", verifyToken, requireRole([Role.ADMIN]), createUser);
router.put("/users/:id", verifyToken, requireRole([Role.ADMIN]), updateUser);
router.delete("/users/:id", verifyToken, requireRole([Role.ADMIN]), deleteUser);

// ==========================================
// TASK MANAGEMENT ROUTES
// ==========================================
router.get("/tasks", verifyToken, getAllTasks);
router.get("/tasks/:id", verifyToken, getTaskById);
router.post("/tasks", verifyToken, requireRole([Role.ADMIN, Role.MANAGER]), createTask);
router.put("/tasks/:id", verifyToken, updateTask);
router.delete("/tasks/:id", verifyToken, requireRole([Role.ADMIN, Role.MANAGER]), deleteTask);
router.post("/tasks/:id/comments", verifyToken, addComment);
router.post("/tasks/suggest", verifyToken, requireRole([Role.ADMIN, Role.MANAGER]), runSmartAssistant);

// ==========================================
// WORK LOG ROUTES
// ==========================================
router.post("/worklogs", verifyToken, requireRole([Role.EMPLOYEE]), submitWorkLog);
router.get("/worklogs", verifyToken, getAllWorkLogs);
router.get("/worklogs/team-summary", verifyToken, requireRole([Role.ADMIN, Role.MANAGER]), getTeamSummaryReport);

// ==========================================
// NOTIFICATIONS ROUTES
// ==========================================
router.get("/notifications", verifyToken, getNotifications);
router.put("/notifications/:id/read", verifyToken, markAsRead);
router.put("/notifications/read-all", verifyToken, markAllAsRead);

// ==========================================
// AUDIT TRAILS ROUTES (ADMIN/MANAGER)
// ==========================================
router.get("/audit", verifyToken, requireRole([Role.ADMIN, Role.MANAGER]), getAuditLogs);

// ==========================================
// DASHBOARD METRICS ROUTE
// ==========================================
router.get("/dashboard/stats", verifyToken, getDashboardStats);

// ==========================================
// ACCOUNT REQUESTS ROUTES
// ==========================================
router.post("/requests", verifyToken, requireRole([Role.MANAGER]), createAccountRequest);
router.get("/requests", verifyToken, requireRole([Role.ADMIN, Role.MANAGER]), getAccountRequests);
router.put("/requests/:id/approve", verifyToken, requireRole([Role.ADMIN]), approveAccountRequest);
router.put("/requests/:id/reject", verifyToken, requireRole([Role.ADMIN]), rejectAccountRequest);

export default router;
