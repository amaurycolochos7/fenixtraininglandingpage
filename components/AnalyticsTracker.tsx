"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { ShieldCheck, X } from "lucide-react";

type ConsentStatus = "accepted" | "rejected" | "unset";

const consentKey = "ffs_cookie_consent";
const visitorCookie = "ffs_visitor_id";
const sessionKey = "ffs_session_id";
const browserGeoKey = "ffs_browser_geo_sent";

function createId(prefix: string) {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${random}`;
}

function readCookie(name: string) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string, maxAgeDays = 365) {
  const maxAge = maxAgeDays * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; samesite=lax`;
}

function removeCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
}

function getSessionId() {
  const existing = sessionStorage.getItem(sessionKey);
  if (existing) return existing;
  const fresh = createId("ses");
  sessionStorage.setItem(sessionKey, fresh);
  return fresh;
}

function getVisitorId(consent: ConsentStatus) {
  if (consent !== "accepted") return null;
  const existing = readCookie(visitorCookie);
  if (existing) return existing;
  const fresh = createId("vis");
  writeCookie(visitorCookie, fresh);
  return fresh;
}

export function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const isAdminRoute = pathname.startsWith("/admin");
  const [consent, setConsent] = useState<ConsentStatus>("unset");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(consentKey) as ConsentStatus | null;
    setConsent(stored === "accepted" || stored === "rejected" ? stored : "unset");
    setIsReady(true);
  }, []);

  const path = useMemo(() => {
    const query = search ? `?${search}` : "";
    return `${pathname}${query}`;
  }, [pathname, search]);

  const sendEvent = useCallback(
    (eventType: string, metadata?: Record<string, unknown>, consentOverride?: ConsentStatus) => {
      if (!isReady || isAdminRoute) return;
      const eventConsent = consentOverride || consent;

      const body = {
        eventType,
        path,
        title: document.title,
        referrer: document.referrer || null,
        visitorId: getVisitorId(eventConsent),
        sessionId: getSessionId(),
        consent: eventConsent,
        metadata
      };
      const payload = JSON.stringify(body);

      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/track", new Blob([payload], { type: "application/json" }));
        return;
      }

      fetch("/api/track", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: payload,
        keepalive: true
      }).catch(() => undefined);
    },
    [consent, isAdminRoute, isReady, path]
  );

  const sendBrowserIpGeo = useCallback(
    async (consentOverride?: ConsentStatus, force = false) => {
      if (!isReady || isAdminRoute) return;
      if (!force && sessionStorage.getItem(browserGeoKey) === "true") return;

      try {
        const response = await fetch("https://ipapi.co/json/", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();

        if (!data || data.error) return;

        sessionStorage.setItem(browserGeoKey, "true");
        sendEvent(
          "consent_update",
          {
            status: consentOverride || consent,
            browser_geo: {
              country_code: data.country_code,
              country_name: data.country_name,
              region_code: data.region_code,
              region: data.region,
              city: data.city,
              timezone: data.timezone
            }
          },
          consentOverride
        );
      } catch {
        // Silent fallback: the server still resolves location by request IP.
      }
    },
    [consent, isAdminRoute, isReady, sendEvent]
  );

  useEffect(() => {
    sendEvent("page_view");
  }, [sendEvent]);

  useEffect(() => {
    if (consent === "accepted") {
      sendBrowserIpGeo("accepted");
    }
  }, [consent, sendBrowserIpGeo]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const link = target?.closest("a");
      const href = link?.getAttribute("href") || "";
      const channel = href.includes("wa.me")
        ? "whatsapp"
        : href.includes("facebook")
          ? "facebook"
          : href.includes("instagram")
            ? "instagram"
            : href.includes("tiktok")
              ? "tiktok"
              : null;

      if (channel) {
        sendEvent("contact_click", { channel, href });
      }
    };

    const customTrack = (event: Event) => {
      const detail = (event as CustomEvent).detail || {};
      if (detail.eventType) sendEvent(detail.eventType, detail.metadata || {}, detail.consent);
    };

    document.addEventListener("click", handleClick);
    window.addEventListener("fenix:track", customTrack);

    return () => {
      document.removeEventListener("click", handleClick);
      window.removeEventListener("fenix:track", customTrack);
    };
  }, [sendEvent]);

  function updateConsent(nextConsent: ConsentStatus) {
    localStorage.setItem(consentKey, nextConsent);
    setConsent(nextConsent);

    if (nextConsent === "accepted") {
      getVisitorId("accepted");
      sendBrowserIpGeo("accepted", true);
    } else {
      removeCookie(visitorCookie);
    }

    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("fenix:track", {
          detail: {
            eventType: "consent_update",
            metadata: { status: nextConsent },
            consent: nextConsent
          }
        })
      );
    }, 0);
  }

  if (!isReady || consent !== "unset" || isAdminRoute) return null;

  return (
    <div className="cookie-banner" role="dialog" aria-label="Aviso de cookies">
      <div className="cookie-icon">
        <ShieldCheck size={22} />
      </div>
      <div>
        <strong>Analítica responsable</strong>
        <p>
          Al aceptar, nos ayudas a medir vistas reales, conocer qué páginas generan más interés y
          mejorar nuestras campañas de marketing.
        </p>
      </div>
      <div className="cookie-actions">
        <button className="ghost-button" onClick={() => updateConsent("rejected")}>
          Rechazar
        </button>
        <button className="primary-button" onClick={() => updateConsent("accepted")}>
          Aceptar cookies
        </button>
      </div>
      <button className="icon-button cookie-close" onClick={() => updateConsent("rejected")}>
        <X size={18} />
      </button>
    </div>
  );
}
