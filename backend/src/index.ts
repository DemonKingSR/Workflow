import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import apiRouter from "./routes";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable Cross-Origin Resource Sharing (CORS) for Next.js frontend
app.use(
  cors({
    origin: "*", // In production, restrict this to the frontend URL
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Body Parser Middleware
app.use(express.json());

// Main API Router mount
app.use("/api", apiRouter);

// Basic health check route
app.get("/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date() });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Global Error Handler:", err);
  res.status(500).json({ error: "An unexpected error occurred." });
});

// Start listening
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 WORKFLOW BACKEND API RUNNING ON PORT ${PORT}`);
  console.log(`🔗 API ENDPOINT: http://localhost:${PORT}/api`);
  console.log(`======================================================\n`);
});
