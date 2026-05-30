import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const createNotification = async (userId: string, title: string, message: string) => {
  try {
    // 1. Create in-app notification in DB
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        read: false,
      },
    });

    // 2. Mock Email Notification
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (user) {
      console.log(`\n================= [EMAIL NOTIFICATION SENT] =================`);
      console.log(`TO: ${user.name} <${user.email}>`);
      console.log(`SUBJECT: ${title}`);
      console.log(`BODY:`);
      console.log(`Hi ${user.name},`);
      console.log(`${message}`);
      console.log(`\nView details: http://localhost:3000/dashboard`);
      console.log(`=============================================================\n`);
    }

    return notification;
  } catch (error) {
    console.error("Failed to create notification:", error);
  }
};
