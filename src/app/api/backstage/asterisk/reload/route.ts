import { NextResponse } from "next/server";
import { getSaSession } from "@/lib/sa-auth";
import { getAsteriskConfig } from "@/lib/asterisk";

/* eslint-disable @typescript-eslint/no-require-imports */
// asterisk-manager non ha tipi costruttibili, usiamo require con cast
type AmiInstance = {
  keepConnected(): void;
  disconnect(): void;
  action(params: Record<string, string>, cb: (err: Error | null, res: { output?: string[] }) => void): void;
};
const AsteriskManager = require("asterisk-manager") as new (
  port: number, host: string, user: string, secret: string, events: boolean
) => AmiInstance;

export async function POST() {
  const session = await getSaSession();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const cfg = await getAsteriskConfig();
  if (!cfg.amiUser || !cfg.amiSecret) {
    return NextResponse.json({ error: "Credenziali AMI non configurate" }, { status: 400 });
  }

  try {
    const ami = new AsteriskManager(cfg.amiPort, cfg.amiHost, cfg.amiUser, cfg.amiSecret, true);
    ami.keepConnected();

    const output = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        ami.disconnect();
        reject(new Error("Timeout AMI"));
      }, 8000);

      ami.action({ Action: "Command", Command: "sip reload" }, (err, res) => {
        clearTimeout(timeout);
        ami.disconnect();
        if (err) return reject(err);
        resolve((res.output ?? []).join("\n"));
      });
    });

    return NextResponse.json({ ok: true, output });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
