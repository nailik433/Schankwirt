"use client";

import { useStaff, useTables, useTickets, usePayments, submitOrder, settlePayment, hasSupabase } from "@/lib/data";
import React, { useState, useEffect, useMemo } from "react";

/* ============================================================================
   GASTRO ORDER — Demo
   Eine Single-File-Demo der Bestell-App. State liegt In-Memory (useState),
   ein Pub/Sub-Bus simuliert das, was später Supabase Realtime macht:
   - Bedienung schickt Bestellung -> Theke (Getränke) + Küche (Essen) sehen sie live.
   Rollen: Bedienung (Tablet) · Theke (Getränke-Display) · Küche (Essen-Display)
   ============================================================================ */

/* ---------- Demo-Stammdaten ---------- */
const TISCHE = Array.from({ length: 12 }, (_, i) => i + 1);

// Bedienungen kommen aus der Supabase-Tabelle "staff" (siehe lib/data.js).

// kind: "drink" -> Theke,  "food" -> Küche
const KARTE = [
  // Alkoholfrei
  { id: "d1", kind: "drink", cat: "Alkoholfrei", name: "Apfelschorle", size: "0,4 l", price: 3.5 },
  { id: "d2", kind: "drink", cat: "Alkoholfrei", name: "Mineralwasser", size: "0,5 l", price: 2.9 },
  { id: "d3", kind: "drink", cat: "Alkoholfrei", name: "Cola", size: "0,4 l", price: 3.5 },
  { id: "d4", kind: "drink", cat: "Alkoholfrei", name: "Spezi", size: "0,4 l", price: 3.5 },
  // Bier
  { id: "d5", kind: "drink", cat: "Bier", name: "Helles vom Fass", size: "0,5 l", price: 4.2 },
  { id: "d6", kind: "drink", cat: "Bier", name: "Weizen", size: "0,5 l", price: 4.5 },
  { id: "d7", kind: "drink", cat: "Bier", name: "Radler", size: "0,5 l", price: 4.0 },
  { id: "d8", kind: "drink", cat: "Bier", name: "Pils alkoholfrei", size: "0,33 l", price: 3.6 },
  // Wein
  { id: "d9", kind: "drink", cat: "Wein", name: "Weißwein trocken", size: "0,2 l", price: 5.5 },
  { id: "d10", kind: "drink", cat: "Wein", name: "Rotwein", size: "0,2 l", price: 5.5 },
  { id: "d11", kind: "drink", cat: "Wein", name: "Weinschorle", size: "0,25 l", price: 4.8 },
  // Essen (food -> Küche). options = ankreuzbare Beilagen ohne Aufpreis
  { id: "f1", kind: "food", cat: "Essen", name: "Bratwurst mit Brötchen", price: 4.5, options: ["Ketchup", "Senf", "Mayo"] },
  { id: "f2", kind: "food", cat: "Essen", name: "Currywurst mit Pommes", price: 7.5, options: ["Ketchup", "Senf", "Mayo"] },
  { id: "f3", kind: "food", cat: "Essen", name: "Pommes", price: 3.5, options: ["Ketchup", "Senf", "Mayo"] },
  { id: "f4", kind: "food", cat: "Essen", name: "Schnitzel mit Pommes", price: 11.5, options: ["Ketchup", "Senf", "Mayo"] },
  { id: "f5", kind: "food", cat: "Essen", name: "Käsespätzle", price: 8.5, options: [] },
  { id: "f6", kind: "food", cat: "Essen", name: "Steak im Brötchen", price: 6.5, options: ["Ketchup", "Senf", "Mayo"] },
];

const CAT_ORDER = ["Alkoholfrei", "Bier", "Wein", "Essen"];
const euro = (n) => n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
const uid = () => Math.random().toString(36).slice(2, 10);

/* ============================================================================
   APP
   ============================================================================ */
export default function App() {
  const [role, setRole] = useState(null); // "bedienung" | "theke" | "kueche" | "admin"

  return (
    <div style={S.appWrap}>
      <StyleTag />
      {!hasSupabase && <ConfigWarning />}
      {!role && <RolePicker onPick={setRole} />}
      {role === "bedienung" && <Bedienung onExit={() => setRole(null)} />}
      {role === "theke" && <Display kind="drink" onExit={() => setRole(null)} />}
      {role === "kueche" && <Display kind="food" onExit={() => setRole(null)} />}
      {role === "admin" && <Admin onExit={() => setRole(null)} />}
    </div>
  );
}

// Hinweisbanner, falls die Supabase-Umgebungsvariablen fehlen.
function ConfigWarning() {
  return (
    <div style={S.configWarn}>
      Supabase ist nicht konfiguriert. Trage NEXT_PUBLIC_SUPABASE_URL und
      NEXT_PUBLIC_SUPABASE_ANON_KEY in den Umgebungsvariablen ein (.env.local
      lokal bzw. Vercel-Projekteinstellungen), dann neu laden.
    </div>
  );
}

/* ============================================================================
   ROLLENAUSWAHL (in echt: getrennte URLs / Geräte)
   ============================================================================ */
function RolePicker({ onPick }) {
  return (
    <div style={S.center}>
      <div style={S.brandBlock}>
        <div style={S.brandMark}>◐</div>
        <h1 style={S.brandName}>Schankwirt</h1>
        <p style={S.brandSub}>Bestell-Terminal für Fest &amp; Gastronomie</p>
      </div>
      <div style={S.roleGrid}>
        <RoleCard label="Bedienung" hint="Bestellungen pro Tisch aufnehmen" icon="🧾" onClick={() => onPick("bedienung")} />
        <RoleCard label="Theke" hint="Getränke-Anzeige" icon="🍺" onClick={() => onPick("theke")} />
        <RoleCard label="Küche" hint="Essen-Anzeige" icon="🍳" onClick={() => onPick("kueche")} />
        <RoleCard label="Admin" hint="Auswertung &amp; Export" icon="📊" onClick={() => onPick("admin")} />
      </div>
      <p style={S.demoNote}>
        Demo-Tipp: Öffne dieselbe App in mehreren Tabs — einen als Bedienung, einen als Theke, einen als Küche —
        um den Live-Durchstich zu sehen. Hier im Artifact teilen sich alle Rollen denselben Speicher.
      </p>
    </div>
  );
}
function RoleCard({ label, hint, icon, onClick }) {
  return (
    <button style={S.roleCard} onClick={onClick} className="lift">
      <span style={S.roleIcon}>{icon}</span>
      <span style={S.roleLabel}>{label}</span>
      <span style={S.roleHint}>{hint}</span>
    </button>
  );
}

/* ============================================================================
   BEDIENUNG (Tablet)
   Login -> Tischübersicht -> Bestellung aufnehmen -> abschicken -> Rechnung/Split
   ============================================================================ */
function Bedienung({ onExit }) {
  const [user, setUser] = useState(null);
  const [view, setView] = useState({ name: "tables" }); // tables | order | bill
  const { db } = useTables();

  if (!user) return <Login onLogin={setUser} onExit={onExit} />;

  const openTable = (t) => setView({ name: "order", tisch: t });
  const showBill = (t) => setView({ name: "bill", tisch: t });

  return (
    <div style={S.screen}>
      <TopBar
        left={<button style={S.iconBtn} className="lift" onClick={onExit}>← Abmelden</button>}
        center={<span style={S.userTag}>👤 {user.name}</span>}
        right={view.name !== "tables" && (
          <button style={S.iconBtn} className="lift" onClick={() => setView({ name: "tables" })}>Tische</button>
        )}
      />
      {view.name === "tables" && <TableOverview db={db} onOpen={openTable} onBill={showBill} />}
      {view.name === "order" && (
        <OrderTaker
          tisch={view.tisch}
          user={user}
          db={db}
          onBack={() => setView({ name: "tables" })}
          onBill={() => showBill(view.tisch)}
        />
      )}
      {view.name === "bill" && (
        <BillView tisch={view.tisch} db={db} user={user}
          onBack={() => setView({ name: "order", tisch: view.tisch })} />
      )}
    </div>
  );
}

