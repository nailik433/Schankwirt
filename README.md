# Schankwirt — Bestell-Terminal

Bestell-App für Fest & Gastronomie. Bedienung nimmt Bestellungen pro Tisch auf,
Getränke erscheinen live an der Theke, Essen live in der Küche. Mit Kassieren
(inkl. Rückgeld), Rechnung-Splitten und Admin-Auswertung mit Excel-Export.

Stack: Next.js (App Router) auf Vercel, Supabase (PostgreSQL + Realtime).

## Überblick: 3 Bausteine

1. Supabase-Projekt anlegen + Schema einspielen (Datenbank + Realtime).
2. Dieses Projekt auf GitHub hochladen und in Vercel importieren.
3. Die zwei Supabase-Schlüssel als Umgebungsvariablen in Vercel eintragen.

---

## 1) Supabase einrichten

1. Auf https://supabase.com einen Account anlegen und ein neues Projekt erstellen
   (Region Europa, z. B. Frankfurt). Ein Datenbank-Passwort vergeben und merken.
2. Im Projekt links auf "SQL Editor" → "New query".
3. Den kompletten Inhalt von `supabase/schema.sql` hineinkopieren und "Run" klicken.
   Das legt alle Tabellen an, schaltet Realtime ein, setzt die (lockeren)
   Zugriffsregeln und legt die drei Demo-Bedienungen an.
4. Unter "Project Settings" → "API" findest du zwei Werte, die du gleich brauchst:
   - Project URL  → das ist NEXT_PUBLIC_SUPABASE_URL
   - anon public key → das ist NEXT_PUBLIC_SUPABASE_ANON_KEY

## 2) Auf GitHub hochladen

1. Auf github.com ein neues, leeres Repository anlegen (ohne README/.gitignore).
2. "Add file" → "Upload files" → den INHALT dieses Projektordners hineinziehen
   (also `package.json`, die Ordner `app/`, `components/`, `lib/`, `supabase/`
   usw. ins Repo-Wurzelverzeichnis). `node_modules` NICHT hochladen.
3. "Commit changes".

## 3) In Vercel deployen

1. Auf https://vercel.com mit GitHub anmelden.
2. "Add New…" → "Project" → das Repository importieren. Vercel erkennt Next.js.
3. Vor dem Deploy unter "Environment Variables" die zwei Werte aus Schritt 1.4
   eintragen:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
4. "Deploy" klicken. Nach ca. 1 Minute gibt es eine URL wie `schankwirt.vercel.app`.

Fertig. Öffne die URL auf mehreren Geräten: eines als Bedienung, eines als Theke,
eines als Küche. Eine abgeschickte Bestellung erscheint dank Realtime sofort an
den Displays.

---

## Lokal ausprobieren (optional, mit Node.js)

```bash
npm install
cp .env.example .env.local   # und die zwei Werte eintragen
npm run dev
```

Dann http://localhost:3000 öffnen.

## Demo-Zugänge

- Bedienung: Anna 1111 · Björn 2222 · Clara 3333  (Tabelle "staff" in Supabase)
- Admin: Code 0000  (im Frontend gesetzt, siehe AdminLogin in components/GastroOrder.jsx)

## Was wo liegt

- `components/GastroOrder.jsx` — die komplette App (UI).
- `lib/supabase.js` — Supabase-Client.
- `lib/data.js` — alle Datenbank-Zugriffe + Realtime-Hooks.
- `supabase/schema.sql` — Datenbank-Schema zum einmaligen Einspielen.

## Hinweise

- Das Menü (Getränke/Essen/Preise) steht bewusst im Code (`components/GastroOrder.jsx`,
  Konstante `KARTE`). Änderungen = Datei anpassen und neu hochladen (Vercel deployt
  automatisch neu).
- Der Zugriff ist fürs Fest absichtlich locker: jedes Gerät mit der App-URL darf
  lesen und schreiben. Für einen strengeren, rollenbasierten Zugriff lässt sich
  das Schema später anpassen.
