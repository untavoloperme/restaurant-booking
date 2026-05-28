import { getSaSession } from "@/lib/sa-auth";
import { NextResponse } from "next/server";
import { spawn } from "child_process";

const CWD = "/root/restaurant-booking";

function sse(line: string): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(line)}\n\n`);
}

export async function POST() {
  const session = await getSaSession();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const stream = new ReadableStream({
    start(controller) {
      const send = (line: string) => controller.enqueue(sse(line));
      const done = () => {
        controller.enqueue(new TextEncoder().encode(`data: __DONE__\n\n`));
        controller.close();
      };

      send("--- Avvio build Next.js ---");

      const build = spawn("npm", ["run", "build"], {
        cwd: CWD,
        shell: true,
        env: { ...process.env, FORCE_COLOR: "0" },
      });

      build.stdout.on("data", (chunk: Buffer) =>
        chunk.toString().split("\n").filter(Boolean).forEach(send)
      );
      build.stderr.on("data", (chunk: Buffer) =>
        chunk.toString().split("\n").filter(Boolean).forEach(send)
      );

      build.on("close", (code) => {
        if (code !== 0) {
          send(`--- Build fallito (code ${code}) ---`);
          done();
          return;
        }
        send("--- Build completato ---");
        send("--- Riavvio worker Asterisk ---");

        const restart = spawn("pm2", ["restart", "asterisk-bridge"], {
          cwd: CWD,
          shell: true,
        });
        restart.stdout.on("data", (chunk: Buffer) =>
          chunk.toString().split("\n").filter(Boolean).forEach(send)
        );
        restart.stderr.on("data", (chunk: Buffer) =>
          chunk.toString().split("\n").filter(Boolean).forEach(send)
        );
        restart.on("close", (code2) => {
          send(code2 === 0 ? "--- Worker riavviato ---" : `--- Errore riavvio worker (code ${code2}) ---`);
          done();
        });
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