function Login({ onLogin, onExit }) {
  const { staff, loading } = useStaff();
  const [sel, setSel] = useState(null);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");

  const submit = () => {
    if (!sel) return;
    if (sel.pin === pin) onLogin(sel);
    else { setErr("PIN stimmt nicht."); setPin(""); }
  };

  return (
    <div style={S.center}>
      <button style={{ ...S.iconBtn, position: "absolute", top: 20, left: 20 }} className="lift" onClick={onExit}>← Zurück</button>
      <h2 style={S.loginTitle}>Anmelden</h2>
      <p style={S.brandSub}>Bedienung wählen</p>
      <div style={S.userRow}>
        {loading && <p style={S.brandSub}>Lade Bedienungen…</p>}
        {!loading && staff.length === 0 && (
          <p style={S.brandSub}>Keine Bedienungen gefunden. Ist das SQL-Schema eingespielt?</p>
        )}
        {staff.map((b) => (
          <button
            key={b.id}
            className="lift"
            style={{ ...S.userPick, ...(sel?.id === b.id ? S.userPickActive : {}) }}
            onClick={() => { setSel(b); setErr(""); setPin(""); }}
          >
            <span style={S.avatar}>{b.name[0]}</span>
            {b.name}
          </button>
        ))}
      </div>

      {sel && (
        <div style={S.pinPad}>
          <div style={S.pinDisplay}>{pin.padEnd(4, "·")}</div>
          {err && <div style={S.errText}>{err}</div>}
          <div style={S.pinGrid}>
            {["1","2","3","4","5","6","7","8","9","⌫","0","OK"].map((k) => (
              <button
                key={k}
                className="lift"
                style={{ ...S.pinKey, ...(k === "OK" ? S.pinOk : {}) }}
                onClick={() => {
                  if (k === "⌫") setPin((p) => p.slice(0, -1));
                  else if (k === "OK") submit();
                  else if (pin.length < 4) setPin((p) => p + k);
                }}
              >
                {k}
              </button>
            ))}
          </div>
          <p style={S.pinHint}>Demo-PINs: Anna 1111 · Björn 2222 · Clara 3333</p>
        </div>
      )}
    </div>
  );
}

