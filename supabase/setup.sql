-- LGH Portfolio CMS — configuration Supabase
-- 1) Remplacez l'adresse ci-dessous par l'adresse utilisée pour votre compte administrateur.
-- 2) Exécutez ce fichier dans Supabase > SQL Editor.
-- 3) Dans Authentication > Users, créez votre utilisateur admin manuellement.
-- 4) Désactivez les inscriptions publiques si vous ne les utilisez pas.

-- >>> À MODIFIER <<<
-- L'adresse peut rester visible : la sécurité repose sur l'authentification + RLS, pas sur le secret de l'e-mail.

create extension if not exists pgcrypto;

create table if not exists public.content_blocks (
  key text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null check (category in ('Assets','Personnages','Décors','Véhicules')),
  tag text not null default '',
  description text not null default '',
  image_url text not null default '',
  image_alt text not null default '',
  link_url text not null default '#',
  layout text not null default 'standard' check (layout in ('standard','portrait','wide','feature')),
  sort_order integer not null default 10,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.content_blocks enable row level security;
alter table public.portfolio_items enable row level security;

-- Lecture publique du contenu du site.
drop policy if exists "public read blocks" on public.content_blocks;
create policy "public read blocks" on public.content_blocks for select using (true);

drop policy if exists "public read published portfolio" on public.portfolio_items;
create policy "public read published portfolio" on public.portfolio_items for select using (
  published = true or lower(coalesce(auth.jwt()->>'email','')) = lower('lawrencegirardhodges@gmail.com')
);

-- Écriture réservée à l'administrateur.
drop policy if exists "admin insert blocks" on public.content_blocks;
drop policy if exists "admin update blocks" on public.content_blocks;
drop policy if exists "admin delete blocks" on public.content_blocks;
create policy "admin insert blocks" on public.content_blocks for insert with check (lower(coalesce(auth.jwt()->>'email','')) = lower('lawrencegirardhodges@gmail.com'));
create policy "admin update blocks" on public.content_blocks for update using (lower(coalesce(auth.jwt()->>'email','')) = lower('lawrencegirardhodges@gmail.com')) with check (lower(coalesce(auth.jwt()->>'email','')) = lower('lawrencegirardhodges@gmail.com'));
create policy "admin delete blocks" on public.content_blocks for delete using (lower(coalesce(auth.jwt()->>'email','')) = lower('lawrencegirardhodges@gmail.com'));

drop policy if exists "admin insert portfolio" on public.portfolio_items;
drop policy if exists "admin update portfolio" on public.portfolio_items;
drop policy if exists "admin delete portfolio" on public.portfolio_items;
create policy "admin insert portfolio" on public.portfolio_items for insert with check (lower(coalesce(auth.jwt()->>'email','')) = lower('lawrencegirardhodges@gmail.com'));
create policy "admin update portfolio" on public.portfolio_items for update using (lower(coalesce(auth.jwt()->>'email','')) = lower('lawrencegirardhodges@gmail.com')) with check (lower(coalesce(auth.jwt()->>'email','')) = lower('lawrencegirardhodges@gmail.com'));
create policy "admin delete portfolio" on public.portfolio_items for delete using (lower(coalesce(auth.jwt()->>'email','')) = lower('lawrencegirardhodges@gmail.com'));

-- Bucket d'images public : lecture publique, écriture admin uniquement.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('portfolio-media','portfolio-media',true,12582912,array['image/jpeg','image/png','image/webp','image/gif','image/avif'])
on conflict (id) do update set public=true,file_size_limit=12582912,allowed_mime_types=array['image/jpeg','image/png','image/webp','image/gif','image/avif'];

drop policy if exists "public read portfolio media" on storage.objects;
drop policy if exists "admin upload portfolio media" on storage.objects;
drop policy if exists "admin update portfolio media" on storage.objects;
drop policy if exists "admin delete portfolio media" on storage.objects;
create policy "public read portfolio media" on storage.objects for select using (bucket_id='portfolio-media');
create policy "admin upload portfolio media" on storage.objects for insert with check (bucket_id='portfolio-media' and lower(coalesce(auth.jwt()->>'email','')) = lower('lawrencegirardhodges@gmail.com'));
create policy "admin update portfolio media" on storage.objects for update using (bucket_id='portfolio-media' and lower(coalesce(auth.jwt()->>'email','')) = lower('lawrencegirardhodges@gmail.com')) with check (bucket_id='portfolio-media' and lower(coalesce(auth.jwt()->>'email','')) = lower('lawrencegirardhodges@gmail.com'));
create policy "admin delete portfolio media" on storage.objects for delete using (bucket_id='portfolio-media' and lower(coalesce(auth.jwt()->>'email','')) = lower('lawrencegirardhodges@gmail.com'));

-- Contenu initial. Il peut être modifié ensuite depuis /admin.html.
insert into public.content_blocks (key,data) values
('hero', '{"eyebrow":"Créer des mondes, image par image","title":"Lawrence\nGirard-Hodges","subtitle":"3D Artist · Cinematic Worlds · Direction photo","body":"Des personnages aux environnements, en passant par les véhicules et les assets, je conçois des univers pour des histoires qui comptent.","ctaLabel":"Découvrir mon univers","ctaUrl":"#portfolio","manifesto":"Art  ×  Technique  ×  Émotions","imageUrl":"assets/placeholders/hero.svg","quote":"« Des mondes plus vrais que nature, au service de l’imaginaire. »","caption":"PORTFOLIO // 3D & CINÉMA\nFrance · 2026"}'),
('currentProject', '{"title":"Bellow Challenger Deep","body":"Une exploration des profondeurs, entre réalisme et fiction.","ctaLabel":"Suivre le projet","ctaUrl":"#","imageUrl":"assets/placeholders/current.svg"}'),
('about', '{"body":"Je suis Lawrence Girard-Hodges, artiste 3D et directeur de la photographie. J’explore les liens entre art, technologie et narration visuelle pour créer des univers immersifs, du plus petit asset aux plus vastes environnements.","imageUrl":"assets/placeholders/portrait.svg","quote":"« Toujours plus loin\ndans les mondes possibles. »","ctaLabel":"En savoir plus","ctaUrl":"#contact"}')
on conflict (key) do nothing;
