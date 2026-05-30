import { GoogleGenerativeAI } from "@google/generative-ai";
import { Priority, TaskStatus } from "../types/enums";

const API_KEY = process.env.GEMINI_API_KEY || "";
const hasApiKey = API_KEY.trim().length > 0;

// Initialize the Gemini client if key exists
const genAI = hasApiKey ? new GoogleGenerativeAI(API_KEY) : null;

// Interfaces for response shapes
export interface WorkLogVerificationResult {
  aiScore: number; // 0 to 100
  aiFeedback: string; // Detail explanation
  aiIssues: string; // Specific issues or "None"
}

export interface TaskSuggestionResult {
  priority: Priority;
  estimatedDays: number;
  category: string;
}

/**
 * 1. AI Work Log Verification
 */
export async function verifyWorkLog(
  taskTitle: string,
  taskDesc: string,
  logDesc: string,
  hours: number
): Promise<WorkLogVerificationResult> {
  const prompt = `
    You are an AI Manager validating employee work log submissions.
    Task Title: "${taskTitle}"
    Task Description: "${taskDesc}"
    Employee Work Log Submission: "${logDesc}"
    Hours Worked: ${hours} hours

    Evaluate the work log against the task based on:
    1. Relevance: Is the work performed actually related to the assigned task?
    2. Level of Detail: Does the log offer enough engineering or administrative details of what was done, or is it overly generic?
    3. Progress Quality: Does the work represent constructive progress toward completing the task?
    4. Completion Validity: Does the work support completing the task?

    Provide your response strictly in the following JSON format:
    {
      "aiScore": <number between 0 and 100 reflecting the quality, completeness, and relevance>,
      "aiFeedback": "<a concise 2-3 sentence professional summary evaluation>",
      "aiIssues": "<list any red flags or issues found, or 'None' if perfect>"
    }
    Output ONLY the JSON and nothing else. Do not include markdown code block formatting.
  `;

  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      
      // Attempt to strip json codeblock markers if any
      const cleaned = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      if (
        typeof parsed.aiScore === "number" &&
        parsed.aiFeedback &&
        parsed.aiIssues
      ) {
        return {
          aiScore: Math.min(100, Math.max(0, parsed.aiScore)),
          aiFeedback: parsed.aiFeedback,
          aiIssues: parsed.aiIssues,
        };
      }
    } catch (error) {
      console.warn("Gemini API log verification failed, falling back to heuristics:", error);
    }
  }

  // Heuristic Fallback
  return runHeuristicWorkLogVerification(taskTitle, taskDesc, logDesc, hours);
}

/**
 * 2. AI Smart Task Assistant
 */
export async function suggestTaskDetails(
  taskTitle: string,
  taskDesc: string
): Promise<TaskSuggestionResult> {
  const prompt = `
    You are a Smart Project Manager assistant.
    We are defining a new task:
    Title: "${taskTitle}"
    Description: "${taskDesc}"

    Analyze the title and description to automatically recommend:
    1. Priority level: Must be one of: LOW, MEDIUM, HIGH, CRITICAL.
    2. Estimated completion time in days: A realistic whole number of days to finish (e.g. 1, 3, 5, 10).
    3. Task category: A single-word or short phase category (e.g. Frontend, Backend, Database, QA, Marketing, Design, Operations).

    Provide your response strictly in the following JSON format:
    {
      "priority": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
      "estimatedDays": <number of days>,
      "category": "<category name>"
    }
    Output ONLY the JSON and nothing else. Do not include markdown code block formatting.
  `;

  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      const cleaned = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      const priorities: Priority[] = [Priority.LOW, Priority.MEDIUM, Priority.HIGH, Priority.CRITICAL];
      if (
        priorities.includes(parsed.priority) &&
        typeof parsed.estimatedDays === "number" &&
        parsed.category
      ) {
        return {
          priority: parsed.priority as Priority,
          estimatedDays: Math.max(1, parsed.estimatedDays),
          category: parsed.category,
        };
      }
    } catch (error) {
      console.warn("Gemini API task details suggestion failed, falling back to heuristics:", error);
    }
  }

  // Heuristic Fallback
  return runHeuristicTaskSuggestion(taskTitle, taskDesc);
}

/**
 * 3. AI Manager Team Summary Report
 */
