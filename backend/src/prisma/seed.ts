import { PrismaClient } from "@prisma/client";
import { Role, Priority, TaskStatus } from "../types/enums";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clear existing data (in case of reseed)
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.workLog.deleteMany();
  await prisma.task.deleteMany();
  await prisma.user.deleteMany();

  // Create Users
  const salt = await bcrypt.genSalt(10);
  const adminPassword = await bcrypt.hash("AdminPass123", salt);
  const managerPassword = await bcrypt.hash("ManagerPass123", salt);
  const employeePassword = await bcrypt.hash("EmployeePass123", salt);

  const admin = await prisma.user.upsert({
    where: { email: "admin@workflow.com" },
    update: {},
    create: {
      email: "admin@workflow.com",
      name: "Alice Admin",
      password: adminPassword,
      role: Role.ADMIN,
      status: "ACTIVE",
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: "manager@workflow.com" },
    update: {},
    create: {
      email: "manager@workflow.com",
      name: "Bob Manager",
      password: managerPassword,
      role: Role.MANAGER,
      status: "ACTIVE",
    },
  });

  const employee = await prisma.user.upsert({
    where: { email: "employee@workflow.com" },
    update: {},
    create: {
      email: "employee@workflow.com",
      name: "Charlie Employee",
      password: employeePassword,
      role: Role.EMPLOYEE,
      status: "ACTIVE",
    },
  });

  console.log("Users seeded successfully:", {
    admin: admin.email,
    manager: manager.email,
    employee: employee.email,
  });

  // Create Tasks
  const task1 = await prisma.task.create({
    data: {
      title: "Design PostgreSQL Schemas",
      description: "Map out the complete relational database architecture for the WorkFlow platform, including users, tasks, logs, and comments.",
      priority: Priority.HIGH,
      status: TaskStatus.COMPLETED,
      deadline: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      category: "Database",
      assignedToId: employee.id,
      assignedById: manager.id,
    },
  });

  const task2 = await prisma.task.create({
    data: {
      title: "Implement JWT & API Auth",
      description: "Construct secure authentication endpoints using express-jwt, bcrypt, and role-based access control filters.",
      priority: Priority.CRITICAL,
      status: TaskStatus.IN_PROGRESS,
      deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      category: "Backend",
      assignedToId: employee.id,
      assignedById: manager.id,
    },
  });

  const task3 = await prisma.task.create({
    data: {
      title: "Build Responsive Kanban Board",
      description: "Develop a modern React drag-and-drop or state-selectable Kanban board styled with TailWind CSS featuring glassmorphism layout.",
      priority: Priority.MEDIUM,
      status: TaskStatus.NOT_STARTED,
      deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      category: "Frontend",
      assignedToId: employee.id,
      assignedById: manager.id,
    },
  });

  const task4 = await prisma.task.create({
    data: {
      title: "Setup SMTP Email Alerts",
      description: "Integrate mock email triggers to notify team members when a task is overdue or a new work log has been reviewed.",
      priority: Priority.LOW,
      status: TaskStatus.BLOCKED,
      deadline: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000), // 8 days from now
      category: "DevOps",
      assignedToId: employee.id,
      assignedById: manager.id,
    },
  });

  console.log("Tasks seeded successfully.");

  // Create Work Logs
  await prisma.workLog.create({
    data: {
      taskId: task1.id,
      employeeId: employee.id,
      description: "Finished drafting the schema.prisma. Established cascade delete logic on related tasks. Run successful validation tests with SQLite and PostgreSQL local containers.",
      hoursWorked: 6.5,
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      aiScore: 92,
      aiFeedback: "The work log is highly descriptive, matches the task context, and provides clear evidence of schema drafting and environment validations.",
      aiIssues: "None",
    },
  });

  await prisma.workLog.create({
    data: {
      taskId: task2.id,
      employeeId: employee.id,
      description: "Drafted routes/auth.ts and created the verifyJWT validation middleware. Having minor struggles resolving Type definitions for Express request models.",
      hoursWorked: 4.0,
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      aiScore: 78,
      aiFeedback: "The log is relevant to Auth implementation, but lacks details on how request type issues are currently being addressed.",
      aiIssues: "Missing specific resolution details",
    },
  });

  console.log("Work logs seeded successfully.");

  // Create Comments
  await prisma.comment.create({
    data: {
      taskId: task2.id,
      userId: manager.id,
      message: "Please ensure that token expiry is set to 24h, and refresh tokens are handled securely.",
    },
  });

  await prisma.comment.create({
    data: {
      taskId: task2.id,
      userId: employee.id,
      message: "Understood! Expiry is configured at 24 hours. Express request type casting resolved by extending global Express namespace.",
    },
  });

  // Create Notifications
  await prisma.notification.create({
    data: {
      userId: employee.id,
      title: "New Task Assigned",
      message: "You have been assigned a critical task: 'Implement JWT & API Auth' by Bob Manager.",
      read: false,
    },
  });

  await prisma.notification.create({
    data: {
      userId: manager.id,
      title: "Work Log Submitted",
      message: "Charlie Employee submitted a work log for 'Implement JWT & API Auth'. AI evaluation completed with a score of 78.",
      read: false,
    },
  });

  // Create Audit Logs
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: "USER_CREATE",
      entityType: "User",
      entityId: employee.id,
      newValue: JSON.stringify({ email: employee.email, role: employee.role, name: employee.name }),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: manager.id,
      action: "TASK_CREATE",
      entityType: "Task",
      entityId: task2.id,
      newValue: JSON.stringify({ title: task2.title, priority: task2.priority, deadline: task2.deadline }),
    },
  });

  console.log("Audit logs seeded successfully.");
  console.log("Database seeding completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
