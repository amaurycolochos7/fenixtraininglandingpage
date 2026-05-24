"use client";

import { useEffect, useMemo, useState } from "react";
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
  Download,
  Eye,
  Globe2,
  LogOut,
  MousePointerClick,
  RefreshCw,
  ShieldCheck,
  Users
} from "lucide-react";

type Bucket = { label: string; value: number };
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
  icon: typeof Eye;
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
      <h3>{title}</h3>
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

export function AdminDashboard() {
  const [days, setDays] = useState(30);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          <BucketList title="Países" items={metrics?.countries || []} />
          <BucketList title="Estados" items={metrics?.regions || []} />
          <BucketList title="Páginas" items={metrics?.pages || []} />
          <BucketList title="Fuentes" items={metrics?.sources || []} />
          <BucketList title="Dispositivos" items={metrics?.devices || []} />
        </section>

        <p className="admin-note">
          Nota: la ubicación se estima por IP. País suele ser más confiable que estado/ciudad; VPN,
          datos móviles y proveedores pueden mover la ubicación reportada.
        </p>
      </section>
    </main>
  );
}
