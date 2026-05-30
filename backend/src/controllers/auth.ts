import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { Role } from "../types/enums";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";
import { AuthRequest } from "../middleware/auth";
import { logAudit } from "../services/audit";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "workflow_jwt_secret_token_key_2026";

export const login = async (req: AuthRequest, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    if (user.status !== "ACTIVE") {
      return res.status(403).json({ error: "Your account is deactivated. Please contact an admin." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Write login entry to Audit Log (no state diff needed)
    await logAudit(user.id, "USER_LOGIN", "User", user.id, null, { email: user.email, role: user.role });

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized." });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    return res.json(user);
  } catch (error) {
    console.error("Get profile error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized." });
  }

  const { name, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const prevValue = { name: user.name };
    const data: any = {};
    if (name) data.name = name;

    if (password) {
      const salt = await bcrypt.genSalt(10);
      data.password = await bcrypt.hash(password, salt);
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: { id: true, name: true, email: true, role: true, status: true },
    });

    await logAudit(req.user.id, "PROFILE_UPDATE", "User", req.user.id, prevValue, { name: updatedUser.name });

    return res.json(updatedUser);
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

export const forgotPassword = async (req: AuthRequest, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required." });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Return 200 for security reasons so attackers can't enumerate active emails
      return res.json({ message: "If that email exists in our records, we've sent instructions." });
    }

    console.log(`\n================= [PASSWORD RESET REQUEST] =================`);
    console.log(`TO: ${user.name} <${user.email}>`);
    console.log(`SUBJECT: WorkFlow Password Reset Instruction`);
    console.log(`BODY:`);
    console.log(`Hi ${user.name},`);
    console.log(`You requested a password reset. Here is your temporary token for reset: MOCK_RESET_TOKEN_2026`);
    console.log(`=============================================================\n`);

    return res.json({ message: "Password reset instructions sent. Please check the server backend console." });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};
