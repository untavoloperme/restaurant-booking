import { NextResponse } from "next/server";
import { getSaSession } from "@/lib/sa-auth";
import { readFileSync, existsSync } from "fs";

export const dynamic = "force-dynamic";

const LOG_FILE = "/tmp/restaurant-deploy.log";

const STEPS = [
  { key: "pull",    pattern: "Pulling latest code",         label: "Pull codice" },
  { key: "npm",     pattern: "Installing dependencies",      label: "Dipendenze" },
  { key: "migrate", pattern: "Applying database migrations", label: "Migrazioni DB" },
  { key: "build",   pattern: "Building application",         label: "Build Next.js" },
  { key: "pm2",     pattern: "Reloading PM2 process",        label: "Riavvio PM2" },
  { key: "done",    pattern: "Done at",                      label: "Completato" },
] as const;

type StepStatus = "pending" | "running" | "done" | "error";

export async function GET() {
  const session = await getSaSession();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  if (!existsSync(LOG_FILE)) {
    return NextResponse.json({ exists: false, steps: [], lines: [], done: false, hasError: false });
  }

  const content = readFileSync(LOG_FILE, "utf-8");
  const allLines = content.split("\n").filter((l) => l.trim());
  const lastLines = allLines.slice(-60);

  const done = allLines.some((l) => l.includes("Done at"));
  const hasError = allLines.some((l) => l.includes("==> [deploy] ERROR"));

  const steps = STEPS.map((step, i) => {
    const reached = allLines.some((l) => l.includes(step.pattern));
    if (!reached) return { key: step.key, label: step.label, status: "pending" as StepStatus };

    const nextPattern = i < STEPS.length - 1 ? STEPS[i + 1].pattern : null;
    const nextReached = nextPattern ? allLines.some((l) => l.includes(nextPattern)) : false;

    if (nextReached || (step.key === "done" && done)) {
      return { key: step.key, label: step.label, status: "done" as StepStatus };
    }
    if (hasError) {
      return { key: step.key, label: step.label, status: "error" as StepStatus };
    }
    return { key: step.key, label: step.label, status: "running" as StepStatus };
  });

  return NextResponse.json({ exists: true, steps, lines: lastLines, done, hasError });
}
