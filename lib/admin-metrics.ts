import { type AnalyticsEventRow } from "@/lib/analytics";

export type Bucket = { label: string; value: number };

export function increment(map: Map<string, number>, key?: string | null) {
  const cleanKey = key || "Desconocido";
  map.set(cleanKey, (map.get(cleanKey) || 0) + 1);
}

export function top(map: Map<string, number>, limit = 8): Bucket[] {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, value]) => ({ label, value }));
}

export function refSource(referrer?: string | null) {
  if (!referrer) return "Directo";

  try {
    const host = new URL(referrer).hostname.replace("www.", "");
    const isFenixDomain =
      host === "fenixfightsystem.com" ||
      host === "motopartes1.vercel.app" ||
      (host.endsWith(".vercel.app") && host.includes("motopartes1"));

    if (isFenixDomain) return "Fenix Fight System";
    if (host.includes("facebook")) return "Facebook";
    if (host.includes("instagram")) return "Instagram";
    if (host.includes("tiktok")) return "TikTok";
    if (host.includes("google")) return "Google";
    if (host.includes("wa.me") || host.includes("whatsapp")) return "WhatsApp";
    return host;
  } catch {
    return "Directo";
  }
}

export function bucketLabel(event: AnalyticsEventRow, dimension: string) {
  if (dimension === "country") return event.country_name || "Desconocido";
  if (dimension === "region") return event.region_name || "Desconocido";
  if (dimension === "page") return event.path || "Desconocido";
  if (dimension === "source") return refSource(event.referrer);
  if (dimension === "device") return event.device_type || "Desconocido";
  return "Desconocido";
}
