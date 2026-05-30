import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { Role } from "../types/enums";
import { AuthRequest } from "../middleware/auth";

const prisma = new PrismaClient();

export const getAuditLogs = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized." });
  
  if (req.user.role === Role.EMPLOYEE) {
    return res.status(403).json({ error: "Forbidden. Managers and Admins only." });
  }

  try {
    const { action, entityType, userId } = req.query;
    const filter: any = {};

    if (action) filter.action = action as string;
    if (entityType) filter.entityType = entityType as string;
    if (userId) filter.userId = userId as string;

    const logs = await prisma.auditLog.findMany({
      where: filter,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { timestamp: "desc" },
    });

    return res.json(logs);
  } catch (error) {
    console.error("Get audit logs error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};
