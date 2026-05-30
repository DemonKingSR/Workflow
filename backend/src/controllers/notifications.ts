import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth";

const prisma = new PrismaClient();

export const getNotifications = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized." });

  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });

    return res.json(notifications);
  } catch (error) {
    console.error("Get notifications error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

export const markAsRead = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  if (!req.user) return res.status(401).json({ error: "Unauthorized." });

  try {
    const notification = await prisma.notification.findFirst({
      where: { id, userId: req.user.id },
    });

    if (!notification) {
      return res.status(404).json({ error: "Notification not found." });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    return res.json(updated);
  } catch (error) {
    console.error("Mark notification read error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

export const markAllAsRead = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized." });

  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, read: false },
      data: { read: true },
    });

    return res.json({ message: "All notifications marked as read." });
  } catch (error) {
    console.error("Mark all read error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};
