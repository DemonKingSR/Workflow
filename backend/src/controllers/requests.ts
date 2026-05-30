import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { AuthRequest } from "../middleware/auth";
import { Role } from "../types/enums";
import { logAudit } from "../services/audit";
import { createNotification } from "../services/notifications";

const prisma = new PrismaClient();

export const createAccountRequest = async (req: AuthRequest, res: Response) => {
  const { name, email, password, role } = req.body;
  const managerId = req.user?.id!;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email, and password are required." });
  }

  const reqRole = role || Role.EMPLOYEE;

  try {
    // 1. Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "A user with this email address already exists in the system directory." });
    }

    // 2. Check if a pending request already exists for this email
    const existingRequest = await prisma.accountRequest.findFirst({
      where: { email, status: "PENDING" },
    });
    if (existingRequest) {
      return res.status(400).json({ error: "An account creation request for this email is already pending review." });
    }

    // 3. Create the request
    const request = await prisma.accountRequest.create({
      data: {
        name,
        email,
        password, // stored in request plain for Admin review/approval hashing, or standard vault
        role: reqRole,
        requestedById: managerId,
        status: "PENDING",
      },
    });

    // 4. Audit Log
    await logAudit(managerId, "REQUEST_CREATE", "AccountRequest", request.id, null, {
      name,
      email,
      role: reqRole,
    });

    // 5. Notify all Admins
    const admins = await prisma.user.findMany({ where: { role: Role.ADMIN } });
    for (const admin of admins) {
      await createNotification(
        admin.id,
        "New Account Requested",
        `Manager ${req.user?.name} has requested an account creation for "${name}" (${reqRole}).`
      );
    }

    return res.status(201).json(request);
  } catch (error) {
    console.error("Create account request error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

export const getAccountRequests = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized." });

  try {
    let requests;

    if (req.user.role === Role.ADMIN) {
      // Admins see all requests
      requests = await prisma.accountRequest.findMany({
        include: {
          requestedBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    } else {
      // Managers see only requests they submitted
      requests = await prisma.accountRequest.findMany({
        where: { requestedById: req.user.id },
        include: {
          requestedBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    }

    return res.json(requests);
  } catch (error) {
    console.error("Get account requests error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

export const approveAccountRequest = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const adminId = req.user?.id!;

  try {
    // 1. Find request
    const request = await prisma.accountRequest.findUnique({ where: { id } });
    if (!request) {
      return res.status(404).json({ error: "Account request not found." });
    }

    if (request.status !== "PENDING") {
      return res.status(400).json({ error: "This request has already been processed." });
    }

    // 2. Check if email conflicts
    const conflictUser = await prisma.user.findUnique({ where: { email: request.email } });
    if (conflictUser) {
      // Auto-reject or throw warning
      return res.status(400).json({ error: "A user with this email address already exists. Please reject the request." });
    }

    // 3. Hash password & create user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(request.password, salt);

    const newUser = await prisma.user.create({
      data: {
        name: request.name,
        email: request.email,
        password: hashedPassword,
        role: request.role as any,
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    });

    // 4. Update request status to APPROVED
    await prisma.accountRequest.update({
      where: { id },
      data: { status: "APPROVED" },
    });

    // 5. Audit Log
    await logAudit(adminId, "REQUEST_APPROVE", "AccountRequest", id, { status: "PENDING" }, { status: "APPROVED" });
    await logAudit(adminId, "USER_CREATE", "User", newUser.id, null, {
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      status: newUser.status,
    });

    // 6. Notify requesting Manager
    await createNotification(
      request.requestedById,
      "Account Request Approved",
      `Your account creation request for "${request.name}" has been APPROVED. Account is now active.`
    );

    return res.json({ message: "Account request approved and created successfully.", user: newUser });
  } catch (error) {
    console.error("Approve account request error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

export const rejectAccountRequest = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const adminId = req.user?.id!;

  try {
    const request = await prisma.accountRequest.findUnique({ where: { id } });
    if (!request) {
      return res.status(404).json({ error: "Account request not found." });
    }

    if (request.status !== "PENDING") {
      return res.status(400).json({ error: "This request has already been processed." });
    }

    // Update status to REJECTED
    await prisma.accountRequest.update({
      where: { id },
      data: { status: "REJECTED" },
    });

    // Audit Log
    await logAudit(adminId, "REQUEST_REJECT", "AccountRequest", id, { status: "PENDING" }, { status: "REJECTED" });

    // Notify Manager
    await createNotification(
      request.requestedById,
      "Account Request Rejected",
      `Your account creation request for "${request.name}" has been REJECTED by corporate administration.`
    );

    return res.json({ message: "Account request rejected successfully." });
  } catch (error) {
    console.error("Reject account request error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};
