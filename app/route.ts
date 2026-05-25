import { readFile } from "fs/promises";
import { join } from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const legacyHomePath = join(process.cwd(), "public", "legacy", "index.html");

const analyticsScript = String.raw`
<script>
(function () {
  var consentKey = "ffs_cookie_consent";
  var visitorCookie = "ffs_visitor_id";
  var sessionKey = "ffs_session_id";

  function createId(prefix) {
    var random = window.crypto && crypto.randomUUID
      ? crypto.randomUUID()
      : Date.now() + "-" + Math.random().toString(16).slice(2);
    return prefix + "_" + random;
  }

  function readCookie(name) {
    var match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
    return match ? decodeURIComponent(match[1]) : null;
  }

  function writeCookie(name, value, maxAgeDays) {
    var maxAge = (maxAgeDays || 365) * 24 * 60 * 60;
    document.cookie = name + "=" + encodeURIComponent(value) + "; path=/; max-age=" + maxAge + "; samesite=lax";
  }

  function removeCookie(name) {
    document.cookie = name + "=; path=/; max-age=0; samesite=lax";
  }

  function getConsent() {
    var stored = localStorage.getItem(consentKey);
    return stored === "accepted" || stored === "rejected" ? stored : "unset";
  }

  function getSessionId() {
    var existing = sessionStorage.getItem(sessionKey);
    if (existing) return existing;
    var fresh = createId("ses");
    sessionStorage.setItem(sessionKey, fresh);
    return fresh;
  }

  function getVisitorId(consent) {
    if (consent !== "accepted") return null;
    var existing = readCookie(visitorCookie);
    if (existing) return existing;
    var fresh = createId("vis");
    writeCookie(visitorCookie, fresh);
    return fresh;
  }

  function sendEvent(eventType, metadata, consentOverride) {
    var consent = consentOverride || getConsent();
    var body = {
      eventType: eventType,
      path: window.location.pathname + window.location.search,
      title: document.title,
      referrer: document.referrer || null,
      visitorId: getVisitorId(consent),
      sessionId: getSessionId(),
      consent: consent,
      metadata: metadata || {}
    };
    var payload = JSON.stringify(body);

    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", new Blob([payload], { type: "application/json" }));
      return;
    }

    fetch("/api/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: payload,
      keepalive: true
    }).catch(function () {});
  }

  function updateConsent(nextConsent) {
    localStorage.setItem(consentKey, nextConsent);
    if (nextConsent === "accepted") {
      getVisitorId("accepted");
    } else {
      removeCookie(visitorCookie);
    }
    sendEvent("consent_update", { status: nextConsent }, nextConsent);
    var banner = document.getElementById("fenix-cookie-banner");
    if (banner) banner.remove();
  }

  function createCookieBanner() {
    if (getConsent() !== "unset" || document.getElementById("fenix-cookie-banner")) return;
    var banner = document.createElement("div");
    banner.id = "fenix-cookie-banner";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-label", "Aviso de cookies");
    banner.className = "fixed left-1/2 bottom-4 z-[9999] w-[calc(100%-28px)] max-w-4xl -translate-x-1/2 rounded-2xl border border-white/15 bg-zinc-950/95 p-4 shadow-2xl backdrop-blur-md md:flex md:items-center md:gap-4";
    banner.innerHTML =
      '<div class="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-500/10 text-yellow-400 md:mb-0">✓</div>' +
      '<div class="min-w-0 flex-1">' +
      '<strong class="block text-sm uppercase tracking-widest text-white">Analítica responsable</strong>' +
      '<p class="mt-1 text-sm leading-relaxed text-gray-300">Al aceptar, nos ayudas a medir visitas reales, páginas consultadas, origen aproximado por IP y efectividad de campañas. No guardamos tu IP cruda ni vendemos tus datos.</p>' +
      '</div>' +
      '<div class="mt-4 grid gap-2 sm:grid-cols-2 md:mt-0 md:flex">' +
      '<button type="button" data-cookie-reject class="rounded-lg border border-white/15 px-4 py-2 text-sm font-bold uppercase text-white">Rechazar</button>' +
      '<button type="button" data-cookie-accept class="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold uppercase text-white">Aceptar cookies</button>' +
      '</div>';
    document.body.appendChild(banner);
    banner.querySelector("[data-cookie-reject]").addEventListener("click", function () {
      updateConsent("rejected");
    });
    banner.querySelector("[data-cookie-accept]").addEventListener("click", function () {
      updateConsent("accepted");
    });
  }

  document.addEventListener("click", function (event) {
    var link = event.target && event.target.closest ? event.target.closest("a") : null;
    var href = link ? link.getAttribute("href") || "" : "";
    var channel = href.indexOf("wa.me") >= 0
      ? "whatsapp"
      : href.indexOf("facebook") >= 0
        ? "facebook"
        : href.indexOf("instagram") >= 0
          ? "instagram"
          : href.indexOf("tiktok") >= 0
            ? "tiktok"
            : null;

    if (channel) sendEvent("contact_click", { channel: channel, href: href });
  });

  window.addEventListener("load", function () {
    sendEvent("page_view");
    createCookieBanner();
  });
})();
</script>
`;

function prepareHome(html: string) {
  return html
    .replaceAll('href="galeria.html"', 'href="/galeria"')
    .replaceAll('href="videos.html"', 'href="/videos"')
    .replace("</body>", `${analyticsScript}\n</body>`);
}

export async function GET() {
  const html = await readFile(legacyHomePath, "utf8");

  return new NextResponse(prepareHome(html), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=0, must-revalidate"
    }
  });
}
