import { createHash } from "crypto";
import type { NextRequest } from "next/server";
import { countryName, regionName } from "@/lib/geo";

export type TrackPayload = {
  eventType?: string;
  path?: string;
  title?: string;
  referrer?: string;
  visitorId?: string | null;
  sessionId?: string | null;
  consent?: "accepted" | "rejected" | "unset";
  metadata?: Record<string, unknown>;
};

export type AnalyticsEventRow = {
  id: string;
  created_at: string;
  event_type: string;
  path: string;
  title: string | null;
  referrer: string | null;
  visitor_id: string | null;
  session_id: string | null;
  fingerprint_key: string;
  consent_status: string;
  country_code: string | null;
  country_name: string | null;
  region_code: string | null;
  region_name: string | null;
  city: string | null;
  timezone: string | null;
  device_type: string;
  browser: string;
  os: string;
  is_bot: boolean;
  metadata: Record<string, unknown> | null;
};

type GeoFields = {
  country_code: string | null;
  country_name: string | null;
  region_code: string | null;
  region_name: string | null;
  city: string | null;
  timezone: string | null;
};

type ResolvedGeo = GeoFields & {
  source: "vercel" | "ipapi" | "ipwhois";
};

type IpApiResponse = {
  ip?: string;
  country_code?: string;
  country_name?: string;
  region_code?: string;
  region?: string;
  city?: string;
  timezone?: string;
  error?: boolean;
  reason?: string;
};

type IpWhoIsResponse = {
  success?: boolean;
  country?: string;
  country_code?: string;
  region?: string;
  region_code?: string;
  city?: string;
  timezone?: {
    id?: string;
  };
};

const allowedEvents = new Set([
  "page_view",
  "consent_update",
  "contact_click",
  "video_play",
  "gallery_open"
]);

const botPattern =
  /bot|crawler|spider|crawling|preview|facebookexternalhit|whatsapp|telegrambot|slackbot|discordbot|twitterbot|linkedinbot|embedly|quora link preview|pinterest|semrush|ahrefs|pingdom|uptime/i;

export function isAllowedEvent(eventType?: string) {
  return Boolean(eventType && allowedEvents.has(eventType));
}

export function detectBot(userAgent: string) {
  return botPattern.test(userAgent);
}

export function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  const vercelForwarded = request.headers.get("x-vercel-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  return (vercelForwarded || forwarded || realIp || "0.0.0.0").split(",")[0].trim();
}

