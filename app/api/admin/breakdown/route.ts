import { NextResponse, type NextRequest } from "next/server";
import { dateDaysAgo, localDateKey, type AnalyticsEventRow } from "@/lib/analytics";
import { isAdminRequest } from "@/lib/admin-auth";
import { bucketLabel, increment, top } from "@/lib/admin-metrics";
import { getSupabaseAdmin, hasSupabaseConfig } from "@/lib/supabase";

export const runtime = "nodejs";

const dimensions = new Set(["country", "region", "page", "source", "device"]);
const titles: Record<string, string> = {
  country: "Países",
  region: "Estados",
  page: "Páginas",
  source: "Fuentes",
  device: "Dispositivos"
};

async function fetchEvents(days: number) {
  const supabase = getSupabaseAdmin();
  const since = dateDaysAgo(days).toISOString();
  const rows: AnalyticsEventRow[] = [];
  const pageSize = 1000;

  for (let from = 0; from < 10000; from += pageSize) {
    const { data, error } = await supabase
      .from("analytics_events")
      .select(
        "id, created_at, event_type, path, title, referrer, visitor_id, session_id, fingerprint_key, consent_status, country_code, country_name, region_code, region_name, city, timezone, device_type, browser, os, is_bot, metadata"
      )
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) throw error;
    rows.push(...((data || []) as AnalyticsEventRow[]));
    if (!data || data.length < pageSize) break;
  }

  return rows;
}

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const url = new URL(request.url);
  const dimension = url.searchParams.get("dimension") || "country";

  if (!dimensions.has(dimension)) {
    return NextResponse.json({ ok: false, error: "Dimensión no soportada" }, { status: 400 });
  }

  if (!hasSupabaseConfig()) {
    return NextResponse.json({
      ok: true,
      configured: false,
      title: titles[dimension],
      dimension,
      total: 0,
      buckets: [],
      recent: []
    });
  }

  const days = Math.min(Math.max(Number(url.searchParams.get("days") || 30), 7), 90);
  const events = await fetchEvents(days);
  const pageViews = events.filter((event) => event.event_type === "page_view");
  const byDimension = new Map<string, number>();
  const visitorsByBucket = new Map<string, Set<string>>();
  const sessionsByBucket = new Map<string, Set<string>>();

  for (const event of pageViews) {
    const label = bucketLabel(event, dimension);
    increment(byDimension, label);

    if (!visitorsByBucket.has(label)) visitorsByBucket.set(label, new Set());
    visitorsByBucket.get(label)?.add(event.visitor_id || event.fingerprint_key);

    if (!sessionsByBucket.has(label)) sessionsByBucket.set(label, new Set());
    sessionsByBucket.get(label)?.add(event.session_id || event.fingerprint_key);
  }

  const buckets = top(byDimension, 30).map((bucket) => ({
    ...bucket,
    percent: pageViews.length ? Math.round((bucket.value / pageViews.length) * 100) : 0,
    visitors: visitorsByBucket.get(bucket.label)?.size || 0,
    sessions: sessionsByBucket.get(bucket.label)?.size || 0
  }));

  const recent = pageViews.slice(0, 80).map((event) => ({
    id: event.id,
    date: localDateKey(event.created_at),
    created_at: event.created_at,
    bucket_label: bucketLabel(event, dimension),
    path: event.path,
    title: event.title,
    country: event.country_name || "Desconocido",
    region: event.region_name || "Desconocido",
    city: event.city || "Desconocido",
    source: bucketLabel(event, "source"),
    device: event.device_type || "Desconocido",
    browser: event.browser || "Otro",
    os: event.os || "Otro",
    consent: event.consent_status
  }));

  return NextResponse.json({
    ok: true,
    configured: true,
    title: titles[dimension],
    dimension,
    days,
    total: pageViews.length,
    buckets,
    recent
  });
}
