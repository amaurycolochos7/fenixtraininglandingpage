import { NextResponse, type NextRequest } from "next/server";
import {
  dateDaysAgo,
  emptySeries,
  localDateKey,
  type AnalyticsEventRow
} from "@/lib/analytics";
import { isAdminRequest } from "@/lib/admin-auth";
import { increment, refSource, top } from "@/lib/admin-metrics";
import { getSupabaseAdmin, hasSupabaseConfig } from "@/lib/supabase";

export const runtime = "nodejs";

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
      .order("created_at", { ascending: true })
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

  if (!hasSupabaseConfig()) {
    return NextResponse.json({
      ok: true,
      configured: false,
      message: "Supabase todavía no está configurado en .env.local.",
      totals: {
        pageviews: 0,
        visitors: 0,
        sessions: 0,
        contacts: 0,
        consentRate: 0
      },
      series: emptySeries(30),
      countries: [],
      regions: [],
      pages: [],
      sources: [],
      devices: []
    });
  }

  const url = new URL(request.url);
  const days = Math.min(Math.max(Number(url.searchParams.get("days") || 30), 7), 90);
  const events = await fetchEvents(days);
  const pageViews = events.filter((event) => event.event_type === "page_view");
  const contacts = events.filter((event) => event.event_type === "contact_click");
  const visitors = new Set(pageViews.map((event) => event.visitor_id || event.fingerprint_key));
  const sessions = new Set(pageViews.map((event) => event.session_id || event.fingerprint_key));
  const accepted = pageViews.filter((event) => event.consent_status === "accepted").length;

  const byCountry = new Map<string, number>();
  const byRegion = new Map<string, number>();
  const byPage = new Map<string, number>();
  const bySource = new Map<string, number>();
  const byDevice = new Map<string, number>();
  const series = emptySeries(days);
  const seriesIndex = new Map(series.map((item) => [item.date, item]));
  const visitorsByDay = new Map<string, Set<string>>();
  const recent = [...pageViews]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 30)
    .map((event) => ({
      id: event.id,
      date: localDateKey(event.created_at),
      created_at: event.created_at,
      path: event.path,
      title: event.title,
      country: event.country_name || "Desconocido",
      region: event.region_name || "Desconocido",
      city: event.city || "Desconocido",
      source: refSource(event.referrer),
      device: event.device_type || "Desconocido",
      browser: event.browser || "Otro",
      os: event.os || "Otro",
      consent: event.consent_status
    }));

  for (const event of pageViews) {
    increment(byCountry, event.country_name);
    increment(byRegion, event.region_name);
    increment(byPage, event.path);
    increment(bySource, refSource(event.referrer));
    increment(byDevice, event.device_type);

    const date = localDateKey(event.created_at);
    const item = seriesIndex.get(date);
    if (item) {
      item.views += 1;
      if (!visitorsByDay.has(date)) visitorsByDay.set(date, new Set());
      visitorsByDay.get(date)?.add(event.visitor_id || event.fingerprint_key);
    }
  }

  for (const event of contacts) {
    const date = localDateKey(event.created_at);
    const item = seriesIndex.get(date);
    if (item) item.contacts += 1;
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
      contacts: contacts.length,
      consentRate: pageViews.length ? Math.round((accepted / pageViews.length) * 100) : 0
    },
    series,
    countries: top(byCountry),
    regions: top(byRegion),
    pages: top(byPage),
    sources: top(bySource),
    devices: top(byDevice),
    recent
  });
}