export async function generateTeamSummary(teamData: {
  membersCount: number;
  activeTasks: number;
  completedTasksCount: number;
  overdueTasksCount: number;
  employees: Array<{
    name: string;
    email: string;
    completedCount: number;
    pendingCount: number;
    overdueCount: number;
    hoursLogged: number;
    averageScore: number;
  }>;
}): Promise<string> {
  const prompt = `
    You are an Expert AI Chief Operations Officer auditing a company department's performance.
    
    Department Aggregated Data:
    - Total Team Members: ${teamData.membersCount}
    - Total Active/Pending Tasks: ${teamData.activeTasks}
    - Completed Tasks: ${teamData.completedTasksCount}
    - Overdue Tasks: ${teamData.overdueTasksCount}

    Team Members Detailed Metrics:
    ${JSON.stringify(teamData.employees, null, 2)}

    Please compose a professional, highly action-oriented Executive Manager Summary Report in Markdown.
    Include the following structured sections:
    1. ### Executive Summary: High-level operations overview.
    2. ### High Performers: Highlight employees demonstrating excellent productivity (completed tasks, high AI scores, logged hours).
    3. ### Employees Falling Behind / At Risk: Call out members who have low progress, multiple overdue tasks, or poor work log quality scores.
    4. ### Potential Project Risks: Synthesize bottlenecks, high overdue tasks ratios, or low average log scores.
    5. ### Recommended Manager Actions: List 3 to 5 clear, concrete actions the manager should take immediately (e.g., follow ups, resource re-allocations).

    Avoid generic advice. Tailor recommendations specifically based on the provided metrics.
    Make the layout elegant, visual, and clean.
  `;

  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.warn("Gemini API team summary failed, falling back to heuristics:", error);
    }
  }

  // Heuristic Fallback
  return runHeuristicTeamSummary(teamData);
}

/**
 * =========================================================================
 * HEURISTIC FALLBACK IMPLEMENTATIONS
 * =========================================================================
 */

function runHeuristicWorkLogVerification(
  taskTitle: string,
  taskDesc: string,
  logDesc: string,
  hours: number
): WorkLogVerificationResult {
  const cleanLog = logDesc.toLowerCase().trim();
  const cleanTitle = taskTitle.toLowerCase();
  const cleanDesc = taskDesc.toLowerCase();

  let score = 75; // Baseline
  const issues: string[] = [];

  // 1. Length checks
  if (cleanLog.length < 15) {
    score -= 30;
    issues.push("Work log description is extremely brief.");
  } else if (cleanLog.length < 40) {
    score -= 15;
    issues.push("Work log description lacks sufficient detail.");
  } else if (cleanLog.length > 120) {
    score += 10; // Extra credit for comprehensive logs
  }

  // 2. Keyword relevance checks
  const titleWords = cleanTitle.split(/\s+/).filter(w => w.length > 3);
  let matchCount = 0;
  for (const word of titleWords) {
    if (cleanLog.includes(word)) {
      matchCount++;
    }
  }
  if (matchCount > 0) {
    score += Math.min(15, matchCount * 5);
  } else {
    score -= 15;
    issues.push("Low direct text relevance to task title.");
  }

  // 3. Flags for filler content
  const genericTerms = ["done", "finished everything", "worked on it", "completed task", "fixed bugs", "as instructed"];
  let genericMatches = 0;
  for (const term of genericTerms) {
    if (cleanLog === term || cleanLog.startsWith(term + " ")) {
      genericMatches++;
    }
  }
  if (genericMatches > 0 || cleanLog.length < 20) {
    score -= 20;
    issues.push("Contains highly generic or filler explanations.");
  }

  // 4. Hours realistic checks
  if (hours <= 0) {
    score -= 10;
    issues.push("Hours logged is zero or negative.");
  } else if (hours > 12) {
    score -= 5;
    issues.push("Highly unusual work log hours (>12 hrs). Verify validity.");
  }

  // Ensure score constraints
  score = Math.min(100, Math.max(0, score));

  // Determine feedback text
  let feedback = "";
  if (score >= 85) {
    feedback = "Work log appears highly detailed, directly relevant, and provides a clear description of structural accomplishments.";
  } else if (score >= 60) {
    feedback = "Work log is relevant and sufficient but could benefit from a higher level of details or specific task milestones.";
  } else {
    feedback = "Work log is highly inadequate, lacks depth, or is irrelevant to the assigned task context. Follow up required.";
  }

  return {
    aiScore: score,
    aiFeedback: feedback,
    aiIssues: issues.length > 0 ? issues.join(" ") : "None",
  };
}

