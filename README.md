# Fenix Fight System

Next.js app con analítica propia para Vercel + Supabase.

## Local

1. Ejecuta `supabase/schema.sql` en Supabase SQL Editor.
2. Copia `.env.local.example` a `.env.local`.
3. Llena `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` y `ANALYTICS_SALT`.
4. Ejecuta `npm run dev`.
5. Abre `http://localhost:3000` y `http://localhost:3000/admin`.

## Seguridad

- La service role key solo se usa en rutas server-side de Next.
- No se guarda la IP cruda; se guarda `ip_hash`.
- RLS queda activo y sin policies públicas para evitar acceso directo desde navegador.
