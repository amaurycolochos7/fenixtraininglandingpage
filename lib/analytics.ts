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

export function readGeo(request: NextRequest) {
  const countryCode = request.headers.get("x-vercel-ip-country");
  const regionCode = request.headers.get("x-vercel-ip-country-region");
  const cityHeader = request.headers.get("x-vercel-ip-city");
  const timezone = request.headers.get("x-vercel-ip-timezone");

  return {
    country_code: countryCode,
    country_name: countryName(countryCode),
    region_code: regionCode,
    region_name: regionName(countryCode, regionCode),
    city: cityHeader ? decodeURIComponent(cityHeader) : null,
    timezone
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
