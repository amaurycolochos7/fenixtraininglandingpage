"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, RefreshCw, Users } from "lucide-react";

type SeriesItem = { date: string; views: number; visitors: number; contacts: number };
type Metrics = {
  configured: boolean;
  message?: string;
  days?: number;
  totals: {
    pageviews: number;
    visitors: number;
    sessions: number;
    contacts: number;
    consentRate: number;
  };
  series: SeriesItem[];
  countries: never[];
  regions: never[];
  pages: never[];
  sources: never[];
  devices: never[];
  recent: never[];
};

const ranges = [
  { label: "Hoy", days: 1 },
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 }
];

function numberFormat(n: number) {
  return new Intl.NumberFormat("es-MX").format(n);
}

function shortDate(dateStr: string, days: number) {
  const d = new Date(dateStr + "T12:00:00");
  if (days <= 7) {
    return new Intl.DateTimeFormat("es-MX", { weekday: "short" }).format(d);
  }
  return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" }).format(d);
}

function BarChart({ series, days }: { series: SeriesItem[]; days: number }) {
  const max = Math.max(...series.map(s => s.views), 1);
  const show = days === 1 ? series : days <= 7 ? series : series.slice(-Math.min(series.length, 30));

  return (
    <div className="fx-chart">
      <div className="fx-bars">
        {show.map(item => (
          <div key={item.date} className="fx-bar-col" title={`${item.date}: ${item.views} vistas`}>
            <div
              className="fx-bar-fill"
              style={{ height: `${Math.max((item.views / max) * 100, item.views > 0 ? 4 : 0)}%` }}
            />
            {show.length <= 14 && (
              <span className="fx-bar-label">{shortDate(item.date, days)}</span>
            )}
          </div>
        ))}
      </div>
      {show.length > 14 && (
        <div className="fx-chart-ends">
          <span>{shortDate(show[0].date, days)}</span>
          <span>{shortDate(show[show.length - 1].date, days)}</span>
        </div>
      )}
    </div>
  );
}

