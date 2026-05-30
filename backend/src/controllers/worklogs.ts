import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { Role } from "../types/enums";
import { AuthRequest } from "../middleware/auth";
import { logAudit } from "../services/audit";
import { createNotification } from "../services/notifications";
import { verifyWorkLog, generateTeamSummary } from "../services/ai";

const prisma = new PrismaClient();

export const submitWorkLog = async (req: AuthRequest, res: Response) => {
  const { taskId, description, hoursWorked, attachments } = req.body;
  const employeeId = req.user?.id!;

  if (!taskId || !description || hoursWorked === undefined) {
    return res.status(400).json({ error: "Task reference, description, and hours worked are required." });
  }

  const hours = parseFloat(hoursWorked);
  if (isNaN(hours) || hours <= 0) {
    return res.status(400).json({ error: "Hours worked must be a valid positive number." });
  }

  try {
    // 1. Verify task belongs to this employee
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return res.status(404).json({ error: "Task not found." });
    }

    if (task.assignedToId !== employeeId && req.user?.role === Role.EMPLOYEE) {
      return res.status(403).json({ error: "Forbidden. You are not assigned to this task." });
    }

    // 2. Trigger AI Work Log Verification (Gemini / Heuristic fallback)
    const aiResult = await verifyWorkLog(task.title, task.description, description, hours);

    // 3. Create WorkLog record
    const workLog = await prisma.workLog.create({
      data: {
        taskId,
        employeeId,
        description,
        hoursWorked: hours,
        aiScore: aiResult.aiScore,
        aiFeedback: aiResult.aiFeedback,
        aiIssues: aiResult.aiIssues,
        attachments: attachments || null,
      },
    });

    // 4. Audit Log
    await logAudit(employeeId, "WORKLOG_SUBMIT", "WorkLog", workLog.id, null, {
      taskId,
      hoursWorked: hours,
      aiScore: aiResult.aiScore,
    });

    // 5. Notify Manager
    await createNotification(
      task.assignedById,
      "Work Log Submitted",
      `${req.user?.name} submitted a work log for "${task.title}". Quality Score: ${aiResult.aiScore}/100. AI Feedback: "${aiResult.aiFeedback}"`
    );

    return res.status(201).json(workLog);
  } catch (error) {
    console.error("Submit work log error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

export const getAllWorkLogs = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized." });

  const { employeeId, taskId } = req.query;

  try {
    const filters: any = {};

    if (req.user.role === Role.EMPLOYEE) {
      // Employees can only view their own logs
      filters.employeeId = req.user.id;
    } else {
      // Admins/Managers can filter logs
      if (employeeId) filters.employeeId = employeeId as string;
      if (taskId) filters.taskId = taskId as string;
    }

    const workLogs = await prisma.workLog.findMany({
      where: filters,
      include: {
        employee: { select: { id: true, name: true, email: true } },
        task: { select: { id: true, title: true, priority: true, status: true } },
      },
      orderBy: { date: "desc" },
    });

    return res.json(workLogs);
  } catch (error) {
    console.error("Get work logs error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

export const getTeamSummaryReport = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized." });
  if (req.user.role === Role.EMPLOYEE) {
    return res.status(403).json({ error: "Forbidden. Managers and Admins only." });
  }

  try {
    // 1. Fetch system statistics
    const employees = await prisma.user.findMany({
      where: { role: Role.EMPLOYEE },
      include: {
        tasksAssigned: true,
        workLogs: true,
      },
    });

    const tasks = await prisma.task.findMany();
    const activeTasks = tasks.filter(t => t.status !== "COMPLETED").length;
    const completedTasksCount = tasks.filter(t => t.status === "COMPLETED").length;

    // Check overdue tasks (deadlines past today and status not completed)
    const now = new Date();
    const overdueTasksCount = tasks.filter(t => t.status !== "COMPLETED" && new Date(t.deadline) < now).length;

    // 2. Format employee details for AI processor
    const employeeData = employees.map(emp => {
      const assigned = emp.tasksAssigned;
      const completed = assigned.filter(t => t.status === "COMPLETED");
      const pending = assigned.filter(t => t.status !== "COMPLETED");
      const overdue = assigned.filter(t => t.status !== "COMPLETED" && new Date(t.deadline) < now);
      
      const totalHours = emp.workLogs.reduce((acc, log) => acc + log.hoursWorked, 0);
      
      // Filter out work logs without score
      const scoredLogs = emp.workLogs.filter(log => log.aiScore !== null && log.aiScore !== undefined);
      const avgScore = scoredLogs.length > 0
        ? scoredLogs.reduce((acc, log) => acc + (log.aiScore || 0), 0) / scoredLogs.length
        : 0;

      return {
        name: emp.name,
        email: emp.email,
        completedCount: completed.length,
        pendingCount: pending.length,
        overdueCount: overdue.length,
        hoursLogged: totalHours,
        averageScore: avgScore,
      };
    });

    // 3. Compile report via Gemini AI service
    const reportMarkdown = await generateTeamSummary({
      membersCount: employees.length,
      activeTasks,
      completedTasksCount,
      overdueTasksCount,
      employees: employeeData,
    });

    // Save a audit record that report was requested
    await logAudit(req.user.id, "AI_SUMMARY_GENERATE", "System", "TeamReport", null, {
      employeesAudited: employees.length,
      overdueFlagged: overdueTasksCount,
    });

    return res.json({ report: reportMarkdown });
  } catch (error) {
    console.error("Generate team summary error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};
