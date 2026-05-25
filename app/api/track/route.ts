import { NextResponse, type NextRequest } from "next/server";
import {
  detectBot,
  getClientIp,
  hashIp,
  isAllowedEvent,
  makeFingerprintKey,
  normalizePath,
  parseDevice,
  resolveGeo,
  sanitizeMetadata,
  type TrackPayload
} from "@/lib/analytics";
import { getSupabaseAdmin, hasSupabaseConfig } from "@/lib/supabase";

export const runtime = "nodejs";

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

  const { data: duplicate } = await supabase
    .from("analytics_events")
    .select("id")
    .eq("event_type", eventType)
    .eq("path", path)
    .eq("fingerprint_key", fingerprintKey)
    .gte("created_at", dedupeSince)
    .limit(1)
    .maybeSingle();

  if (duplicate) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const resolvedGeo = await resolveGeo(request, clientIp);
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

  return NextResponse.json({ ok: true });
}
