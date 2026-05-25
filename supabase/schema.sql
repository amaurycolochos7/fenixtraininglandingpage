-- Fenix Fight System analytics schema
-- Ejecuta este archivo en Supabase SQL Editor antes de probar el panel.

create extension if not exists pgcrypto;

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_type text not null check (
    event_type in (
      'page_view',
      'consent_update',
      'contact_click',
      'video_play',
      'gallery_open'
    )
  ),
  path text not null,
  title text,
  referrer text,
  visitor_id text,
  session_id text,
  fingerprint_key text not null,
  consent_status text not null default 'unset' check (
    consent_status in ('accepted', 'rejected', 'unset')
  ),
  ip_hash text not null,
  user_agent text,
  country_code text,
  country_name text,
  region_code text,
  region_name text,
  city text,
  timezone text,
  device_type text not null default 'desktop',
  browser text not null default 'Otro',
  os text not null default 'Otro',
  is_bot boolean not null default false,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists analytics_events_created_at_idx
  on public.analytics_events (created_at desc);

create index if not exists analytics_events_event_type_created_at_idx
  on public.analytics_events (event_type, created_at desc);

create index if not exists analytics_events_path_created_at_idx
  on public.analytics_events (path, created_at desc);

create index if not exists analytics_events_geo_created_at_idx
  on public.analytics_events (country_code, region_code, created_at desc);

create index if not exists analytics_events_fingerprint_created_at_idx
  on public.analytics_events (fingerprint_key, created_at desc);

alter table public.analytics_events enable row level security;

-- No creamos policies públicas: el frontend nunca debe leer ni escribir directo.
-- La app usa SUPABASE_SERVICE_ROLE_KEY solo desde Vercel Functions / Next API routes.

comment on table public.analytics_events is
  'Eventos propios de analítica para Fenix Fight System. IP hasheada, ubicación estimada automáticamente por proveedor IP server-side.';

comment on column public.analytics_events.ip_hash is
  'Hash irreversible de IP con ANALYTICS_SALT. No guardar IP cruda.';

-- Opcional: limpieza manual de datos antiguos si el cliente decide retener solo 18 meses.
-- delete from public.analytics_events where created_at < now() - interval '18 months';
