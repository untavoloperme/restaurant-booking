import { NextResponse } from "next/server";
import { getSaSession } from "@/lib/sa-auth";
import { getAsteriskConfig, buildSipConfSnippet, buildExtensionsConfSnippet } from "@/lib/asterisk";
import { execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync } from "fs";

const AST_DIR = "/etc/asterisk";

function log(lines: string[], msg: string) {
  lines.push(msg);
  console.log("[asterisk-setup]", msg);
}

function appendIncludeIfMissing(mainFile: string, includeFile: string, lines: string[]): void {
  if (!existsSync(mainFile)) {
    log(lines, `ATTENZIONE: ${mainFile} non trovato — include non aggiunto`);
    return;
  }
  const content = readFileSync(mainFile, "utf8");
  const directive = `#include ${includeFile}`;
  if (content.includes(directive)) {
    log(lines, `${mainFile}: #include già presente`);
    return;
  }
  writeFileSync(mainFile, content.trimEnd() + `\n${directive}\n`);
  log(lines, `${mainFile}: aggiunto #include ${includeFile}`);
}

function asteriskCmd(cmd: string, lines: string[]): void {
  try {
    const out = execSync(`asterisk -rx '${cmd}'`, { timeout: 6000 }).toString().trim();
    log(lines, `asterisk -rx '${cmd}': ${out || "OK"}`);
  } catch (e) {
    log(lines, `asterisk -rx '${cmd}': ERRORE — ${(e as Error).message.split("\n")[0]}`);
  }
}

export async function POST() {
  const session = await getSaSession();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const cfg = await getAsteriskConfig();
  const lines: string[] = [];
  let success = true;

  // ── 1. Verifica prerequisiti ─────────────────────────────
  if (!cfg.amiUser || !cfg.amiSecret) {
    return NextResponse.json({
      ok: false,
      error: "Credenziali AMI non configurate. Salva prima la configurazione.",
      output: [],
    }, { status: 400 });
  }
  if (!cfg.trunkSecret) {
    return NextResponse.json({
      ok: false,
      error: "Secret trunk SIP non configurato. Salva prima la configurazione.",
      output: [],
    }, { status: 400 });
  }

  try {
    // ── 2. manager_restaurant.conf ──────────────────────────
    const managerConf = `; Generato automaticamente da restaurant-booking
[${cfg.amiUser}]
secret = ${cfg.amiSecret}
permit = 127.0.0.1/255.255.255.255
read = system,call,user
write = system,call,reporting,originate
`;
    const managerFile = `${AST_DIR}/manager_restaurant.conf`;
    writeFileSync(managerFile, managerConf);
    log(lines, `Scritto: ${managerFile}`);
    appendIncludeIfMissing(`${AST_DIR}/manager.conf`, "manager_restaurant.conf", lines);

    // ── 3. sip_messagenet.conf ──────────────────────────────
    const sipConf = `; Generato automaticamente da restaurant-booking
; Inserisci questa riga nella sezione [general] di sip.conf:
; register => ${cfg.trunkUsername}:${cfg.trunkSecret}@${cfg.trunkHost}:${cfg.trunkPort}/${cfg.trunkUsername}

register => ${cfg.trunkUsername}:${cfg.trunkSecret}@${cfg.trunkHost}:${cfg.trunkPort}/${cfg.trunkUsername}

${buildSipConfSnippet(cfg)}
`;
    const sipFile = `${AST_DIR}/sip_messagenet.conf`;
    writeFileSync(sipFile, sipConf);
    log(lines, `Scritto: ${sipFile}`);
    appendIncludeIfMissing(`${AST_DIR}/sip.conf`, "sip_messagenet.conf", lines);

    // ── 4. extensions_messagenet.conf ───────────────────────
    const extConf = `; Generato automaticamente da restaurant-booking
${buildExtensionsConfSnippet(cfg)}
`;
    const extFile = `${AST_DIR}/extensions_messagenet.conf`;
    writeFileSync(extFile, extConf);
    log(lines, `Scritto: ${extFile}`);
    appendIncludeIfMissing(`${AST_DIR}/extensions.conf`, "extensions_messagenet.conf", lines);

    // ── 5. Ricarica moduli Asterisk ─────────────────────────
    log(lines, "--- Ricarica Asterisk ---");
    asteriskCmd("manager reload", lines);
    asteriskCmd("module reload chan_sip.so", lines);
    asteriskCmd("dialplan reload", lines);

    log(lines, "--- Setup completato ---");
  } catch (e) {
    success = false;
    log(lines, `ERRORE fatale: ${(e as Error).message}`);
  }

  return NextResponse.json({ ok: success, output: lines });
}
