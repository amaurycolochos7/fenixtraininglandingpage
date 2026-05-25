"use client";

import { type ComponentType, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  ArrowUpRight,
  Download,
  Eye,
  Globe2,
  LogOut,
  MousePointerClick,
  RefreshCw,
  ShieldCheck,
  Users,
  X
} from "lucide-react";

type Bucket = { label: string; value: number };
type SeriesItem = { date: string; views: number; visitors: number; contacts: number };
type DetailDimension = "country" | "region" | "page" | "source" | "device";
type DetailBucket = Bucket & {
  percent: number;
  visitors: number;
  sessions: number;
};
type DetailVisit = {
  id: string;
  date: string;
  created_at: string;
  bucket_label: string;
  path: string;
  title: string | null;
  country: string;
  region: string;
  city: string;
  source: string;
  device: string;
  browser: string;
  os: string;
  consent: string;
};
type DetailData = {
  title: string;
  dimension: DetailDimension;
  days: number;
  total: number;
  buckets: DetailBucket[];
  recent: DetailVisit[];
};
type RecentVisit = {
  id: string;
  date: string;
  created_at: string;
  path: string;
  title: string | null;
  country: string;
  region: string;
  city: string;
  source: string;
  device: string;
  browser: string;
  os: string;
  consent: string;
};
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
  countries: Bucket[];
  regions: Bucket[];
  pages: Bucket[];
  sources: Bucket[];
  devices: Bucket[];
  recent: RecentVisit[];
};

const ranges = [
  { label: "7 días", days: 7 },
  { label: "30 días", days: 30 },
  { label: "90 días", days: 90 }
];

function numberFormat(value: number) {
  return new Intl.NumberFormat("es-MX").format(value);
}

function dateTimeFormat(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: "America/Mexico_City",
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint
}: {
  icon: ComponentType<{ size?: number }>;
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <article className="metric-card">
      <div className="metric-icon">
        <Icon size={22} />
      </div>
      <span>{label}</span>
      <strong>{typeof value === "number" ? numberFormat(value) : value}</strong>
      <p>{hint}</p>
    </article>
  );
}

function BucketList({ title, items }: { title: string; items: Bucket[] }) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <article className="panel-card">
      <div className="bucket-heading">
        <h3>{title}</h3>
      </div>
      <div className="bucket-list">
        {items.length === 0 && <p className="muted">Sin datos todavía.</p>}
        {items.map((item) => (
          <div className="bucket-row" key={item.label}>
            <div>
              <span>{item.label}</span>
              <b>{numberFormat(item.value)}</b>
            </div>
            <i style={{ width: `${Math.max((item.value / max) * 100, 8)}%` }} />
          </div>
        ))}
      </div>
    </article>
  );
}

