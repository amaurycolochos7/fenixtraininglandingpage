import { NextResponse, type NextRequest } from "next/server";
import { emptySeries, localDateKey, type AnalyticsEventRow } from "@/lib/analytics";
import { isAdminRequest } from "@/lib/admin-auth";
import { getSupabaseAdmin, hasSupabaseConfig } from "@/lib/supabase";

export const runtime = "nodejs";

function startOfTodayMexico(): string {
  const mexicoDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
  return new Date(`${mexicoDate}T00:00:00-06:00`).toISOString();
}

function sinceForDays(days: number): string {
  if (days === 1) return startOfTodayMexico();
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

async function fetchPageViews(days: number) {
  const supabase = getSupabaseAdmin();
  const since = sinceForDays(days);
  const rows: Pick<AnalyticsEventRow, "id" | "created_at" | "visitor_id" | "session_id" | "fingerprint_key">[] = [];
  const pageSize = 1000;

  for (let from = 0; from < 10000; from += pageSize) {
    const { data, error } = await supabase
      .from("analytics_events")
      .select("id, created_at, visitor_id, session_id, fingerprint_key")
      .eq("event_type", "page_view")
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }

  return rows;
}

const emptyResponse = {
  ok: true,
  configured: false,
  message: "Supabase todavía no está configurado en .env.local.",
  totals: { pageviews: 0, visitors: 0, sessions: 0, contacts: 0, consentRate: 0 },
  series: emptySeries(30),
  countries: [],
  regions: [],
  pages: [],
  sources: [],
  devices: [],
  recent: []
};

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  if (!hasSupabaseConfig()) {
    return NextResponse.json(emptyResponse);
  }

  const url = new URL(request.url);
  const days = Math.min(Math.max(Number(url.searchParams.get("days") || 30), 1), 90);

  const pageViews = await fetchPageViews(days);
  const visitors = new Set(pageViews.map(e => e.visitor_id || e.fingerprint_key));
  const sessions = new Set(pageViews.map(e => e.session_id || e.fingerprint_key));

  const series = emptySeries(days);
  const seriesIndex = new Map(series.map(item => [item.date, item]));
  const visitorsByDay = new Map<string, Set<string>>();

  for (const event of pageViews) {
    const date = localDateKey(event.created_at);
    const item = seriesIndex.get(date);
    if (item) {
      item.views += 1;
      if (!visitorsByDay.has(date)) visitorsByDay.set(date, new Set());
      visitorsByDay.get(date)?.add(event.visitor_id || event.fingerprint_key);
    }
  }

  for (const item of series) {
    item.visitors = visitorsByDay.get(item.date)?.size || 0;
  }

  return NextResponse.json({
    ok: true,
    configured: true,
    days,
    totals: {
      pageviews: pageViews.length,
      visitors: visitors.size,
      sessions: sessions.size,
      contacts: 0,
      consentRate: 0
    },
    series,
    countries: [],
    regions: [],
    pages: [],
    sources: [],
    devices: [],
    recent: []
  });
}
