-- ============================================================================
-- Schankwirt — Supabase-Schema
-- Im Supabase-Dashboard unter "SQL Editor" einmal komplett ausführen.
-- Setup: PIN-Login aus Tabelle, lockerer Zugriff (alle Geräte lesen/schreiben),
-- Menü liegt im Frontend-Code (nicht hier).
-- ============================================================================

-- --- Aufräumen (falls erneut ausgeführt) -----------------------------------
drop table if exists payment_items cascade;
drop table if exists payments cascade;
drop table if exists order_items cascade;
drop table if exists orders cascade;
drop table if exists staff cascade;

-- --- Bedienungen ------------------------------------------------------------
create table staff (
  id    uuid primary key default gen_random_uuid(),
  name  text not null,
  pin   text not null,           -- 4-stellig; fürs Fest ok als Klartext
  aktiv boolean not null default true,
  sort  int not null default 0
);

-- --- Bestellungen (eine Zeile pro abgeschickter Bestellung an einem Tisch) --
create table orders (
  id          uuid primary key default gen_random_uuid(),
  tisch       int  not null,
  staff_id    uuid references staff(id),
  staff_name  text not null,           -- denormalisiert, spart Joins im Display
  created_at  timestamptz not null default now()
);

-- --- Einzelposten einer Bestellung -----------------------------------------
-- kind: 'drink' -> Theke,  'food' -> Küche
-- station_status: 'neu' | 'arbeit' | 'fertig'  (für die Display-Tickets)
create table order_items (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references orders(id) on delete cascade,
  tisch          int  not null,
  ref_id         text not null,          -- Menü-ID aus dem Frontend (z.B. "d5")
  name           text not null,
  kind           text not null,          -- 'drink' | 'food'
  size           text,
  price          numeric(10,2) not null,
  options        text[] not null default '{}',  -- z.B. {Ketchup,Senf}
  paid           boolean not null default false,
  station_status text not null default 'neu',
  created_at     timestamptz not null default now()
);

-- --- Kassiervorgänge (Beleg-Log für Admin & Excel-Export) ------------------
create table payments (
  id          uuid primary key default gen_random_uuid(),
  tisch       int  not null,
  staff_name  text not null,
  label       text not null,            -- 'Gesamtrechnung' | 'Teilrechnung (n)' ...
  amount      numeric(10,2) not null,
  received    numeric(10,2) not null,
  change      numeric(10,2) not null,
  items       jsonb not null default '[]'::jsonb,  -- [{name,kind,price,options}]
  created_at  timestamptz not null default now()
);

-- --- Indizes für die häufigen Abfragen -------------------------------------
create index on order_items (tisch) where paid = false;
create index on order_items (kind, station_status);
create index on orders (created_at desc);
create index on payments (created_at desc);

-- ============================================================================
-- Realtime: Theke & Küche sollen neue/aktualisierte Posten sofort sehen.
-- ============================================================================
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table order_items;
alter publication supabase_realtime add table payments;

-- ============================================================================
-- RLS: bewusst LOCKER fürs Fest. Wir schalten RLS ein und erlauben mit dem
-- anonymen Schlüssel (anon) Lesen UND Schreiben auf allen Tabellen.
-- -> Jedes Gerät mit der App darf alles. Für ein öffentliches Fest ok.
-- Wenn du es später strenger willst, ersetzen wir diese Policies durch
-- rollenbasierte Regeln.
-- ============================================================================
alter table staff       enable row level security;
alter table orders      enable row level security;
alter table order_items enable row level security;
alter table payments    enable row level security;

-- staff: nur lesen (PINs nicht über die App änderbar)
create policy "staff lesen" on staff
  for select to anon using (true);

-- orders / order_items / payments: lesen + schreiben für alle
create policy "orders alles" on orders
  for all to anon using (true) with check (true);

create policy "order_items alles" on order_items
  for all to anon using (true) with check (true);

create policy "payments alles" on payments
  for all to anon using (true) with check (true);

-- ============================================================================
-- Seed: Demo-Bedienungen (PINs wie in der Demo)
-- ============================================================================
insert into staff (name, pin, sort) values
  ('Anna',  '1111', 1),
  ('Björn', '2222', 2),
  ('Clara', '3333', 3);

-- Fertig. Die Tische 1–12 sind reine Frontend-Konstanten, keine Tabelle nötig.