function runHeuristicTaskSuggestion(
  taskTitle: string,
  taskDesc: string
): TaskSuggestionResult {
  const text = (taskTitle + " " + taskDesc).toLowerCase();
  
  let category = "General";
  let estimatedDays = 3;
  let priority: Priority = Priority.MEDIUM;

  // Category determination
  if (text.includes("schema") || text.includes("database") || text.includes("sql") || text.includes("postgresql") || text.includes("prisma")) {
    category = "Database";
    estimatedDays = 3;
  } else if (text.includes("api") || text.includes("endpoint") || text.includes("express") || text.includes("backend") || text.includes("auth") || text.includes("jwt")) {
    category = "Backend";
    estimatedDays = 4;
  } else if (text.includes("ui") || text.includes("css") || text.includes("tailwind") || text.includes("frontend") || text.includes("component") || text.includes("page")) {
    category = "Frontend";
    estimatedDays = 3;
  } else if (text.includes("test") || text.includes("qa") || text.includes("cypress") || text.includes("jest")) {
    category = "Testing";
    estimatedDays = 2;
  } else if (text.includes("docker") || text.includes("deploy") || text.includes("aws") || text.includes("ci/cd")) {
    category = "DevOps";
    estimatedDays = 2;
  }

  // Priority determination
  if (text.includes("critical") || text.includes("urgent") || text.includes("auth") || text.includes("security") || text.includes("crash")) {
    priority = Priority.CRITICAL;
  } else if (text.includes("high") || text.includes("important") || text.includes("database") || text.includes("schema")) {
    priority = Priority.HIGH;
  } else if (text.includes("low") || text.includes("minor") || text.includes("aesthetic") || text.includes("refactor")) {
    priority = Priority.LOW;
  }

  // Estimate fine-tuning
  if (text.includes("quick") || text.includes("simple") || text.includes("fix")) {
    estimatedDays = 1;
  } else if (text.includes("complex") || text.includes("rewrite") || text.includes("integrate")) {
    estimatedDays = Math.max(5, estimatedDays + 2);
  }

  return {
    priority,
    estimatedDays,
    category,
  };
}

function runHeuristicTeamSummary(teamData: {
  membersCount: number;
  activeTasks: number;
  completedTasksCount: number;
  overdueTasksCount: number;
  employees: Array<{
    name: string;
    email: string;
    completedCount: number;
    pendingCount: number;
    overdueCount: number;
    hoursLogged: number;
    averageScore: number;
  }>;
}): string {
  const highPerformers = teamData.employees.filter(
    e => e.completedCount >= 1 || e.averageScore >= 80 || e.hoursLogged >= 8
  );
  const fallingBehind = teamData.employees.filter(
    e => e.overdueCount > 0 || (e.completedCount === 0 && e.hoursLogged < 4) || e.averageScore < 70
  );

  let report = `# AI Team Performance Heuristic Audit Report\n\n`;
  report += `### Operations Summary\n`;
  report += `- **Total Team Members**: ${teamData.membersCount}\n`;
  report += `- **Active/Pending Work items**: ${teamData.activeTasks}\n`;
  report += `- **Completed Work items**: ${teamData.completedTasksCount}\n`;
  report += `- **Overdue Tasks Red Flags**: ${teamData.overdueTasksCount}\n\n`;

  report += `### High Performers\n`;
  if (highPerformers.length > 0) {
    highPerformers.forEach(e => {
      report += `- **${e.name}**: Completed ${e.completedCount} tasks, logged ${e.hoursLogged} hours with an outstanding average AI score of **${e.averageScore.toFixed(0)}%**.\n`;
    });
  } else {
    report += `*No clear high performers identified for this billing period.*\n`;
  }
  report += `\n`;

  report += `### Employees Falling Behind / At Risk\n`;
  if (fallingBehind.length > 0) {
    fallingBehind.forEach(e => {
      let reasons = [];
      if (e.overdueCount > 0) reasons.push(`${e.overdueCount} overdue task(s)`);
      if (e.averageScore < 70 && e.averageScore > 0) reasons.push(`low AI quality score (${e.averageScore.toFixed(0)}%)`);
      if (e.hoursLogged < 5) reasons.push(`low hours logged (${e.hoursLogged} hrs)`);
      report += `- **${e.name}**: Flagged for **${reasons.join(", ")}** (${e.pendingCount} pending task(s)).\n`;
    });
  } else {
    report += `*All team members are currently meeting production milestones successfully.*\n`;
  }
  report += `\n`;

  report += `### Potential Project Risks\n`;
  if (teamData.overdueTasksCount > 0) {
    report += `- **Overdue Bottlenecks**: There are ${teamData.overdueTasksCount} overdue tasks. Deadlines are sliding, creating product launch risks.\n`;
  }
  const lowAvgScoreEmployees = teamData.employees.filter(e => e.averageScore > 0 && e.averageScore < 75);
  if (lowAvgScoreEmployees.length > 0) {
    report += `- **Task Quality Standards**: Several employees (${lowAvgScoreEmployees.map(e => e.name).join(", ")}) are logging tasks that are verified with lower quality ratings by AI compliance guidelines.\n`;
  }
  if (teamData.overdueTasksCount === 0 && lowAvgScoreEmployees.length === 0) {
    report += `- **Risk Rating: LOW**: The project timeline and code quality compliance ratings are in highly stable thresholds.\n`;
  }
  report += `\n`;

  report += `### Recommended Manager Actions\n`;
  report += `1. **Conduct Overdue Follow-ups**: Schedule a sync with any team members holding overdue tasks to unblock them.\n`;
  report += `2. **Enhance Work Log Specificity**: Inform employees with low AI validation scores of the importance of descriptive logging.\n`;
  report += `3. **Reward Excellence**: Acknowledge the top performers to maintain positive morale and team output.\n`;

  return report;
}
