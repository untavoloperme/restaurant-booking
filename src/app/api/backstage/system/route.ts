import { NextResponse } from "next/server";
import { execSync } from "child_process";
import { getSaSession } from "@/lib/sa-auth";
import { APP_VERSION } from "@/lib/version";

function getGitHash(): string {
  try {
    return execSync("git rev-parse --short HEAD", { cwd: process.cwd() }).toString().trim();
  } catch {
    return "unknown";
  }
}

function getGitBranch(): string {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", { cwd: process.cwd() }).toString().trim();
  } catch {
    return "unknown";
  }
}

async function fetchLatestVersion(): Promise<string | null> {
  const repo = process.env.GITHUB_REPO;
  if (!repo) return null;
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers: { Accept: "application/vnd.github+json" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json() as { tag_name?: string };
    return data.tag_name?.replace(/^v/, "") ?? null;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const session = await getSaSession();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const checkUpdate = searchParams.get("check") === "1";

  const info: Record<string, string | null> = {
    version: APP_VERSION,
    gitHash: getGitHash(),
    gitBranch: getGitBranch(),
    latestVersion: null,
  };

  if (checkUpdate) {
    info.latestVersion = await fetchLatestVersion();
  }

  return NextResponse.json(info);
}

export async function POST(req: Request) {
  const session = await getSaSession();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { action } = await req.json() as { action?: string };
  if (action !== "deploy") {
    return NextResponse.json({ error: "Azione non valida" }, { status: 400 });
  }

  const deployScript = `${process.cwd()}/scripts/deploy.sh`;

  // Run deploy in background — stream log lines via SSE isn't needed here,
  // we just fire-and-forget and return immediately
  try {
    execSync(`bash ${deployScript} >> /root/.pm2/logs/deploy.log 2>&1 &`, {
      cwd: process.cwd(),
    });
    return NextResponse.json({ ok: true, message: "Deploy avviato in background. Controlla i log." });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
