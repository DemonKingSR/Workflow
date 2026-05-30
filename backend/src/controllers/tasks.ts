import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { Role, Priority, TaskStatus } from "../types/enums";
import { AuthRequest } from "../middleware/auth";
import { logAudit } from "../services/audit";
import { createNotification } from "../services/notifications";
import { suggestTaskDetails } from "../services/ai";

const prisma = new PrismaClient();

export const getAllTasks = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized." });

  try {
    let tasks;

    if (req.user.role === Role.EMPLOYEE) {
      // Employees only see their own assigned tasks
      tasks = await prisma.task.findMany({
        where: { assignedToId: req.user.id },
        include: {
          assignedTo: { select: { id: true, name: true, email: true } },
          assignedBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { deadline: "asc" },
      });
    } else {
      // Admins and Managers see all tasks
      tasks = await prisma.task.findMany({
        include: {
          assignedTo: { select: { id: true, name: true, email: true } },
          assignedBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { deadline: "asc" },
      });
    }

    return res.json(tasks);
  } catch (error) {
    console.error("Get tasks error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

export const getTaskById = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  if (!req.user) return res.status(401).json({ error: "Unauthorized." });

  try {
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        assignedBy: { select: { id: true, name: true, email: true } },
        comments: {
          include: { user: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: "asc" },
        },
        workLogs: {
          include: { employee: { select: { id: true, name: true } } },
          orderBy: { date: "desc" },
        },
      },
    });

    if (!task) {
      return res.status(404).json({ error: "Task not found." });
    }

    // Verify employee has permission to view this task
    if (req.user.role === Role.EMPLOYEE && task.assignedToId !== req.user.id) {
      return res.status(403).json({ error: "Forbidden. Access denied." });
    }

    return res.json(task);
  } catch (error) {
    console.error("Get task detail error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

export const createTask = async (req: AuthRequest, res: Response) => {
  const { title, description, assignedToId, priority, deadline, category } = req.body;
  const userId = req.user?.id;

  if (!title || !description || !assignedToId || !deadline) {
    return res.status(400).json({ error: "Title, description, assignee, and deadline are required." });
  }

  try {
    // Verify assignee exists and is an Employee
    const assignee = await prisma.user.findUnique({ where: { id: assignedToId } });
    if (!assignee) {
      return res.status(400).json({ error: "Assignee user not found." });
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        assignedToId,
        assignedById: userId!,
        priority: (priority as Priority) || Priority.MEDIUM,
        status: TaskStatus.NOT_STARTED,
        deadline: new Date(deadline),
        category: category || "General",
      },
      include: {
        assignedTo: { select: { name: true, email: true } },
      },
    });

    // Audit log
    await logAudit(userId!, "TASK_CREATE", "Task", task.id, null, {
      title: task.title,
      assignedTo: task.assignedToId,
      priority: task.priority,
      deadline: task.deadline,
    });

    // Notify employee
    await createNotification(
      assignedToId,
      "New Task Assigned",
      `You have been assigned a task: "${task.title}" by ${req.user?.name}. Deadline: ${new Date(deadline).toLocaleDateString()}.`
    );

    return res.status(201).json(task);
  } catch (error) {
    console.error("Create task error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

export const updateTask = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { title, description, assignedToId, priority, status, deadline, category } = req.body;
  const userId = req.user?.id!;
  const role = req.user?.role!;

  try {
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return res.status(404).json({ error: "Task not found." });

    const prevValue = {
      title: task.title,
      description: task.description,
      assignedToId: task.assignedToId,
      priority: task.priority,
      status: task.status,
      deadline: task.deadline,
      category: task.category,
    };

    const data: any = {};

    if (role === Role.EMPLOYEE) {
      // Employees can only update task status!
      if (task.assignedToId !== userId) {
        return res.status(403).json({ error: "Forbidden. You are not assigned to this task." });
      }

      if (status) {
        data.status = status as TaskStatus;
      }

      const updatedTask = await prisma.task.update({
        where: { id },
        data,
        include: { assignedBy: { select: { id: true } } },
      });

      // Audit Log
      await logAudit(userId, "STATUS_CHANGE", "Task", id, prevValue, { status: updatedTask.status });

      // Notify Manager
      await createNotification(
        updatedTask.assignedById,
        "Task Status Updated",
        `${req.user?.name} updated task status for "${updatedTask.title}" to ${updatedTask.status}.`
      );

      return res.json(updatedTask);
    } else {
      // Admins and Managers can update everything
      if (title) data.title = title;
      if (description) data.description = description;
      if (assignedToId) {
        // Verify assignee exists
        const assignee = await prisma.user.findUnique({ where: { id: assignedToId } });
        if (!assignee) return res.status(400).json({ error: "Assignee user not found." });
        data.assignedToId = assignedToId;
      }
      if (priority) data.priority = priority as Priority;
      if (status) data.status = status as TaskStatus;
      if (deadline) data.deadline = new Date(deadline);
      if (category) data.category = category;

      const updatedTask = await prisma.task.update({
        where: { id },
        data,
      });

      // Audit Log
      await logAudit(userId, "TASK_UPDATE", "Task", id, prevValue, {
        title: updatedTask.title,
        priority: updatedTask.priority,
        status: updatedTask.status,
        assignedTo: updatedTask.assignedToId,
      });

      // Notify Employee if assignee changed or details updated
      if (assignedToId && assignedToId !== task.assignedToId) {
        // Notify new employee
        await createNotification(
          assignedToId,
          "New Task Assigned",
          `You have been assigned a task: "${updatedTask.title}" by ${req.user?.name}.`
        );
        // Notify old employee
        await createNotification(
          task.assignedToId,
          "Task Unassigned",
          `You have been unassigned from task: "${task.title}".`
        );
      } else {
        // Notify existing employee of modifications
        await createNotification(
          updatedTask.assignedToId,
          "Task Details Modified",
          `The details for task: "${updatedTask.title}" have been updated by ${req.user?.name}.`
        );
      }

      return res.json(updatedTask);
    }
  } catch (error) {
    console.error("Update task error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

export const deleteTask = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id!;

  try {
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return res.status(404).json({ error: "Task not found." });

    await prisma.task.delete({ where: { id } });

    // Audit Log
    await logAudit(userId, "TASK_DELETE", "Task", id, { title: task.title, status: task.status }, null);

    // Notify employee of cancellation
    await createNotification(
      task.assignedToId,
      "Task Cancelled",
      `Task "${task.title}" has been deleted by ${req.user?.name}.`
    );

    return res.json({ message: "Task deleted successfully." });
  } catch (error) {
    console.error("Delete task error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

export const addComment = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { message } = req.body;
  const userId = req.user?.id!;

  if (!message || message.trim() === "") {
    return res.status(400).json({ error: "Comment message is required." });
  }

  try {
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return res.status(404).json({ error: "Task not found." });

    // Validate employee has permission
    if (req.user?.role === Role.EMPLOYEE && task.assignedToId !== userId) {
      return res.status(403).json({ error: "Forbidden. Access denied." });
    }

    const comment = await prisma.comment.create({
      data: {
        taskId: id,
        userId,
        message,
      },
      include: {
        user: { select: { id: true, name: true, role: true } },
      },
    });

    // Audit log
    await logAudit(userId, "COMMENT_ADD", "Comment", comment.id, null, { taskId: id, message });

    // Notify other parties
    if (userId === task.assignedToId) {
      // Employee commented, notify manager who created it
      await createNotification(
        task.assignedById,
        "New Comment Added",
        `${req.user?.name} commented on "${task.title}": "${message.substring(0, 30)}..."`
      );
    } else {
      // Manager/Admin commented, notify employee assigned
      await createNotification(
        task.assignedToId,
        "New Comment Added",
        `${req.user?.name} commented on "${task.title}": "${message.substring(0, 30)}..."`
      );
    }

    return res.status(201).json(comment);
  } catch (error) {
    console.error("Add comment error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

export const runSmartAssistant = async (req: AuthRequest, res: Response) => {
  const { title, description } = req.body;

  if (!title || !description) {
    return res.status(400).json({ error: "Title and description are required." });
  }

  try {
    const suggestion = await suggestTaskDetails(title, description);
    return res.json(suggestion);
  } catch (error) {
    console.error("Smart assistant error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};
