import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  detectBot,
  getClientIp,
  hashIp,
  isAllowedEvent,
  makeFingerprintKey,
  normalizePath,
  parseDevice,
  resolveBrowserGeo,
  resolveGeo,
  sanitizeMetadata,
  type ResolvedGeo,
  type TrackPayload
} from "@/lib/analytics";
import { getSupabaseAdmin, hasSupabaseConfig } from "@/lib/supabase";

export const runtime = "nodejs";

type BrowserGeoRow = {
  country_code: string | null;
  country_name: string | null;
  region_code: string | null;
  region_name: string | null;
  city: string | null;
  timezone: string | null;
  metadata: Record<string, unknown> | null;
};

function rowToBrowserGeo(row: BrowserGeoRow): ResolvedGeo | null {
  const source = row.metadata?.geo_source;

  if (source !== "browser_ipapi") return null;
  if (!row.country_code && !row.country_name && !row.region_name && !row.city) return null;

  return {
    country_code: row.country_code,
    country_name: row.country_name,
    region_code: row.region_code,
    region_name: row.region_name,
    city: row.city,
    timezone: row.timezone,
    source: "browser_ipapi"
  };
}

async function findBrowserGeoByColumn(
  supabase: SupabaseClient,
  column: "session_id" | "visitor_id",
  value?: string | null
): Promise<ResolvedGeo | null> {
  if (!value) return null;

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("analytics_events")
    .select("country_code, country_name, region_code, region_name, city, timezone, metadata")
    .eq("event_type", "consent_update")
    .eq(column, value)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(10);

  const rows = (data || []) as BrowserGeoRow[];
  for (const row of rows) {
    const geo = rowToBrowserGeo(row);
    if (geo) return geo;
  }

  return null;
}

async function findReusableBrowserGeo(
  supabase: SupabaseClient,
  payload: TrackPayload
): Promise<ResolvedGeo | null> {
  return (
    (await findBrowserGeoByColumn(supabase, "session_id", payload.sessionId)) ||
    (await findBrowserGeoByColumn(supabase, "visitor_id", payload.visitorId))
  );
}

export async function POST(request: NextRequest) {
  let payload: TrackPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!isAllowedEvent(payload.eventType)) {
    return NextResponse.json({ ok: false, error: "Unsupported event" }, { status: 400 });
  }

  const userAgent = request.headers.get("user-agent") || "";

  if (detectBot(userAgent)) {
    return NextResponse.json({ ok: true, ignored: true, reason: "bot" });
  }

  if (!hasSupabaseConfig()) {
    return NextResponse.json({ ok: true, tracked: false, reason: "supabase_not_configured" });
  }

  const supabase = getSupabaseAdmin();
  const clientIp = getClientIp(request);
  const ipHash = hashIp(clientIp);
  const fingerprintKey = makeFingerprintKey(payload, ipHash);
  const path = normalizePath(payload.path);
  const eventType = payload.eventType as string;
  const dedupeSince = new Date(Date.now() - 15000).toISOString();
  const hasBrowserGeo = Boolean(
    payload.metadata &&
      typeof payload.metadata === "object" &&
      "browser_geo" in payload.metadata
  );

  const { data: duplicate } = await supabase
    .from("analytics_events")
    .select("id")
    .eq("event_type", eventType)
    .eq("path", path)
    .eq("fingerprint_key", fingerprintKey)
    .gte("created_at", dedupeSince)
    .limit(1)
    .maybeSingle();

  if (duplicate && !hasBrowserGeo) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const browserGeo = resolveBrowserGeo(payload.metadata);
  const reusableGeo =
    !browserGeo && eventType === "page_view"
      ? await findReusableBrowserGeo(supabase, payload)
      : null;
  const resolvedGeo = browserGeo || reusableGeo || (await resolveGeo(request, clientIp));
  const { source: geoSource, ...geo } = resolvedGeo;
  const metadata = {
    ...sanitizeMetadata(payload.metadata),
    geo_source: geoSource
  };

  const { error } = await supabase.from("analytics_events").insert({
    event_type: eventType,
    path,
    title: payload.title || null,
    referrer: payload.referrer || request.headers.get("referer"),
    visitor_id: payload.visitorId || null,
    session_id: payload.sessionId || null,
    fingerprint_key: fingerprintKey,
    consent_status: payload.consent || "unset",
    ip_hash: ipHash,
    user_agent: userAgent.slice(0, 500),
    is_bot: false,
    metadata,
    ...parseDevice(userAgent),
    ...geo
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  if (geoSource === "browser_ipapi" && eventType === "consent_update" && payload.sessionId) {
    const updateSince = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    await supabase
      .from("analytics_events")
      .update({
        consent_status: payload.consent || "accepted",
        ...geo
      })
      .eq("event_type", "page_view")
      .eq("session_id", payload.sessionId)
      .gte("created_at", updateSince);
  }

  return NextResponse.json({ ok: true });
}
