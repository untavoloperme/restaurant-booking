import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// SendApp does not support incoming-message webhooks — this endpoint is a no-op.
export async function POST() {
  return NextResponse.json({ ok: true });
}
