import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { Role, TaskStatus } from "../types/enums";
import { AuthRequest } from "../middleware/auth";

const prisma = new PrismaClient();

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized." });

  const userId = req.user.id;
  const role = req.user.role;
  const now = new Date();

  try {
    if (role === Role.ADMIN) {
      // ADMIN Metrics
      const totalUsers = await prisma.user.count();
      const totalManagers = await prisma.user.count({ where: { role: Role.MANAGER } });
      const totalEmployees = await prisma.user.count({ where: { role: Role.EMPLOYEE } });
      const totalTasks = await prisma.task.count();
      const completedTasks = await prisma.task.count({ where: { status: TaskStatus.COMPLETED } });
      const activeTasks = await prisma.task.count({ where: { NOT: { status: TaskStatus.COMPLETED } } });
      
      const overdueTasks = await prisma.task.count({
        where: {
          NOT: { status: TaskStatus.COMPLETED },
          deadline: { lt: now },
        },
      });

      return res.json({
        totalUsers,
        totalManagers,
        totalEmployees,
        totalTasks,
        activeTasks,
        completedTasks,
        overdueTasks,
      });
    } else if (role === Role.MANAGER) {
      // MANAGER Metrics
      const teamMembers = await prisma.user.findMany({
        where: { role: Role.EMPLOYEE },
        select: { id: true, name: true, email: true, status: true },
      });

      const totalTeamMembers = teamMembers.length;

      const tasksCreatedByMe = await prisma.task.findMany({
        where: { assignedById: userId },
      });

      const totalTasks = tasksCreatedByMe.length;
      const completedTasks = tasksCreatedByMe.filter(t => t.status === TaskStatus.COMPLETED).length;
      const activeTasks = tasksCreatedByMe.filter(t => t.status !== TaskStatus.COMPLETED).length;
      const overdueTasks = tasksCreatedByMe.filter(t => t.status !== TaskStatus.COMPLETED && new Date(t.deadline) < now).length;

      // Productivity Metrics: calculate average AI score of work logs submitted for tasks created by me
      const logsOnMyTasks = await prisma.workLog.findMany({
        where: {
          task: { assignedById: userId },
        },
        select: { aiScore: true },
      });

      const scoredLogs = logsOnMyTasks.filter(l => l.aiScore !== null);
      const avgTeamScore = scoredLogs.length > 0
        ? scoredLogs.reduce((acc, log) => acc + (log.aiScore || 0), 0) / scoredLogs.length
        : 0;

      return res.json({
        totalTeamMembers,
        totalTasks,
        activeTasks,
        completedTasks,
        overdueTasks,
        avgTeamScore,
        teamMembers,
      });
    } else {
      // EMPLOYEE Metrics
      const myTasks = await prisma.task.findMany({
        where: { assignedToId: userId },
      });

      const pendingTasks = myTasks.filter(t => t.status !== TaskStatus.COMPLETED).length;
      const completedTasks = myTasks.filter(t => t.status === TaskStatus.COMPLETED).length;
      const upcomingDeadlines = myTasks.filter(t => t.status !== TaskStatus.COMPLETED && new Date(t.deadline) > now).length;

      const overdueTasks = myTasks.filter(t => t.status !== TaskStatus.COMPLETED && new Date(t.deadline) < now).length;

      const myLogs = await prisma.workLog.findMany({
        where: { employeeId: userId },
        select: { aiScore: true },
      });

      const scoredLogs = myLogs.filter(l => l.aiScore !== null);
      const avgScore = scoredLogs.length > 0
        ? scoredLogs.reduce((acc, log) => acc + (log.aiScore || 0), 0) / scoredLogs.length
        : 0;

      return res.json({
        pendingTasks,
        completedTasks,
        upcomingDeadlines,
        overdueTasks,
        avgScore,
      });
    }
  } catch (error) {
    console.error("Get dashboard metrics error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};
