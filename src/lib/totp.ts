import {
  generateSecret,
  generateSync,
  verifySync,
  NobleCryptoPlugin,
  ScureBase32Plugin,
} from "otplib";

const cryptoPlugin = new NobleCryptoPlugin();
const base32Plugin = new ScureBase32Plugin();

const OPTS = { crypto: cryptoPlugin, base32: base32Plugin };

export function totpGenerateSecret(): string {
  return generateSecret();
}

export function totpGenerate(secret: string): string {
  return generateSync({ secret, ...OPTS });
}

export function totpVerify(token: string, secret: string): boolean {
  const result = verifySync({ token, secret, ...OPTS });
  return typeof result === "object" ? result.valid : (result as boolean);
}
