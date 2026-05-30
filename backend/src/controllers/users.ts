import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { Role } from "../types/enums";
import * as bcrypt from "bcryptjs";
import { AuthRequest } from "../middleware/auth";
import { logAudit } from "../services/audit";

const prisma = new PrismaClient();

export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json(users);
  } catch (error) {
    console.error("Get users error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

export const createUser = async (req: AuthRequest, res: Response) => {
  const { name, email, role, password, status } = req.body;
  const adminId = req.user?.id || null;

  if (!name || !email || !role || !password) {
    return res.status(400).json({ error: "Name, email, role, and password are required." });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "Email already exists in system records." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        role: role as Role,
        password: hashedPassword,
        status: status || "ACTIVE",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    // Audit log User creation
    await logAudit(adminId, "USER_CREATE", "User", newUser.id, null, {
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      status: newUser.status,
    });

    return res.status(201).json(newUser);
  } catch (error) {
    console.error("Create user error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, email, role, password, status } = req.body;
  const adminId = req.user?.id || null;

  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const prevValue = {
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    };

    const data: any = {};
    if (name) data.name = name;
    if (email) {
      // Check if email conflicts with another user
      const conflictUser = await prisma.user.findFirst({
        where: { email, NOT: { id } },
      });
      if (conflictUser) {
        return res.status(400).json({ error: "Email is already taken by another user." });
      }
      data.email = email;
    }
    if (role) data.role = role as Role;
    if (status) data.status = status;

    if (password && password.trim() !== "") {
      const salt = await bcrypt.genSalt(10);
      data.password = await bcrypt.hash(password, salt);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    });

    // Audit log User update
    await logAudit(adminId, "USER_UPDATE", "User", updatedUser.id, prevValue, {
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      status: updatedUser.status,
    });

    return res.json(updatedUser);
  } catch (error) {
    console.error("Update user error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const adminId = req.user?.id || null;

  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    await prisma.user.delete({ where: { id } });

    // Audit log User deletion
    await logAudit(adminId, "USER_DELETE", "User", id, { name: user.name, email: user.email, role: user.role }, null);

    return res.json({ message: "User deleted successfully." });
  } catch (error) {
    console.error("Delete user error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};