export function AdminDashboard() {
  const [days, setDays] = useState(30);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  async function loadMetrics(nextDays = days) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/metrics?days=${nextDays}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudieron cargar métricas.");
      setMetrics(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMetrics(days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const series = useMemo(() => metrics?.series || [], [metrics]);
  const views = metrics?.totals.pageviews ?? 0;
  const visitors = metrics?.totals.visitors ?? 0;
  const periodLabel = days === 1 ? "hoy" : `últimos ${days} días`;

  return (
    <>
      <style>{`
        :root {
          --fx-bg: #070707;
          --fx-card: rgba(255,255,255,0.035);
          --fx-border: rgba(255,255,255,0.08);
          --fx-red: #d71920;
          --fx-red2: #f04438;
          --fx-brass: #f4b85b;
          --fx-text: #e8e8e8;
          --fx-muted: #555;
          --fx-muted2: #888;
          --fx-radius: 10px;
        }

        .fx-shell {
          min-height: 100vh;
          background: var(--fx-bg);
          color: var(--fx-text);
        }

        /* ── TOPBAR ── */
        .fx-topbar {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 24px;
          height: 54px;
          border-bottom: 1px solid var(--fx-border);
          background: rgba(7,7,7,0.95);
          backdrop-filter: blur(12px);
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .fx-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-right: auto;
        }

        .fx-brand img { width: 28px; height: 28px; object-fit: contain; }

        .fx-brand-name {
          font-family: "Oswald", sans-serif;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .fx-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--fx-red);
        }

        .fx-ranges {
          display: flex;
          gap: 2px;
          padding: 3px;
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--fx-border);
          border-radius: 8px;
        }

        .fx-range-btn {
          border: 0;
          background: transparent;
          color: var(--fx-muted2);
          font-size: 12px;
          font-weight: 700;
          padding: 4px 11px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 130ms ease;
          letter-spacing: 0.04em;
        }

        .fx-range-btn.active { background: var(--fx-red); color: #fff; }
        .fx-range-btn:not(.active):hover { color: var(--fx-text); background: rgba(255,255,255,0.06); }

        .fx-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 1px solid var(--fx-border);
          background: var(--fx-card);
          color: var(--fx-muted2);
          font-size: 12px;
          font-weight: 700;
          padding: 6px 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 130ms ease;
          text-decoration: none;
          letter-spacing: 0.03em;
        }

        .fx-btn:hover { border-color: rgba(255,255,255,0.16); color: var(--fx-text); }
        .fx-btn.danger:hover { border-color: rgba(215,25,32,0.4); color: var(--fx-red2); }

        /* ── CONTENT ── */
        .fx-content {
          max-width: 860px;
          margin: 0 auto;
          padding: 36px 24px 60px;
        }

        /* ── ERROR ── */
        .fx-error {
          margin-bottom: 20px;
          padding: 12px 16px;
          border-radius: var(--fx-radius);
          border: 1px solid rgba(240,68,56,0.3);
          background: rgba(240,68,56,0.08);
          color: #ffb8b2;
          font-size: 13px;
          font-weight: 600;
        }

        /* ── HERO ── */
        .fx-hero {
          margin-bottom: 28px;
        }

        .fx-hero-period {
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: var(--fx-muted2);
          margin-bottom: 10px;
        }

        .fx-hero-number {
          font-family: "Oswald", sans-serif;
          font-size: clamp(72px, 14vw, 120px);
          line-height: 1;
          color: #fff;
          letter-spacing: -0.02em;
          transition: opacity 200ms ease;
        }

        .fx-hero-number.loading { opacity: 0.25; }

        .fx-hero-label {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
          color: var(--fx-muted2);
          font-size: 13px;
          font-weight: 600;
        }

        .fx-hero-label svg { color: var(--fx-red2); }

        /* ── SECONDARY STATS ── */
        .fx-secondary {
          display: flex;
          gap: 24px;
          padding: 18px 0;
          border-top: 1px solid var(--fx-border);
          border-bottom: 1px solid var(--fx-border);
          margin-bottom: 28px;
        }

        .fx-sec-stat {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .fx-sec-value {
          font-family: "Oswald", sans-serif;
          font-size: 28px;
          color: #fff;
          line-height: 1;
        }

        .fx-sec-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--fx-muted);
        }

        .fx-sec-divider {
          width: 1px;
          background: var(--fx-border);
          align-self: stretch;
          margin: 0 4px;
        }

        /* ── CHART ── */
        .fx-chart-wrap {
          border: 1px solid var(--fx-border);
          border-radius: var(--fx-radius);
          background: var(--fx-card);
          padding: 20px 20px 16px;
        }

        .fx-chart-title {
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--fx-muted2);
          margin-bottom: 16px;
        }

        .fx-chart { width: 100%; }

        .fx-bars {
          display: flex;
          align-items: flex-end;
          gap: 3px;
          height: 120px;
          width: 100%;
        }

        .fx-bar-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          height: 100%;
          gap: 6px;
          cursor: default;
        }

        .fx-bar-fill {
          width: 100%;
          min-height: 0;
          border-radius: 3px 3px 0 0;
          background: linear-gradient(180deg, var(--fx-red2) 0%, var(--fx-red) 100%);
          transition: height 500ms cubic-bezier(.22,1,.36,1), opacity 150ms ease;
        }

        .fx-bar-col:hover .fx-bar-fill { opacity: 0.75; }

        .fx-bar-label {
          font-size: 10px;
          color: var(--fx-muted);
          white-space: nowrap;
          text-transform: capitalize;
        }

        .fx-chart-ends {
          display: flex;
          justify-content: space-between;
          margin-top: 8px;
          font-size: 11px;
          color: var(--fx-muted);
        }

        .fx-footer-note {
          margin-top: 28px;
          font-size: 12px;
          color: var(--fx-muted);
        }

        /* ── RESPONSIVE ── */
        @media (max-width: 600px) {
          .fx-topbar { padding: 0 14px; gap: 8px; flex-wrap: wrap; height: auto; min-height: 52px; padding-top: 8px; padding-bottom: 8px; }
          .fx-brand-name { display: none; }
          .fx-content { padding: 24px 14px 48px; }
          .fx-hero-number { font-size: clamp(64px, 18vw, 96px); }
          .fx-btn span { display: none; }
        }
      `}</style>

      <div className="fx-shell">
        {/* TOPBAR */}
        <header className="fx-topbar">
          <div className="fx-brand">
            <img src="/logo.png" alt="Fenix" />
            <span className="fx-brand-name">Fenix Analytics</span>
            <span className="fx-dot" />
          </div>

          <div className="fx-ranges">
            {ranges.map(r => (
              <button
                key={r.days}
                className={`fx-range-btn${days === r.days ? " active" : ""}`}
                onClick={() => setDays(r.days)}
              >
                {r.label}
              </button>
            ))}
          </div>

          <button className="fx-btn" onClick={() => loadMetrics(days)}>
            <RefreshCw size={13} />
            <span>Actualizar</span>
          </button>
        </header>

        {/* CONTENT */}
        <div className="fx-content">
          {error && <div className="fx-error">{error}</div>}

          {/* BIG NUMBER */}
          <div className="fx-hero">
            <div className="fx-hero-period">{periodLabel}</div>
            <div className={`fx-hero-number${loading ? " loading" : ""}`}>
              {numberFormat(views)}
            </div>
            <div className="fx-hero-label">
              <Eye size={14} />
              visualizaciones
            </div>
          </div>

          {/* SECONDARY */}
          <div className="fx-secondary">
            <div className="fx-sec-stat">
              <span className="fx-sec-value">{loading ? "—" : numberFormat(visitors)}</span>
              <span className="fx-sec-label">
                <Users size={10} style={{ display: "inline", marginRight: 4 }} />
                visitantes únicos
              </span>
            </div>
            {days > 1 && (
              <>
                <div className="fx-sec-divider" />
                <div className="fx-sec-stat">
                  <span className="fx-sec-value">
                    {loading ? "—" : numberFormat(Math.round(views / days))}
                  </span>
                  <span className="fx-sec-label">promedio por día</span>
                </div>
              </>
            )}
          </div>

          {/* BAR CHART */}
          {series.length > 0 && (
            <div className="fx-chart-wrap">
              <div className="fx-chart-title">Vistas por día</div>
              <BarChart series={series} days={days} />
            </div>
          )}

          <p className="fx-footer-note">
            Vistas únicas de página — bots y crawlers filtrados automáticamente.
          </p>
        </div>
      </div>
    </>
  );
}
