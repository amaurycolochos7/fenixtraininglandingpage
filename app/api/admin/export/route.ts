import { NextResponse, type NextRequest } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { getSupabaseAdmin, hasSupabaseConfig } from "@/lib/supabase";

export const runtime = "nodejs";

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  if (!hasSupabaseConfig()) {
    return new NextResponse("Supabase no configurado", { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("analytics_events")
    .select(
      "created_at,event_type,path,title,referrer,consent_status,country_name,region_name,city,device_type,browser,os,is_bot"
    )
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const headers = [
    "created_at",
    "event_type",
    "path",
    "title",
    "referrer",
    "consent_status",
    "country_name",
    "region_name",
    "city",
    "device_type",
    "browser",
    "os",
    "is_bot"
  ];
  const rows = (data || []).map((row) =>
    headers.map((header) => csvEscape(row[header as keyof typeof row])).join(",")
  );
  const csv = [headers.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": "attachment; filename=fenix-analytics.csv"
    }
  });
}
