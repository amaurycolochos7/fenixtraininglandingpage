import { timingSafeEqual } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { attachAdminCookie } from "@/lib/admin-auth";

export const runtime = "nodejs";

function safePasswordMatch(input: string, expected: string) {
  const left = Buffer.from(input);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export async function POST(request: NextRequest) {
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "ADMIN_PASSWORD no está configurado." },
      { status: 500 }
    );
  }

  const body = (await request.json().catch(() => null)) as { password?: string } | null;
  const password = body?.password || "";

  if (!safePasswordMatch(password, expected)) {
    return NextResponse.json({ ok: false, error: "Contraseña incorrecta." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  attachAdminCookie(response);
  return response;
}