export function hashIp(ip: string) {
  const salt = process.env.ANALYTICS_SALT || "local-analytics-salt-change-before-production";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

function decodeHeader(value: string | null) {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function isLikelyPublicIp(ip: string) {
  if (!ip || ip === "0.0.0.0" || ip === "::1") return false;
  if (ip.startsWith("127.") || ip.startsWith("10.") || ip.startsWith("192.168.")) return false;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return false;
  if (/^(fc|fd|fe80):/i.test(ip)) return false;
  return true;
}

export function readGeo(request: NextRequest): GeoFields {
  const countryCode = request.headers.get("x-vercel-ip-country");
  const regionCode = request.headers.get("x-vercel-ip-country-region");
  const cityHeader = request.headers.get("x-vercel-ip-city");
  const timezone = request.headers.get("x-vercel-ip-timezone");

  return {
    country_code: countryCode,
    country_name: countryName(countryCode),
    region_code: regionCode,
    region_name: regionName(countryCode, regionCode),
    city: decodeHeader(cityHeader),
    timezone
  };
}

async function lookupGeoFromIp(ip: string): Promise<GeoFields | null> {
  if (!isLikelyPublicIp(ip)) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1800);

  try {
    const response = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
      cache: "no-store",
      headers: {
        "user-agent": "FenixFightSystemAnalytics/1.0"
      },
      signal: controller.signal
    });

    if (!response.ok) return null;

    const data = (await response.json()) as IpApiResponse;
    if (data.error || !data.country_code) return null;

    const countryCode = data.country_code.toUpperCase();
    const regionCode = data.region_code || null;
    const region = data.region || null;

    return {
      country_code: countryCode,
      country_name: data.country_name || countryName(countryCode),
      region_code: regionCode,
      region_name: region || regionName(countryCode, regionCode),
      city: data.city || null,
      timezone: data.timezone || null
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export function sanitizeMetadata(metadata?: Record<string, unknown>) {
  const { precise_location: _preciseLocation, ...safeMetadata } = metadata || {};
  return safeMetadata;
}

async function lookupGeoFromIpWhoIs(ip: string): Promise<GeoFields | null> {
  if (!isLikelyPublicIp(ip)) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1400);

  try {
    const response = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      cache: "no-store",
      signal: controller.signal
    });

    if (!response.ok) return null;

    const data = (await response.json()) as IpWhoIsResponse;
    if (data.success === false || !data.country_code) return null;

    const countryCode = data.country_code.toUpperCase();
    const regionCode = data.region_code || null;
    const region = data.region || null;

    return {
      country_code: countryCode,
      country_name: data.country || countryName(countryCode),
      region_code: regionCode,
      region_name: region || regionName(countryCode, regionCode),
      city: data.city || null,
      timezone: data.timezone?.id || null
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function resolveGeo(request: NextRequest, ip: string): Promise<ResolvedGeo> {
  const vercelGeo = readGeo(request);
  const ipapiGeo = await lookupGeoFromIp(ip);

  if (ipapiGeo) {
    return {
      country_code: ipapiGeo.country_code || vercelGeo.country_code,
      country_name: ipapiGeo.country_name || vercelGeo.country_name,
      region_code: ipapiGeo.region_code || vercelGeo.region_code,
      region_name: ipapiGeo.region_name || vercelGeo.region_name,
      city: ipapiGeo.city || vercelGeo.city,
      timezone: ipapiGeo.timezone || vercelGeo.timezone,
      source: "ipapi"
    };
  }

  const externalGeo = await lookupGeoFromIpWhoIs(ip);

  if (!externalGeo) {
    return { ...vercelGeo, source: "vercel" };
  }

  return {
    country_code: externalGeo.country_code || vercelGeo.country_code,
    country_name: externalGeo.country_name || vercelGeo.country_name,
    region_code: externalGeo.region_code || vercelGeo.region_code,
    region_name: externalGeo.region_name || vercelGeo.region_name,
    city: externalGeo.city || vercelGeo.city,
    timezone: externalGeo.timezone || vercelGeo.timezone,
    source: "ipwhois"
  };
}

export function parseDevice(userAgent: string) {
  const ua = userAgent.toLowerCase();
  const device_type = /ipad|tablet/.test(ua)
    ? "tablet"
    : /mobi|android|iphone/.test(ua)
      ? "mobile"
      : "desktop";

  const browser = ua.includes("edg/")
    ? "Edge"
    : ua.includes("chrome")
      ? "Chrome"
      : ua.includes("safari")
        ? "Safari"
        : ua.includes("firefox")
          ? "Firefox"
          : "Otro";

  const os = ua.includes("windows")
    ? "Windows"
    : ua.includes("iphone") || ua.includes("ipad")
      ? "iOS"
      : ua.includes("android")
        ? "Android"
        : ua.includes("mac os")
          ? "macOS"
          : ua.includes("linux")
            ? "Linux"
            : "Otro";

  return { device_type, browser, os };
}

export function normalizePath(path?: string) {
  if (!path) return "/";
  try {
    const url = new URL(path, "https://fenix.local");
    return url.pathname || "/";
  } catch {
    return path.startsWith("/") ? path.split("?")[0] : `/${path.split("?")[0]}`;
  }
}

export function makeFingerprintKey(payload: TrackPayload, ipHash: string) {
  return payload.visitorId || payload.sessionId || ipHash;
}

export function localDateKey(date: string | Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(date));
}

export function dateDaysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function emptySeries(days: number) {
  const items: Array<{ date: string; views: number; visitors: number; contacts: number }> = [];
  const today = new Date();

  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - index);
    items.push({ date: localDateKey(date), views: 0, visitors: 0, contacts: 0 });
  }

  return items;
}
