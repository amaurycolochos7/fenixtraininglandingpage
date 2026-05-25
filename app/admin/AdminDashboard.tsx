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
};

const ranges = [
  { label: "7 días", days: 7 },
  { label: "30 días", days: 30 },
  { label: "90 días", days: 90 }
];

function numberFormat(value: number) {
  return new Intl.NumberFormat("es-MX").format(value);
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

function BucketList({
  title,
  items,
  dimension,
  onOpen
}: {
  title: string;
  items: Bucket[];
  dimension: DetailDimension;
  onOpen: (dimension: DetailDimension, focusLabel?: string) => void;
}) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <article className="panel-card clickable-panel" onClick={() => onOpen(dimension)}>
      <div className="bucket-heading">
        <h3>{title}</h3>
        <span>
          Ver detalle
          <ArrowUpRight size={16} />
        </span>
      </div>
      <div className="bucket-list">
        {items.length === 0 && <p className="muted">Sin datos todavía.</p>}
        {items.map((item) => (
          <button
            className="bucket-row bucket-row-button"
            key={item.label}
            onClick={(event) => {
              event.stopPropagation();
              onOpen(dimension, item.label);
            }}
          >
            <div>
              <span>{item.label}</span>
              <b>{numberFormat(item.value)}</b>
            </div>
            <i style={{ width: `${Math.max((item.value / max) * 100, 8)}%` }} />
          </button>
        ))}
      </div>
    </article>
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
              Conteo server-side con cookies propias, deduplicación corta y ubicación estimada por
              headers de Vercel.
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
            icon={MousePointerClick}
            label="Contactos"
            value={metrics?.totals.contacts || 0}
            hint="Clics hacia WhatsApp/redes"
          />
          <MetricCard
            icon={ShieldCheck}
            label="Cookies aceptadas"
            value={`${metrics?.totals.consentRate || 0}%`}
            hint="Sobre pageviews del periodo"
          />
        </section>

        <section className="panel-card chart-card">
          <div className="panel-title-row">
            <div>
              <h2>Semana y mes</h2>
              <p>Visualizaciones, visitantes únicos y contactos por día.</p>
            </div>
            <Globe2 size={24} />
          </div>
          <div className="chart-wrap">
            {loading ? (
              <p className="muted">Cargando métricas...</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="views" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#e7352f" stopOpacity={0.55} />
                      <stop offset="95%" stopColor="#e7352f" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="visitors" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#f4b85b" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#f4b85b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#2c2c2c" vertical={false} />
                  <XAxis dataKey="date" stroke="#8d8d8d" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} stroke="#8d8d8d" tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: "#111",
                      border: "1px solid #333",
                      borderRadius: 8,
                      color: "#fff"
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="views"
                    name="Vistas"
                    stroke="#e7352f"
                    fill="url(#views)"
                  />
                  <Area
                    type="monotone"
                    dataKey="visitors"
                    name="Visitantes"
                    stroke="#f4b85b"
                    fill="url(#visitors)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="admin-panels">
          <BucketList
            title="Países"
            items={metrics?.countries || []}
            dimension="country"
            onOpen={openDetail}
          />
          <BucketList
            title="Estados"
            items={metrics?.regions || []}
            dimension="region"
            onOpen={openDetail}
          />
          <BucketList
            title="Páginas"
            items={metrics?.pages || []}
            dimension="page"
            onOpen={openDetail}
          />
          <BucketList
            title="Fuentes"
            items={metrics?.sources || []}
            dimension="source"
            onOpen={openDetail}
          />
          <BucketList
            title="Dispositivos"
            items={metrics?.devices || []}
            dimension="device"
            onOpen={openDetail}
          />
        </section>

        <p className="admin-note">
          Nota: la ubicación se estima por IP. País suele ser más confiable que estado/ciudad; VPN,
          datos móviles y proveedores pueden mover la ubicación reportada.
        </p>
      </section>

      {activeDetail && (
        <DetailModal
          data={detailData}
          loading={detailLoading}
          selectedLabel={selectedLabel}
          onSelectLabel={setSelectedLabel}
          onClose={() => {
            setActiveDetail(null);
            setDetailData(null);
            setSelectedLabel(null);
          }}
        />
      )}
    </main>
  );
}