function RecentVisitsList({ visits }: { visits: RecentVisit[] }) {
  return (
    <section className="panel-card recent-panel">
      <div className="panel-title-row">
        <div>
          <h2>Visitas recientes</h2>
          <p>Ubicación aproximada, día y hora de cada visualización.</p>
        </div>
      </div>

      <div className="recent-list">
        {visits.length === 0 && <p className="muted">Todavía no hay visitas en este periodo.</p>}
        {visits.map((visit) => (
          <article className="recent-row simple-visit-row" key={visit.id}>
            <div className="recent-main">
              <strong>
                {visit.country} · {visit.region}
              </strong>
              <span>{visit.city}</span>
            </div>
            <div>
              <b>{dateTimeFormat(visit.created_at)}</b>
              <span>Hora local de México</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function DetailModal({
  data,
  loading,
  selectedLabel,
  onSelectLabel,
  onClose
}: {
  data: DetailData | null;
  loading: boolean;
  selectedLabel: string | null;
  onSelectLabel: (label: string | null) => void;
  onClose: () => void;
}) {
  const filteredRecent =
    selectedLabel && data
      ? data.recent.filter((visit) => visit.bucket_label === selectedLabel)
      : data?.recent || [];

  return (
    <div className="detail-backdrop" role="dialog" aria-modal="true">
      <section className="detail-modal">
        <header className="detail-header">
          <div>
            <span className="eyebrow">Detalle real</span>
            <h2>{data?.title || "Detalle"}</h2>
            <p>
              {loading
                ? "Cargando datos..."
                : `${numberFormat(data?.total || 0)} visualizaciones en el periodo seleccionado.`}
            </p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Cerrar detalle">
            <X size={20} />
          </button>
        </header>

        {loading && <div className="status-banner">Consultando Supabase...</div>}

        {!loading && data && (
          <>
            <div className="detail-grid">
              {data.buckets.length === 0 && <p className="muted">Sin datos para este periodo.</p>}
              {data.buckets.map((bucket) => (
                <button
                  key={bucket.label}
                  className={`detail-bucket ${selectedLabel === bucket.label ? "active" : ""}`}
                  onClick={() =>
                    onSelectLabel(selectedLabel === bucket.label ? null : bucket.label)
                  }
                >
                  <div>
                    <strong>{bucket.label}</strong>
                    <span>{bucket.percent}% del total</span>
                  </div>
                  <div>
                    <b>{numberFormat(bucket.value)}</b>
                    <small>
                      {numberFormat(bucket.visitors)} visitantes / {numberFormat(bucket.sessions)}{" "}
                      sesiones
                    </small>
                  </div>
                </button>
              ))}
            </div>

            <div className="detail-table-card">
              <div className="detail-subhead">
                <h3>{selectedLabel ? `Visitas de ${selectedLabel}` : "Visitas recientes"}</h3>
                {selectedLabel && (
                  <button className="ghost-button" onClick={() => onSelectLabel(null)}>
                    Ver todo
                  </button>
                )}
              </div>
              <div className="detail-table">
                {filteredRecent.length === 0 && <p className="muted">Sin visitas recientes.</p>}
                {filteredRecent.map((visit) => (
                  <article className="detail-visit" key={visit.id}>
                    <div>
                      <strong>{visit.bucket_label}</strong>
                      <span>
                        {visit.date} · {visit.path}
                      </span>
                    </div>
                    <div>
                      <b>
                        {visit.country} / {visit.region}
                      </b>
                      <span>
                        {visit.city} · {visit.device} · {visit.browser} · {visit.os}
                      </span>
                    </div>
                    <div>
                      <b>{visit.source}</b>
                      <span>Cookies: {visit.consent}</span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export function AdminDashboard() {
  const [days, setDays] = useState(30);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<DetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeDetail, setActiveDetail] = useState<DetailDimension | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);

  async function loadMetrics(nextDays = days) {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/metrics?days=${nextDays}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudieron cargar métricas.");
      setMetrics(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error desconocido.");
    } finally {
      setLoading(false);
    }
  }

  async function openDetail(dimension: DetailDimension, focusLabel?: string) {
    setActiveDetail(dimension);
    setSelectedLabel(focusLabel || null);
    setDetailLoading(true);

    try {
      const response = await fetch(`/api/admin/breakdown?dimension=${dimension}&days=${days}`, {
        cache: "no-store"
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo cargar el detalle.");
      setDetailData(data);
    } catch (detailError) {
      setError(detailError instanceof Error ? detailError.message : "Error desconocido.");
      setActiveDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  useEffect(() => {
    loadMetrics(days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const chartData = useMemo(() => metrics?.series || [], [metrics]);

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <img src="/logo.png" alt="Fenix Fight System" />
          <div>
            <strong>Fenix Analytics</strong>
            <span>Panel privado</span>
          </div>
        </div>

        <nav>
          <a href="/">Sitio público</a>
          <a href="/galeria">Galería</a>
          <a href="/videos">Videos</a>
        </nav>

        <button className="ghost-button sidebar-logout" onClick={logout}>
          <LogOut size={17} />
          Salir
        </button>
      </aside>

      <section className="admin-content">
        <header className="admin-topbar">
          <div>
            <span className="eyebrow">Métricas reales</span>
            <h1>Panel de visualizaciones</h1>
            <p>
              Conteo server-side con cookies propias, deduplicación corta y ubicación aproximada
              por IP con proveedor externo.
            </p>
          </div>
          <div className="admin-actions">
            <div className="range-control">
              {ranges.map((range) => (
                <button
                  key={range.days}
                  className={days === range.days ? "active" : ""}
                  onClick={() => setDays(range.days)}
                >
                  {range.label}
                </button>
              ))}
            </div>
            <button className="secondary-button" onClick={() => loadMetrics(days)}>
              <RefreshCw size={17} />
              Actualizar
            </button>
            <a className="secondary-button" href="/api/admin/export">
              <Download size={17} />
              CSV
            </a>
          </div>
        </header>

        {error && <div className="status-banner danger">{error}</div>}
        {metrics && !metrics.configured && (
          <div className="status-banner">
            {metrics.message} El panel ya está montado; faltan credenciales y tabla en Supabase.
          </div>
        )}

        <section className="metric-grid">
          <MetricCard
            icon={Eye}
            label="Visualizaciones"
            value={metrics?.totals.pageviews || 0}
            hint="Cargas de página válidas"
          />
          <MetricCard
            icon={Users}
            label="Visitantes"
            value={metrics?.totals.visitors || 0}
            hint="Cookie aceptada o aproximación anónima"
          />
          <MetricCard
            icon={Globe2}
            label="Estados"
            value={metrics?.regions.length || 0}
            hint="Estados detectados"
          />
          <MetricCard
            icon={ShieldCheck}
            label="Países"
            value={metrics?.countries.length || 0}
            hint="Países detectados"
          />
        </section>

        <RecentVisitsList visits={metrics?.recent || []} />

        <section className="admin-panels">
          <BucketList title="Estados" items={metrics?.regions || []} />
          <BucketList title="Países" items={metrics?.countries || []} />
        </section>

        <p className="admin-note">
          Nota: la ubicación se estima automáticamente por IP. País suele ser más confiable que
          estado/ciudad; VPN, datos móviles y proveedores pueden mover la ubicación reportada.
        </p>
      </section>

    </main>
  );
}
