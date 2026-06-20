import { createClient } from "@supabase/supabase-js";

// Werte kommen aus den Umgebungsvariablen (siehe .env.example / Vercel-Settings).
// NEXT_PUBLIC_* ist absichtlich öffentlich — der anon-Key darf im Browser stehen,
// abgesichert wird über die RLS-Policies in supabase/schema.sql.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const hasSupabase = Boolean(supabaseUrl && supabaseAnonKey);

// Den echten Client NUR erzeugen, wenn beide Variablen vorhanden sind.
// Fehlen sie (z. B. beim Build ohne gesetzte Env-Variablen oder lokal ohne
// .env.local), liefern wir einen harmlosen Platzhalter, der keine Anfragen
// stellt und nicht abstürzt. Die UI zeigt dann einen Konfigurationshinweis.
function makeStub() {
  const result = Promise.resolve({ data: null, error: new Error("Supabase nicht konfiguriert") });
  const builder = {
    select: () => builder, insert: () => builder, update: () => builder,
    delete: () => builder, eq: () => builder, neq: () => builder, in: () => builder,
    order: () => builder, single: () => result,
    then: (res, rej) => result.then(res, rej), // awaitable
  };
  return {
    from: () => builder,
    channel: () => ({ on() { return this; }, subscribe() { return this; } }),
    removeChannel: () => {},
  };
}

export const supabase = hasSupabase
  ? createClient(supabaseUrl, supabaseAnonKey, {
      realtime: { params: { eventsPerSecond: 10 } },
    })
  : makeStub();
