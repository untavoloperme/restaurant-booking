import { prisma } from "@/lib/prisma";

export interface AsteriskConfig {
  enabled: boolean;
  amiHost: string;
  amiPort: number;
  amiUser: string;
  amiSecret: string;
  trunkName: string;
  trunkUsername: string;
  trunkSecret: string;
  trunkFromuser: string;
  trunkFromdomain: string;
  trunkHost: string;
  trunkPort: string;
  trunkContext: string;
}

const ASTERISK_KEYS = [
  "asterisk.enabled",
  "asterisk.ami.host",
  "asterisk.ami.port",
  "asterisk.ami.user",
  "asterisk.ami.secret",
  "asterisk.trunk.name",
  "asterisk.trunk.username",
  "asterisk.trunk.secret",
  "asterisk.trunk.fromuser",
  "asterisk.trunk.fromdomain",
  "asterisk.trunk.host",
  "asterisk.trunk.port",
  "asterisk.trunk.context",
] as const;

export async function getAsteriskConfig(): Promise<AsteriskConfig> {
  const rows = await prisma.setting.findMany({ where: { key: { in: [...ASTERISK_KEYS] } } });
  const m = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    enabled: m["asterisk.enabled"] === "true",
    amiHost: m["asterisk.ami.host"] ?? "127.0.0.1",
    amiPort: parseInt(m["asterisk.ami.port"] ?? "5038", 10),
    amiUser: m["asterisk.ami.user"] ?? "",
    amiSecret: m["asterisk.ami.secret"] ?? "",
    trunkName: m["asterisk.trunk.name"] ?? "messagenet",
    trunkUsername: m["asterisk.trunk.username"] ?? "5406386912",
    trunkSecret: m["asterisk.trunk.secret"] ?? "",
    trunkFromuser: m["asterisk.trunk.fromuser"] ?? "5406386912",
    trunkFromdomain: m["asterisk.trunk.fromdomain"] ?? "sip.messagenet.it",
    trunkHost: m["asterisk.trunk.host"] ?? "sip.messagenet.it",
    trunkPort: m["asterisk.trunk.port"] ?? "5061",
    trunkContext: m["asterisk.trunk.context"] ?? "from-trunk",
  };
}

export function isItalianMobile(normalized: string): boolean {
  // Numero locale italiano (senza prefisso) che inizia con 3, 8-10 cifre totali
  return /^3\d{8,9}$/.test(normalized);
}

export function buildSipConfSnippet(cfg: AsteriskConfig): string {
  return `[${cfg.trunkName}]
type=peer
host=${cfg.trunkHost}
port=${cfg.trunkPort}
username=${cfg.trunkUsername}
fromuser=${cfg.trunkFromuser}
fromdomain=${cfg.trunkFromdomain}
secret=${cfg.trunkSecret || "INSERISCI_SECRET"}
context=${cfg.trunkContext}
insecure=port,invite
nat=yes
qualify=yes
dtmfmode=rfc2833
disallow=all
allow=ulaw`;
}

export function buildExtensionsConfSnippet(cfg: AsteriskConfig): string {
  return `[${cfg.trunkContext}]
exten => _X.,1,NoOp(Chiamata entrante da \${CALLERID(num)})
 same => n,Wait(1)
 same => n,Hangup()`;
}

export function buildRegisterString(cfg: AsteriskConfig): string {
  const secret = cfg.trunkSecret || "INSERISCI_SECRET";
  return `register => ${cfg.trunkUsername}:${secret}@${cfg.trunkHost}:${cfg.trunkPort}/${cfg.trunkUsername}`;
}
