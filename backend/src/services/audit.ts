import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const logAudit = async (
  userId: string | null,
  action: string,
  entityType: string,
  entityId: string,
  prevValue?: any,
  newValue?: any
) => {
  try {
    const prevString = prevValue ? JSON.stringify(prevValue) : null;
    const newString = newValue ? JSON.stringify(newValue) : null;

    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        prevValue: prevString,
        newValue: newString,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
};