function TableOverview({ db, onOpen, onBill }) {
  const [input, setInput] = useState("");
  const [err, setErr] = useState("");

  const tableInfo = (t) => {
    const d = db[t];
    if (!d || d.items.length === 0) return { count: 0, sum: 0 };
    const open = d.items.filter((i) => !i.paid);
    return { count: open.length, sum: open.reduce((a, i) => a + i.price * i.qty, 0) };
  };

  const submit = () => {
    const n = parseInt(input, 10);
    if (!input || isNaN(n) || n < 1 || n > TISCHE.length) {
      setErr(`Bitte eine Tischnummer zwischen 1 und ${TISCHE.length} eingeben.`);
      return;
    }
    setErr("");
    onOpen(n);
  };

  const info = input && !isNaN(parseInt(input, 10)) ? tableInfo(parseInt(input, 10)) : null;
  const busy = info && info.count > 0;

  return (
    <div style={S.center}>
      <div style={S.tischInputBox}>
        <h2 style={{ ...S.h2, textAlign: "center", margin: "0 0 6px" }}>Tisch wählen</h2>
        <p style={{ ...S.brandSub, textAlign: "center", marginBottom: 20 }}>Tischnummer eingeben</p>
        <input
          type="number"
          min={1}
          max={TISCHE.length}
          value={input}
          onChange={(e) => { setInput(e.target.value); setErr(""); }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="z. B. 5"
          style={S.tischInput}
          autoFocus
        />
        {info && (
          <div style={{ ...S.tischStatus, ...(busy ? S.tischStatusBusy : {}) }}>
            {busy
              ? `Tisch ${parseInt(input, 10)}: ${info.count} offene Posten · ${euro(info.sum)}`
              : `Tisch ${parseInt(input, 10)}: frei`}
          </div>
        )}
        {err && <div style={S.errText}>{err}</div>}
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button style={S.tischConfirm} className="lift" onClick={submit}>Öffnen</button>
          {busy && (
            <button style={S.tischBillBtn} className="lift" onClick={() => onBill(parseInt(input, 10))}>Rechnung</button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Bestellung aufnehmen ---------- */
function OrderTaker({ tisch, user, db, onBack, onBill }) {
  const [cart, setCart] = useState([]); // {lineId, item, qty, options:[]}
  const [activeCat, setActiveCat] = useState("Alkoholfrei");
  const [optFor, setOptFor] = useState(null); // Item, für das gerade Beilagen gewählt werden
  const [sending, setSending] = useState(false);
  const [sendErr, setSendErr] = useState("");

  const existing = db[tisch]?.items?.filter((i) => !i.paid) || [];
  const existingSum = existing.reduce((a, i) => a + i.price * i.qty, 0);

  const addItem = (item) => {
    if (item.options && item.options.length > 0) {
      setOptFor({ item, chosen: [] });
      return;
    }
    pushToCart(item, []);
  };

  const pushToCart = (item, options) => {
    setCart((c) => {
      // gleiche Speise/Getränk mit gleichen Optionen zusammenfassen
      const key = item.id + "|" + options.slice().sort().join(",");
      const idx = c.findIndex((l) => l.key === key);
      if (idx >= 0) {
        const copy = [...c];
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + 1 };
        return copy;
      }
      return [...c, { lineId: uid(), key, item, qty: 1, options }];
    });
  };

  const changeQty = (lineId, delta) =>
    setCart((c) =>
      c.map((l) => (l.lineId === lineId ? { ...l, qty: l.qty + delta } : l)).filter((l) => l.qty > 0)
    );

  const cartSum = cart.reduce((a, l) => a + l.item.price * l.qty, 0);
  const cartCount = cart.reduce((a, l) => a + l.qty, 0);

  const sendOrder = async () => {
    if (cart.length === 0 || sending) return;
    setSending(true);
    setSendErr("");
    try {
      // Schreibt orders + order_items nach Supabase. Theke/Küche bekommen die
      // neuen Posten per Realtime automatisch — kein manuelles Ticket-Pushen nötig.
      await submitOrder({ tisch, user, cart });
      setCart([]);
      onBill(); // direkt zur Rechnung
    } catch (e) {
      setSendErr("Senden fehlgeschlagen. Internet prüfen und erneut versuchen.");
    } finally {
      setSending(false);
    }
  };

  const visible = KARTE.filter((k) => k.cat === activeCat);

  return (
    <div style={S.orderLayout}>
      {/* Menü */}
      <div style={S.menuPane}>
        <div style={S.menuHead}>
          <button style={S.iconBtn} className="lift" onClick={onBack}>← Tische</button>
          <h2 style={S.tischTitle}>Tisch {tisch}</h2>
          <div style={{ width: 96 }} />
        </div>
        <div style={S.catBar}>
          {CAT_ORDER.map((c) => (
            <button
              key={c}
              className="lift"
              style={{ ...S.catBtn, ...(activeCat === c ? S.catActive : {}) }}
              onClick={() => setActiveCat(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <div style={S.menuGrid}>
          {visible.map((item) => (
            <button key={item.id} style={S.menuItem} className="lift" onClick={() => addItem(item)}>
              <span style={S.menuName}>{item.name}</span>
              <span style={S.menuMeta}>
                {item.size ? <span style={S.menuSize}>{item.size}</span> : null}
                <span style={S.menuPrice}>{euro(item.price)}</span>
              </span>
              {item.options?.length > 0 && <span style={S.optBadge}>＋ Beilagen</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Warenkorb */}
      <div style={S.cartPane}>
        <h3 style={S.cartTitle}>Aktuelle Bestellung</h3>
        {existing.length > 0 && (
          <div style={S.alreadyBox}>
            Bereits offen an Tisch {tisch}: <strong>{euro(existingSum)}</strong>
          </div>
        )}
        <div style={S.cartList}>
          {cart.length === 0 && <p style={S.cartEmpty}>Tippe links auf Artikel, um sie hinzuzufügen.</p>}
          {cart.map((l) => (
            <div key={l.lineId} style={S.cartRow}>
              <div style={S.cartInfo}>
                <span style={S.cartName}>{l.item.name}</span>
                {l.options.length > 0 && <span style={S.cartOpts}>+ {l.options.join(", ")}</span>}
                <span style={S.cartUnit}>{euro(l.item.price)}</span>
              </div>
              <div style={S.qtyBox}>
                <button style={S.qtyBtn} className="lift" onClick={() => changeQty(l.lineId, -1)}>−</button>
                <span style={S.qtyNum}>{l.qty}</span>
                <button style={S.qtyBtn} className="lift" onClick={() => changeQty(l.lineId, +1)}>+</button>
              </div>
              <span style={S.cartLineSum}>{euro(l.item.price * l.qty)}</span>
            </div>
          ))}
        </div>
        <div style={S.cartFoot}>
          <div style={S.cartTotalRow}>
            <span>Summe ({cartCount})</span>
            <strong style={S.cartTotal}>{euro(cartSum)}</strong>
          </div>
          <button
            style={{ ...S.sendBtn, ...(cart.length === 0 || sending ? S.disabled : {}) }}
            className="lift"
            onClick={sendOrder}
            disabled={cart.length === 0 || sending}
          >
            {sending ? "Sende…" : "Bestellung abschicken →"}
          </button>
          {sendErr && <p style={S.errText}>{sendErr}</p>}
          <p style={S.sendHint}>Getränke gehen an die Theke, Essen an die Küche. Danach erscheint die Rechnung.</p>
        </div>
      </div>

      {/* Beilagen-Auswahl Overlay */}
      {optFor && (
        <OptionPicker
          item={optFor.item}
          onCancel={() => setOptFor(null)}
          onConfirm={(chosen) => { pushToCart(optFor.item, chosen); setOptFor(null); }}
        />
      )}
    </div>
  );
}

function OptionPicker({ item, onCancel, onConfirm }) {
  const [chosen, setChosen] = useState([]);
  const toggle = (o) => setChosen((c) => (c.includes(o) ? c.filter((x) => x !== o) : [...c, o]));
  return (
    <div style={S.overlay} onClick={onCancel}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={S.modalTitle}>{item.name}</h3>
        <p style={S.modalSub}>Beilagen ankreuzen (ohne Aufpreis)</p>
        <div style={S.optList}>
          {item.options.map((o) => (
            <button
              key={o}
              className="lift"
              style={{ ...S.optRow, ...(chosen.includes(o) ? S.optRowActive : {}) }}
              onClick={() => toggle(o)}
            >
              <span style={{ ...S.checkbox, ...(chosen.includes(o) ? S.checkboxOn : {}) }}>
                {chosen.includes(o) ? "✓" : ""}
              </span>
              {o}
            </button>
          ))}
        </div>
        <div style={S.modalBtns}>
          <button style={S.modalGhost} className="lift" onClick={onCancel}>Abbrechen</button>
          <button style={S.modalPrimary} className="lift" onClick={() => onConfirm(chosen)}>Hinzufügen</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Rechnung + Splitten + Bezahl-Pad ---------- */
function BillView({ tisch, db, user, onBack }) {
  const data = db[tisch] || { items: [], bills: [] };
  const open = data.items.filter((i) => !i.paid);
  const openSum = open.reduce((a, i) => a + i.price * i.qty, 0);

  const [mode, setMode] = useState("full"); // full | byItem | even
  const [picked, setPicked] = useState([]); // item-ids für Teilrechnung
  const [splitN, setSplitN] = useState(2);
  const [payPad, setPayPad] = useState(null); // { ids, amount, label }

  const pickedSum = open.filter((i) => picked.includes(i.id)).reduce((a, i) => a + i.price, 0);

  const togglePick = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  // settle bucht endgültig in Supabase: order_items.paid=true + payments-Zeile.
  // Der useTables-Hook lädt per Realtime neu, der Tisch aktualisiert sich selbst.
  const settle = async (ids, amount, label, received) => {
    const paidItems = open.filter((i) => ids.includes(i.id));
    await settlePayment({
      tisch, user, itemIds: ids, items: paidItems, amount, label,
      received: received ?? amount,
    });
    setPicked([]);
    setPayPad(null);
  };

  // Statt direkt zu buchen, öffnen wir das Bezahl-Pad mit dem fälligen Betrag.
  const askPay = (ids, amount, label) => {
    if (ids.length === 0) return;
    setPayPad({ ids, amount, label });
  };

  const payAll = () => askPay(open.map((i) => i.id), openSum, "Gesamtrechnung");
  const payPicked = () => askPay(picked, pickedSum, `Teilrechnung (${picked.length} Posten)`);
  // "even": gleichmäßig durch N teilen; kassiert am Ende den Gesamtbetrag.
  const evenShare = openSum / splitN;

  // gruppierte Anzeige offener Posten
  const grouped = useMemo(() => groupItems(open), [open]);

  return (
    <div style={S.body}>
      <div style={S.billHead}>
        <button style={S.iconBtn} className="lift" onClick={onBack}>← Weiter bestellen</button>
        <h2 style={S.h2}>Rechnung · Tisch {tisch}</h2>
        <div style={{ width: 150 }} />
      </div>

      {open.length === 0 ? (
        <div style={S.paidBox}>
          <span style={S.paidIcon}>✓</span>
          <p>Alles kassiert. Tisch {tisch} ist offen für neue Gäste.</p>
        </div>
      ) : (
        <div style={S.billLayout}>
          {/* Posten */}
          <div style={S.billItems}>
            <div style={S.modeBar}>
              <button className="lift" style={{ ...S.modeBtn, ...(mode === "full" ? S.modeActive : {}) }} onClick={() => setMode("full")}>Gesamt</button>
              <button className="lift" style={{ ...S.modeBtn, ...(mode === "byItem" ? S.modeActive : {}) }} onClick={() => setMode("byItem")}>Nach Posten teilen</button>
              <button className="lift" style={{ ...S.modeBtn, ...(mode === "even" ? S.modeActive : {}) }} onClick={() => setMode("even")}>Gleichmäßig teilen</button>
            </div>

            {mode === "byItem" ? (
              <div style={S.itemList}>
                {open.map((i) => (
                  <button
                    key={i.id}
                    className="lift"
                    style={{ ...S.billItemRow, ...(picked.includes(i.id) ? S.billItemPicked : {}) }}
                    onClick={() => togglePick(i.id)}
                  >
                    <span style={{ ...S.checkbox, ...(picked.includes(i.id) ? S.checkboxOn : {}) }}>
                      {picked.includes(i.id) ? "✓" : ""}
                    </span>
                    <span style={S.biName}>
                      {i.name}
                      {i.options?.length > 0 && <em style={S.biOpts}> + {i.options.join(", ")}</em>}
                    </span>
                    <span style={S.biPrice}>{euro(i.price)}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div style={S.itemList}>
                {grouped.map((g) => (
                  <div key={g.key} style={S.groupRow}>
                    <span style={S.gQty}>{g.qty}×</span>
                    <span style={S.biName}>
                      {g.name}
                      {g.options.length > 0 && <em style={S.biOpts}> + {g.options.join(", ")}</em>}
                    </span>
                    <span style={S.biPrice}>{euro(g.price * g.qty)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Kassieren */}
          <div style={S.billSummary}>
            <div style={S.sumRow}><span>Offen gesamt</span><strong>{euro(openSum)}</strong></div>

            {mode === "full" && (
              <button style={S.payBtn} className="lift" onClick={payAll}>{euro(openSum)} kassieren</button>
            )}

            {mode === "byItem" && (
              <>
                <div style={S.sumRow}><span>Ausgewählt</span><strong>{euro(pickedSum)}</strong></div>
                <button
                  style={{ ...S.payBtn, ...(picked.length === 0 ? S.disabled : {}) }}
                  className="lift" onClick={payPicked} disabled={picked.length === 0}
                >
                  Teilrechnung kassieren
                </button>
                <p style={S.splitHint}>Posten ankreuzen → kassieren. Der Rest bleibt am Tisch {tisch} offen.</p>
              </>
            )}

            {mode === "even" && (
              <>
                <div style={S.stepperRow}>
                  <span>Personen</span>
                  <div style={S.qtyBox}>
                    <button style={S.qtyBtn} className="lift" onClick={() => setSplitN((n) => Math.max(2, n - 1))}>−</button>
                    <span style={S.qtyNum}>{splitN}</span>
                    <button style={S.qtyBtn} className="lift" onClick={() => setSplitN((n) => n + 1)}>+</button>
                  </div>
                </div>
                <div style={S.evenBig}>{euro(evenShare)} <span style={S.evenSmall}>pro Person</span></div>
                <button style={S.payBtn} className="lift" onClick={payAll}>Gesamt {euro(openSum)} kassieren</button>
                <p style={S.splitHint}>Beträge zum Einsammeln. „Kassieren" schließt die offenen Posten.</p>
              </>
            )}

            {(data.bills?.length > 0) && (
              <div style={S.history}>
                <div style={S.historyTitle}>Bereits kassiert</div>
                {data.bills.map((b) => (
                  <div key={b.id} style={S.historyRow}>
                    <span>{b.label}</span><span>{euro(b.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {payPad && (
        <PayPad
          amount={payPad.amount}
          label={payPad.label}
          onCancel={() => setPayPad(null)}
          onConfirm={(received) => settle(payPad.ids, payPad.amount, payPad.label, received)}
        />
      )}
    </div>
  );
}

/* ---------- Bezahl-Pad mit Rückgeld ---------- */
function PayPad({ amount, label, onCancel, onConfirm }) {
  const [entry, setEntry] = useState(""); // Eingabe als String, z.B. "20" oder "20,50"
  const received = parseFloat(entry.replace(",", ".")) || 0;
  const change = received - amount;
  const enough = received >= amount && entry !== "";

  // gängige Scheine/Beträge als Schnellwahl
  const quick = quickAmounts(amount);

  const press = (k) => {
    if (k === "⌫") return setEntry((e) => e.slice(0, -1));
    if (k === "C") return setEntry("");
    if (k === ",") return setEntry((e) => (e.includes(",") ? e : e === "" ? "0," : e + ","));
    // max 2 Nachkommastellen
    setEntry((e) => {
      const next = e + k;
      if (next.includes(",") && next.split(",")[1].length > 2) return e;
      return next;
    });
  };

  return (
    <div style={S.overlay} onClick={onCancel}>
      <div style={{ ...S.modal, maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <h3 style={S.modalTitle}>Kassieren</h3>
        <p style={S.modalSub}>{label}</p>

        <div style={S.payDueRow}>
          <span>Zu zahlen</span>
          <strong style={S.payDue}>{euro(amount)}</strong>
        </div>

        <div style={S.payField}>
          <span style={S.payFieldLabel}>Erhalten</span>
          <span style={S.payFieldValue}>{entry === "" ? "0,00" : entry} €</span>
        </div>

        <div style={S.quickRow}>
          {quick.map((q) => (
            <button key={q} className="lift" style={S.quickBtn}
              onClick={() => setEntry(formatEntry(q))}>
              {euro(q)}
            </button>
          ))}
          <button className="lift" style={{ ...S.quickBtn, ...S.quickExact }}
            onClick={() => setEntry(formatEntry(amount))}>
            Passend
          </button>
        </div>

        <div style={S.payGrid}>
          {["1","2","3","4","5","6","7","8","9",",","0","⌫"].map((k) => (
            <button key={k} className="lift" style={S.payKey} onClick={() => press(k)}>{k}</button>
          ))}
        </div>

        <div style={{ ...S.changeBox, ...(enough ? S.changeOk : S.changeWait) }}>
          <span>Rückgeld</span>
          <strong style={S.changeBig}>
            {entry === "" ? "—" : change >= 0 ? euro(change) : `fehlen ${euro(-change)}`}
          </strong>
        </div>

        <div style={S.modalBtns}>
          <button style={S.modalGhost} className="lift" onClick={onCancel}>Abbrechen</button>
          <button
            style={{ ...S.modalPrimary, ...(enough ? {} : S.disabled) }}
            className="lift"
            disabled={!enough}
            onClick={() => onConfirm(received)}
          >
            Buchen
          </button>
        </div>
      </div>
    </div>
  );
}

function formatEntry(n) {
  return n.toFixed(2).replace(".", ",");
}
// Schlägt sinnvolle Scheine oberhalb des Betrags vor (5,10,20,50,100)
function quickAmounts(amount) {
  const notes = [5, 10, 20, 50, 100];
  const out = notes.filter((n) => n >= amount).slice(0, 3);
  if (out.length < 3) {
    // nächste runde 10er ergänzen
    let base = Math.ceil(amount / 10) * 10;
    while (out.length < 3) { if (!out.includes(base)) out.push(base); base += 10; }
  }
  return [...new Set(out)].sort((a, b) => a - b);
}

function groupItems(items) {
  const map = new Map();
  items.forEach((i) => {
    const key = i.refId + "|" + (i.options || []).slice().sort().join(",");
    if (!map.has(key)) map.set(key, { key, name: i.name, options: i.options || [], price: i.price, qty: 0 });
    map.get(key).qty += 1;
  });
  return [...map.values()];
}

/* ============================================================================
   ADMIN — Auswertung aller Buchungen + Excel-Export
   ============================================================================ */
function Admin({ onExit }) {
  const [authed, setAuthed] = useState(false);
  if (!authed) return <AdminLogin onOk={() => setAuthed(true)} onExit={onExit} />;
  return <AdminPanelLive onExit={onExit} />;
}

// Lädt die Buchungen aus Supabase und reicht sie ins bestehende Panel.
function AdminPanelLive({ onExit }) {
  const { payments } = usePayments();
  return <AdminPanel payments={payments} onExit={onExit} />;
}

function AdminLogin({ onOk, onExit }) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const submit = () => { if (pin === "0000") onOk(); else { setErr("Falscher Code."); setPin(""); } };
  return (
    <div style={S.center}>
      <button style={{ ...S.iconBtn, position: "absolute", top: 20, left: 20 }} className="lift" onClick={onExit}>← Zurück</button>
      <div style={S.brandBlock}>
        <div style={{ ...S.brandMark, fontSize: 40 }}>📊</div>
        <h2 style={S.loginTitle}>Admin</h2>
        <p style={S.brandSub}>Zugangscode eingeben</p>
      </div>
      <div style={S.pinPad}>
        <div style={S.pinDisplay}>{pin.padEnd(4, "·")}</div>
        {err && <div style={S.errText}>{err}</div>}
        <div style={S.pinGrid}>
          {["1","2","3","4","5","6","7","8","9","⌫","0","OK"].map((k) => (
            <button key={k} className="lift" style={{ ...S.pinKey, ...(k === "OK" ? S.pinOk : {}) }}
              onClick={() => {
                if (k === "⌫") setPin((p) => p.slice(0, -1));
                else if (k === "OK") submit();
                else if (pin.length < 4) setPin((p) => p + k);
              }}>{k}</button>
          ))}
        </div>
        <p style={S.pinHint}>Demo-Code: 0000</p>
      </div>
    </div>
  );
}

function AdminPanel({ payments, onExit }) {
  const [sortKey, setSortKey] = useState("ts");   // ts | tisch | bedienung | amount
  const [sortDir, setSortDir] = useState("desc"); // asc | desc
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState("");

  const totalRevenue = payments.reduce((a, p) => a + p.amount, 0);
  const itemCount = payments.reduce((a, p) => a + p.items.length, 0);

  const sorted = useMemo(() => {
    const arr = [...payments];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      let av, bv;
      if (sortKey === "tisch") { av = a.tisch; bv = b.tisch; }
      else if (sortKey === "bedienung") { av = a.bedienung; bv = b.bedienung; }
      else if (sortKey === "amount") { av = a.amount; bv = b.amount; }
      else { av = a.ts; bv = b.ts; }
      if (typeof av === "string") return av.localeCompare(bv) * dir;
      return (av - bv) * dir;
    });
    return arr;
  }, [payments, sortKey, sortDir]);

  const setSort = (key) => {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir(key === "ts" || key === "amount" ? "desc" : "asc"); }
  };
  const arrow = (key) => (sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : "");

  // Produkthäufigkeit über alle bezahlten Posten
  const productStats = useMemo(() => {
    const map = new Map();
    payments.forEach((p) =>
      p.items.forEach((it) => {
        const key = it.name;
        if (!map.has(key)) map.set(key, { name: it.name, kind: it.kind, qty: 0, revenue: 0 });
        const row = map.get(key);
        row.qty += 1;
        row.revenue += it.price;
      })
    );
    return [...map.values()].sort((a, b) => b.qty - a.qty);
  }, [payments]);

  const exportExcel = async () => {
    if (payments.length === 0) return;
    setExporting(true);
    setExportMsg("");
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();

      // Blatt 1: Produkte – wie oft bestellt (Hauptwunsch), absteigend
      const prodRows = productStats.map((r) => ({
        Produkt: r.name,
        Bereich: r.kind === "drink" ? "Getränk" : "Essen",
        Anzahl: r.qty,
        "Umsatz (EUR)": Number(r.revenue.toFixed(2)),
      }));
      prodRows.push({ Produkt: "GESAMT", Bereich: "", Anzahl: productStats.reduce((a, r) => a + r.qty, 0), "Umsatz (EUR)": Number(totalRevenue.toFixed(2)) });
      const ws1 = XLSX.utils.json_to_sheet(prodRows);
      ws1["!cols"] = [{ wch: 28 }, { wch: 12 }, { wch: 10 }, { wch: 14 }];
      XLSX.utils.book_append_sheet(wb, ws1, "Produkte");

      // Blatt 2: Einzelne Buchungen (Beleg-Log)
      const payRows = sorted.map((p) => ({
        Zeit: new Date(p.ts).toLocaleString("de-DE"),
        Tisch: p.tisch,
        Bedienung: p.bedienung,
        Rechnung: p.label,
        "Betrag (EUR)": Number(p.amount.toFixed(2)),
        "Erhalten (EUR)": Number(p.received.toFixed(2)),
        "Rückgeld (EUR)": Number(p.change.toFixed(2)),
        Posten: p.items.map((i) => i.name + (i.options.length ? ` (${i.options.join("/")})` : "")).join(", "),
      }));
      const ws2 = XLSX.utils.json_to_sheet(payRows);
      ws2["!cols"] = [{ wch: 19 }, { wch: 6 }, { wch: 12 }, { wch: 22 }, { wch: 12 }, { wch: 13 }, { wch: 13 }, { wch: 50 }];
      XLSX.utils.book_append_sheet(wb, ws2, "Buchungen");

      const stamp = new Date().toISOString().slice(0, 16).replace("T", "_").replace(":", "-");
      XLSX.writeFile(wb, `bestellungen_${stamp}.xlsx`);
      setExportMsg("Export erstellt — Download gestartet.");
    } catch (e) {
      setExportMsg("Export fehlgeschlagen: " + (e?.message || "unbekannter Fehler"));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={S.screen}>
      <TopBar
        left={<button style={S.iconBtn} className="lift" onClick={onExit}>← Rolle wechseln</button>}
        center={<span style={{ ...S.displayTitle, color: amber }}>Admin · Auswertung</span>}
        right={
          <button
            style={{ ...S.exportBtn, ...(payments.length === 0 || exporting ? S.disabled : {}) }}
            className="lift" onClick={exportExcel} disabled={payments.length === 0 || exporting}>
            {exporting ? "Exportiere…" : "⬇ Excel-Export"}
          </button>
        }
      />
      <div style={S.adminBody}>
        {/* Kennzahlen */}
        <div style={S.kpiRow}>
          <Kpi label="Umsatz" value={euro(totalRevenue)} />
          <Kpi label="Buchungen" value={payments.length} />
          <Kpi label="Verkaufte Posten" value={itemCount} />
          <Kpi label="Verschiedene Produkte" value={productStats.length} />
        </div>
        {exportMsg && <div style={S.exportMsg}>{exportMsg}</div>}

        {payments.length === 0 ? (
          <div style={S.emptyDisplay}>
            <span style={S.emptyBig}>🧾</span>
            <p>Noch keine bezahlten Bestellungen. Sobald an einem Tisch kassiert wurde, erscheinen die Buchungen hier.</p>
          </div>
        ) : (
          <div style={S.adminGrid}>
            {/* Buchungen, sortierbar */}
            <div style={S.adminCard}>
              <div style={S.adminCardHead}>
                <h3 style={S.adminH3}>Alle Buchungen</h3>
                <div style={S.sortBar}>
                  <span style={S.sortLabel}>Sortieren:</span>
                  <button className="lift" style={{ ...S.sortChip, ...(sortKey === "ts" ? S.sortChipOn : {}) }} onClick={() => setSort("ts")}>Bestellung{arrow("ts")}</button>
                  <button className="lift" style={{ ...S.sortChip, ...(sortKey === "tisch" ? S.sortChipOn : {}) }} onClick={() => setSort("tisch")}>Tisch{arrow("tisch")}</button>
                  <button className="lift" style={{ ...S.sortChip, ...(sortKey === "bedienung" ? S.sortChipOn : {}) }} onClick={() => setSort("bedienung")}>Bedienung{arrow("bedienung")}</button>
                  <button className="lift" style={{ ...S.sortChip, ...(sortKey === "amount" ? S.sortChipOn : {}) }} onClick={() => setSort("amount")}>Betrag{arrow("amount")}</button>
                </div>
              </div>
              <div style={S.tableScroll}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>Zeit</th>
                      <th style={S.th}>Tisch</th>
                      <th style={S.th}>Bedienung</th>
                      <th style={S.th}>Rechnung</th>
                      <th style={{ ...S.th, textAlign: "right" }}>Betrag</th>
                      <th style={{ ...S.th, textAlign: "right" }}>Rückgeld</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((p) => (
                      <tr key={p.id} style={S.tr}>
                        <td style={S.td}>{new Date(p.ts).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</td>
                        <td style={S.td}><span style={S.tischChip}>{p.tisch}</span></td>
                        <td style={S.td}>{p.bedienung}</td>
                        <td style={{ ...S.td, color: sub }}>{p.label}</td>
                        <td style={{ ...S.td, textAlign: "right", fontWeight: 700 }}>{euro(p.amount)}</td>
                        <td style={{ ...S.td, textAlign: "right", color: sub }}>{euro(p.change)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Produkt-Ranking */}
            <div style={S.adminCard}>
              <h3 style={S.adminH3}>Produkte · wie oft bestellt</h3>
              <div style={S.rankList}>
                {productStats.map((r, idx) => {
                  const max = productStats[0].qty || 1;
                  return (
                    <div key={r.name} style={S.rankRow}>
                      <span style={S.rankNo}>{idx + 1}</span>
                      <div style={S.rankMain}>
                        <div style={S.rankTop}>
                          <span style={S.rankName}>{r.name}</span>
                          <span style={S.rankQty}>{r.qty}×</span>
                        </div>
                        <div style={S.rankBarTrack}>
                          <div style={{ ...S.rankBarFill, width: `${(r.qty / max) * 100}%`, background: r.kind === "drink" ? amber : "#d8694a" }} />
                        </div>
                        <span style={S.rankRev}>{euro(r.revenue)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value }) {
  return (
    <div style={S.kpi}>
      <span style={S.kpiValue}>{value}</span>
      <span style={S.kpiLabel}>{label}</span>
    </div>
  );
}

/* ============================================================================
   DISPLAY für Theke (Getränke) & Küche (Essen)
   ============================================================================ */
function Display({ kind, onExit }) {
  const title = kind === "drink" ? "Theke · Getränke" : "Küche · Essen";
  const accent = kind === "drink" ? "#e0a64a" : "#d8694a";
  const { tickets, setTicketStatus } = useTickets(kind);

  const mine = tickets; // Hook liefert nur offene (nicht fertige) Bons

  return (
    <div style={S.screen}>
      <TopBar
        left={<button style={S.iconBtn} className="lift" onClick={onExit}>← Rolle wechseln</button>}
        center={<span style={{ ...S.displayTitle, color: accent }}>{title}</span>}
        right={<span style={S.queueCount}>{mine.length} offen</span>}
      />
      <div style={S.displayBody}>
        {mine.length === 0 && (
          <div style={S.emptyDisplay}>
            <span style={S.emptyBig}>{kind === "drink" ? "🍺" : "🍳"}</span>
            <p>Keine offenen Bons. Neue Bestellungen erscheinen hier automatisch.</p>
          </div>
        )}
        <div style={S.ticketGrid}>
          {mine.map((t) => (
            <Ticket key={t.id} t={t} accent={accent}
              onStart={() => setTicketStatus(t.id, "arbeit")}
              onDone={() => setTicketStatus(t.id, "fertig")} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Ticket({ t, accent, onStart, onDone }) {
  const age = useAge(t.ts);
  const inWork = t.status === "arbeit";
  return (
    <div style={{ ...S.ticket, borderTopColor: accent, ...(inWork ? S.ticketWork : {}) }}>
      <div style={S.ticketHead}>
        <span style={{ ...S.ticketTisch, background: accent }}>Tisch {t.tisch}</span>
        <span style={S.ticketAge}>{age}</span>
      </div>
      <div style={S.ticketMeta}>{t.bedienung} · {new Date(t.ts).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</div>
      <div style={S.ticketLines}>
        {t.lines.map((l, idx) => (
          <div key={idx} style={S.ticketLine}>
            <span style={S.tlQty}>{l.qty}×</span>
            <span style={S.tlName}>
              {l.name}{l.size ? <span style={S.tlSize}> {l.size}</span> : null}
              {l.options?.length > 0 && <div style={S.tlOpts}>+ {l.options.join(", ")}</div>}
            </span>
          </div>
        ))}
      </div>
      <div style={S.ticketBtns}>
        {!inWork ? (
          <button style={{ ...S.tBtn, ...S.tBtnStart }} className="lift" onClick={onStart}>In Arbeit</button>
        ) : (
          <button style={{ ...S.tBtn, ...S.tBtnStartActive }} className="lift" onClick={onStart}>● in Arbeit</button>
        )}
        <button style={{ ...S.tBtn, ...S.tBtnDone }} className="lift" onClick={onDone}>Fertig ✓</button>
      </div>
    </div>
  );
}

function useAge(ts) {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((x) => x + 1), 10000);
    return () => clearInterval(id);
  }, []);
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return "gerade eben";
  const min = Math.floor(sec / 60);
  return `vor ${min} min`;
}

/* ---------- gemeinsame UI-Teile ---------- */
function TopBar({ left, center, right }) {
  return (
    <div style={S.topbar}>
      <div style={S.tbSide}>{left}</div>
      <div style={S.tbCenter}>{center}</div>
      <div style={{ ...S.tbSide, justifyContent: "flex-end" }}>{right}</div>
    </div>
  );
}

/* ============================================================================
   STYLES — dunkles Service-Terminal, Bernstein-Akzent, große Touch-Targets
   ============================================================================ */
function StyleTag() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap');
      * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
      button { font-family: inherit; cursor: pointer; border: none; }
      .lift { transition: transform .12s ease, box-shadow .12s ease, background .15s ease, border-color .15s ease; }
      .lift:hover { transform: translateY(-1px); }
      .lift:active { transform: translateY(1px) scale(.99); }
      ::-webkit-scrollbar { width: 10px; height: 10px; }
      ::-webkit-scrollbar-thumb { background: #2c3340; border-radius: 6px; }
      @media (prefers-reduced-motion: reduce){ .lift{ transition:none; } }
    `}</style>
  );
}

const ink = "#0d1117";
const panel = "#161b22";
const panel2 = "#1c232d";
const line = "#2a323d";
const txt = "#e8edf2";
const sub = "#8b97a6";
const amber = "#e0a64a";
const amberDeep = "#c4862f";
const green = "#3fb27f";

const S = {
  appWrap: { minHeight: "100vh", background: ink, color: txt, fontFamily: "Inter, system-ui, sans-serif" },

  center: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, position: "relative", gap: 18 },
  brandBlock: { textAlign: "center", marginBottom: 8 },
  brandMark: { fontSize: 48, color: amber, lineHeight: 1 },
  brandName: { fontFamily: "Fraunces, serif", fontSize: 40, fontWeight: 600, margin: "6px 0 2px", letterSpacing: "-0.02em" },
  brandSub: { color: sub, margin: 0, fontSize: 15 },

  roleGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 16, width: "100%", maxWidth: 720 },
  roleCard: { background: panel, border: `1px solid ${line}`, borderRadius: 18, padding: "28px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, color: txt },
  roleIcon: { fontSize: 38 },
  roleLabel: { fontSize: 20, fontWeight: 700 },
  roleHint: { fontSize: 13, color: sub, textAlign: "center" },
  demoNote: { color: sub, fontSize: 12.5, maxWidth: 600, textAlign: "center", lineHeight: 1.6, marginTop: 8 },

  loginTitle: { fontFamily: "Fraunces, serif", fontSize: 30, margin: 0 },
  userRow: { display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" },
  userPick: { background: panel, border: `1px solid ${line}`, borderRadius: 14, padding: "14px 22px", color: txt, fontSize: 17, fontWeight: 600, display: "flex", alignItems: "center", gap: 10 },
  userPickActive: { borderColor: amber, background: panel2, boxShadow: `0 0 0 2px ${amber}40` },
  avatar: { width: 30, height: 30, borderRadius: "50%", background: amberDeep, color: ink, display: "grid", placeItems: "center", fontWeight: 800 },

  pinPad: { background: panel, border: `1px solid ${line}`, borderRadius: 18, padding: 20, width: 300 },
  pinDisplay: { fontSize: 30, letterSpacing: 14, textAlign: "center", padding: "10px 0", color: amber, fontWeight: 700 },
  pinGrid: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginTop: 10 },
  pinKey: { background: panel2, border: `1px solid ${line}`, borderRadius: 12, padding: "16px 0", fontSize: 22, fontWeight: 600, color: txt },
  pinOk: { background: amber, color: ink },
  pinHint: { color: sub, fontSize: 11.5, textAlign: "center", marginTop: 12, marginBottom: 0 },
  errText: { color: "#e5645d", textAlign: "center", fontSize: 13, marginTop: 4 },

  screen: { minHeight: "100vh", display: "flex", flexDirection: "column" },
  topbar: { display: "flex", alignItems: "center", padding: "12px 16px", background: panel, borderBottom: `1px solid ${line}`, position: "sticky", top: 0, zIndex: 5 },
  tbSide: { flex: 1, display: "flex", alignItems: "center", gap: 10 },
  tbCenter: { flex: 1, display: "flex", justifyContent: "center" },
  iconBtn: { background: panel2, border: `1px solid ${line}`, color: txt, borderRadius: 10, padding: "9px 14px", fontSize: 14, fontWeight: 600 },
  userTag: { fontWeight: 700, fontSize: 15 },
  displayTitle: { fontFamily: "Fraunces, serif", fontSize: 22, fontWeight: 600 },
  queueCount: { background: panel2, border: `1px solid ${line}`, borderRadius: 999, padding: "6px 14px", fontSize: 14, fontWeight: 700, color: amber },

  body: { padding: 20, maxWidth: 1100, margin: "0 auto", width: "100%" },
  h2: { fontFamily: "Fraunces, serif", fontWeight: 600, fontSize: 26, margin: "4px 0 18px" },

  tableGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 14 },
  tableCard: { background: panel, border: `1px solid ${line}`, borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column" },
  tableBusy: { borderColor: amber + "88", background: panel2 },
  tableMain: { background: "transparent", color: txt, padding: "20px 16px 14px", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4 },
  tableNo: { fontSize: 34, fontWeight: 800, fontFamily: "Fraunces, serif", lineHeight: 1 },
  tableMeta: { fontSize: 13, color: amber, fontWeight: 600 },
  tableFree: { fontSize: 13, color: sub },
  tableBill: { background: amber, color: ink, fontWeight: 700, padding: "10px 0", fontSize: 14 },

  tischInputBox: { background: panel, border: `1px solid ${line}`, borderRadius: 20, padding: "32px 28px", width: "100%", maxWidth: 340, display: "flex", flexDirection: "column", alignItems: "stretch" },
  tischInput: { background: panel2, border: `1px solid ${line}`, borderRadius: 12, color: txt, fontSize: 32, fontWeight: 700, fontFamily: "Fraunces, serif", textAlign: "center", padding: "14px 12px", outline: "none", width: "100%", boxSizing: "border-box" },
  tischStatus: { marginTop: 10, fontSize: 13, color: sub, textAlign: "center", padding: "8px 12px", background: panel2, borderRadius: 10, border: `1px solid ${line}` },
  tischStatusBusy: { color: amber, borderColor: amber + "88" },
  tischConfirm: { flex: 1, background: amber, color: ink, fontWeight: 700, borderRadius: 12, padding: "14px 0", fontSize: 16 },
  tischBillBtn: { background: panel2, color: txt, border: `1px solid ${line}`, fontWeight: 600, borderRadius: 12, padding: "14px 16px", fontSize: 14 },

  orderLayout: { display: "grid", gridTemplateColumns: "1fr 360px", gap: 0, flex: 1, minHeight: 0 },
  menuPane: { padding: 18, overflowY: "auto" },
  menuHead: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  tischTitle: { fontFamily: "Fraunces, serif", fontSize: 24, margin: 0 },
  catBar: { display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" },
  catBtn: { background: panel, border: `1px solid ${line}`, color: sub, borderRadius: 999, padding: "9px 18px", fontSize: 15, fontWeight: 600 },
  catActive: { background: amber, color: ink, borderColor: amber },
  menuGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 },
  menuItem: { background: panel, border: `1px solid ${line}`, borderRadius: 14, padding: "16px 14px", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8, color: txt, textAlign: "left", minHeight: 92, justifyContent: "space-between" },
  menuName: { fontSize: 16, fontWeight: 600, lineHeight: 1.25 },
  menuMeta: { display: "flex", alignItems: "center", gap: 10, width: "100%" },
  menuSize: { fontSize: 12.5, color: sub },
  menuPrice: { fontSize: 15, fontWeight: 700, color: amber, marginLeft: "auto" },
  optBadge: { fontSize: 11, color: "#d8694a", fontWeight: 700 },

  cartPane: { background: panel, borderLeft: `1px solid ${line}`, display: "flex", flexDirection: "column", maxHeight: "calc(100vh - 57px)" },
  cartTitle: { fontFamily: "Fraunces, serif", fontSize: 19, margin: 0, padding: "18px 18px 10px" },
  alreadyBox: { margin: "0 18px 8px", padding: "8px 12px", background: panel2, borderRadius: 10, fontSize: 13, color: sub, border: `1px solid ${line}` },
  cartList: { flex: 1, overflowY: "auto", padding: "4px 12px" },
  cartEmpty: { color: sub, fontSize: 14, padding: 18, lineHeight: 1.5 },
  cartRow: { display: "flex", alignItems: "center", gap: 8, padding: "10px 6px", borderBottom: `1px solid ${line}` },
  cartInfo: { display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 },
  cartName: { fontSize: 14.5, fontWeight: 600 },
  cartOpts: { fontSize: 12, color: "#d8694a" },
  cartUnit: { fontSize: 12, color: sub },
  qtyBox: { display: "flex", alignItems: "center", gap: 8 },
  qtyBtn: { width: 30, height: 30, borderRadius: 8, background: panel2, border: `1px solid ${line}`, color: txt, fontSize: 18, fontWeight: 700, display: "grid", placeItems: "center" },
  qtyNum: { minWidth: 20, textAlign: "center", fontWeight: 700 },
  cartLineSum: { fontWeight: 700, fontSize: 14, minWidth: 60, textAlign: "right" },
  cartFoot: { borderTop: `1px solid ${line}`, padding: 16, background: panel2 },
  cartTotalRow: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12, fontSize: 15 },
  cartTotal: { fontSize: 24, fontFamily: "Fraunces, serif" },
  sendBtn: { width: "100%", background: green, color: "#06281c", fontWeight: 800, fontSize: 16, padding: "16px 0", borderRadius: 12 },
  sendHint: { color: sub, fontSize: 11.5, textAlign: "center", marginTop: 10, marginBottom: 0, lineHeight: 1.5 },
  disabled: { opacity: 0.4, cursor: "not-allowed" },

  overlay: { position: "fixed", inset: 0, background: "rgba(5,8,12,.7)", display: "grid", placeItems: "center", zIndex: 50, padding: 20 },
  modal: { background: panel, border: `1px solid ${line}`, borderRadius: 18, padding: 22, width: "100%", maxWidth: 380 },
  modalTitle: { fontFamily: "Fraunces, serif", fontSize: 22, margin: "0 0 2px" },
  modalSub: { color: sub, fontSize: 13.5, margin: "0 0 14px" },
  optList: { display: "flex", flexDirection: "column", gap: 8 },
  optRow: { display: "flex", alignItems: "center", gap: 12, background: panel2, border: `1px solid ${line}`, borderRadius: 12, padding: "14px 16px", color: txt, fontSize: 16, fontWeight: 600 },
  optRowActive: { borderColor: amber, background: "#241f15" },
  checkbox: { width: 24, height: 24, borderRadius: 7, border: `2px solid ${sub}`, display: "grid", placeItems: "center", fontSize: 14, fontWeight: 900, color: ink, flexShrink: 0 },
  checkboxOn: { background: amber, borderColor: amber },
  modalBtns: { display: "flex", gap: 10, marginTop: 18 },
  modalGhost: { flex: 1, background: panel2, border: `1px solid ${line}`, color: txt, borderRadius: 12, padding: "13px 0", fontWeight: 600 },
  modalPrimary: { flex: 1, background: amber, color: ink, borderRadius: 12, padding: "13px 0", fontWeight: 800 },

  billHead: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  billLayout: { display: "grid", gridTemplateColumns: "1fr 320px", gap: 18, alignItems: "start" },
  billItems: { background: panel, border: `1px solid ${line}`, borderRadius: 16, padding: 16 },
  modeBar: { display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" },
  modeBtn: { background: panel2, border: `1px solid ${line}`, color: sub, borderRadius: 999, padding: "8px 16px", fontSize: 14, fontWeight: 600 },
  modeActive: { background: amber, color: ink, borderColor: amber },
  itemList: { display: "flex", flexDirection: "column", gap: 6 },
  groupRow: { display: "flex", alignItems: "center", gap: 12, padding: "12px 8px", borderBottom: `1px solid ${line}` },
  gQty: { fontWeight: 800, color: amber, minWidth: 32 },
  billItemRow: { display: "flex", alignItems: "center", gap: 12, padding: "12px 10px", background: panel2, border: `1px solid ${line}`, borderRadius: 10, color: txt, textAlign: "left" },
  billItemPicked: { borderColor: amber, background: "#241f15" },
  biName: { flex: 1, fontSize: 15, fontWeight: 500 },
  biOpts: { color: "#d8694a", fontStyle: "normal", fontSize: 13 },
  biPrice: { fontWeight: 700 },

  billSummary: { background: panel, border: `1px solid ${line}`, borderRadius: 16, padding: 18, position: "sticky", top: 76 },
  sumRow: { display: "flex", justifyContent: "space-between", fontSize: 15, marginBottom: 10 },
  payBtn: { width: "100%", background: green, color: "#06281c", fontWeight: 800, fontSize: 16, padding: "15px 0", borderRadius: 12, marginTop: 6 },
  splitHint: { color: sub, fontSize: 12, marginTop: 10, lineHeight: 1.5 },
  stepperRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  evenBig: { fontSize: 30, fontFamily: "Fraunces, serif", fontWeight: 700, color: amber, marginBottom: 12 },
  evenSmall: { fontSize: 14, color: sub, fontFamily: "Inter", fontWeight: 500 },
  history: { marginTop: 18, borderTop: `1px solid ${line}`, paddingTop: 12 },
  historyTitle: { fontSize: 12.5, color: sub, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".05em" },
  historyRow: { display: "flex", justifyContent: "space-between", fontSize: 13.5, padding: "4px 0", color: sub },

  paidBox: { background: panel, border: `1px solid ${line}`, borderRadius: 16, padding: 40, textAlign: "center", color: sub, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 },
  paidIcon: { width: 56, height: 56, borderRadius: "50%", background: green, color: "#06281c", display: "grid", placeItems: "center", fontSize: 30, fontWeight: 900 },

  displayBody: { flex: 1, padding: 20, display: "flex", flexDirection: "column" },
  emptyDisplay: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: sub, gap: 14, minHeight: 300 },
  emptyBig: { fontSize: 64, opacity: 0.6 },
  ticketGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16, alignContent: "start" },
  ticket: { background: panel, border: `1px solid ${line}`, borderTop: "4px solid", borderRadius: 14, padding: 16, display: "flex", flexDirection: "column", gap: 10 },
  ticketWork: { background: "#1f2630", boxShadow: `0 0 0 1px ${amber}55` },
  ticketHead: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  ticketTisch: { color: ink, fontWeight: 800, padding: "6px 14px", borderRadius: 8, fontSize: 16 },
  ticketAge: { fontSize: 12.5, color: sub },
  ticketMeta: { fontSize: 12.5, color: sub, marginTop: -4 },
  ticketLines: { display: "flex", flexDirection: "column", gap: 8, padding: "6px 0", borderTop: `1px solid ${line}`, borderBottom: `1px solid ${line}` },
  ticketLine: { display: "flex", gap: 10, alignItems: "flex-start" },
  tlQty: { fontWeight: 800, fontSize: 18, color: amber, minWidth: 32 },
  tlName: { fontSize: 16, fontWeight: 600, lineHeight: 1.3 },
  tlSize: { fontSize: 13, color: sub, fontWeight: 400 },
  tlOpts: { fontSize: 13, color: "#d8694a", fontWeight: 600, marginTop: 2 },
  ticketBtns: { display: "flex", gap: 8 },
  tBtn: { flex: 1, padding: "12px 0", borderRadius: 10, fontWeight: 700, fontSize: 14 },
  tBtnStart: { background: panel2, border: `1px solid ${line}`, color: txt },
  tBtnStartActive: { background: amber, color: ink },
  tBtnDone: { background: green, color: "#06281c" },
  doneStrip: { marginTop: 20, paddingTop: 14, borderTop: `1px solid ${line}`, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  doneLabel: { fontSize: 13, color: sub },
  donePill: { background: panel2, border: `1px solid ${line}`, borderRadius: 999, padding: "5px 12px", fontSize: 13, color: sub },

  /* Bezahl-Pad */
  payDueRow: { display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "10px 0 4px" },
  payDue: { fontSize: 22, fontFamily: "Fraunces, serif", color: txt },
  payField: { display: "flex", justifyContent: "space-between", alignItems: "center", background: panel2, border: `1px solid ${line}`, borderRadius: 12, padding: "14px 16px", marginTop: 8 },
  payFieldLabel: { color: sub, fontSize: 14 },
  payFieldValue: { fontSize: 24, fontWeight: 800, color: amber },
  quickRow: { display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" },
  quickBtn: { flex: 1, minWidth: 72, background: panel2, border: `1px solid ${line}`, color: txt, borderRadius: 10, padding: "11px 0", fontSize: 14, fontWeight: 700 },
  quickExact: { borderColor: amber, color: amber },
  payGrid: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 9, marginTop: 12 },
  payKey: { background: panel2, border: `1px solid ${line}`, borderRadius: 12, padding: "16px 0", fontSize: 22, fontWeight: 600, color: txt },
  changeBox: { display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: 12, padding: "14px 16px", marginTop: 14 },
  changeWait: { background: panel2, border: `1px solid ${line}`, color: sub },
  changeOk: { background: "#13301f", border: `1px solid ${green}`, color: green },
  changeBig: { fontSize: 24, fontFamily: "Fraunces, serif" },

  /* Admin */
  exportBtn: { background: green, color: "#06281c", fontWeight: 800, fontSize: 14, padding: "10px 16px", borderRadius: 10 },
  adminBody: { padding: 20, maxWidth: 1240, margin: "0 auto", width: "100%" },
  kpiRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 14 },
  kpi: { background: panel, border: `1px solid ${line}`, borderRadius: 14, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 4 },
  kpiValue: { fontSize: 24, fontWeight: 800, fontFamily: "Fraunces, serif", color: amber },
  kpiLabel: { fontSize: 12.5, color: sub, textTransform: "uppercase", letterSpacing: ".05em" },
  exportMsg: { background: panel2, border: `1px solid ${line}`, borderRadius: 10, padding: "10px 14px", fontSize: 13.5, color: sub, marginBottom: 14 },
  adminGrid: { display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18, alignItems: "start" },
  adminCard: { background: panel, border: `1px solid ${line}`, borderRadius: 16, padding: 18 },
  adminCardHead: { display: "flex", flexDirection: "column", gap: 12, marginBottom: 12 },
  adminH3: { fontFamily: "Fraunces, serif", fontSize: 19, margin: 0 },
  sortBar: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
  sortLabel: { fontSize: 13, color: sub },
  sortChip: { background: panel2, border: `1px solid ${line}`, color: sub, borderRadius: 999, padding: "7px 14px", fontSize: 13.5, fontWeight: 600 },
  sortChipOn: { background: amber, color: ink, borderColor: amber },
  tableScroll: { overflowX: "auto", maxHeight: 460, overflowY: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: { textAlign: "left", padding: "8px 10px", color: sub, fontSize: 12, textTransform: "uppercase", letterSpacing: ".04em", borderBottom: `1px solid ${line}`, position: "sticky", top: 0, background: panel },
  tr: { borderBottom: `1px solid ${line}` },
  td: { padding: "10px 10px" },
  tischChip: { display: "inline-grid", placeItems: "center", minWidth: 26, height: 26, padding: "0 6px", background: panel2, border: `1px solid ${line}`, borderRadius: 7, fontWeight: 700, fontSize: 13 },
  rankList: { display: "flex", flexDirection: "column", gap: 12 },
  rankRow: { display: "flex", gap: 12, alignItems: "flex-start" },
  rankNo: { fontFamily: "Fraunces, serif", fontWeight: 700, color: sub, minWidth: 22, fontSize: 16, paddingTop: 2 },
  rankMain: { flex: 1, minWidth: 0 },
  rankTop: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 },
  rankName: { fontSize: 14.5, fontWeight: 600 },
  rankQty: { fontSize: 15, fontWeight: 800, color: txt },
  rankBarTrack: { height: 8, background: panel2, borderRadius: 999, overflow: "hidden" },
  rankBarFill: { height: "100%", borderRadius: 999 },
  rankRev: { fontSize: 12.5, color: sub, marginTop: 4, display: "inline-block" },

  configWarn: { background: "#3a2a12", color: "#f0c674", borderBottom: "1px solid #5a4520", padding: "12px 16px", fontSize: 13.5, textAlign: "center", lineHeight: 1.5 },
};

