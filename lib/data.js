"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase, hasSupabase } from "./supabase";

/* ============================================================================
   Datenzugriffsschicht für Schankwirt.
   Kapselt alle Supabase-Zugriffe + Realtime, damit die UI-Komponenten
   weiterhin mit denselben Datenformen arbeiten wie in der lokalen Demo.
   ============================================================================ */

/* ---------- Bedienungen laden (für Login) ---------- */
export function useStaff() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("staff")
        .select("id,name,pin")
        .eq("aktiv", true)
        .order("sort");
      if (active) {
        if (!error && data) setStaff(data);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);
  return { staff, loading };
}

/* ---------- Offene Posten pro Tisch (Bedienung) ----------
   Liefert dieselbe Form wie die Demo: db[tisch] = { items:[...], bills:[...] }
   items = offene order_items, bills = payments dieses Tischs.            */
export function useTables() {
  const [db, setDb] = useState({});

  const reload = useCallback(async () => {
    const [{ data: items }, { data: pays }] = await Promise.all([
      supabase.from("order_items").select("*").eq("paid", false),
      supabase.from("payments").select("*").order("created_at", { ascending: false }),
    ]);
    const next = {};
    (items || []).forEach((it) => {
      if (!next[it.tisch]) next[it.tisch] = { items: [], bills: [] };
      next[it.tisch].items.push({
        id: it.id, refId: it.ref_id, kind: it.kind, name: it.name,
        size: it.size, price: Number(it.price), options: it.options || [],
        qty: 1, paid: it.paid, ts: new Date(it.created_at).getTime(),
      });
    });
    (pays || []).forEach((p) => {
      if (!next[p.tisch]) next[p.tisch] = { items: [], bills: [] };
      next[p.tisch].bills.push({
        id: p.id, label: p.label, amount: Number(p.amount),
        ts: new Date(p.created_at).getTime(),
      });
    });
    setDb(next);
  }, []);

  useEffect(() => {
    reload();
    // Realtime: jede Änderung an order_items/payments neu laden (einfach & robust).
    const ch = supabase
      .channel("tables")
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, reload)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [reload]);

  return { db };
}

/* ---------- Tickets für Theke/Küche (Display) ----------
   Baut aus orders + offenen, noch nicht fertigen order_items des passenden
   kind die Ticket-Form der Demo nach: ein Ticket pro Bestellung.         */
export function useTickets(kind) {
  const [tickets, setTickets] = useState([]);

  const reload = useCallback(async () => {
    // nur Posten dieser Station, die noch nicht "fertig" sind
    const { data: items } = await supabase
      .from("order_items")
      .select("*")
      .eq("kind", kind)
      .neq("station_status", "fertig")
      .order("created_at", { ascending: true });
    if (!items) return;

    const orderIds = [...new Set(items.map((i) => i.order_id))];
    let orders = [];
    if (orderIds.length) {
      const { data } = await supabase
        .from("orders").select("*").in("id", orderIds);
      orders = data || [];
    }
    const orderMap = Object.fromEntries(orders.map((o) => [o.id, o]));

    // pro order_id ein Ticket; Status = schlechtester (neu < arbeit) der Posten
    const byOrder = {};
    items.forEach((it) => {
      if (!byOrder[it.order_id]) {
        const o = orderMap[it.order_id] || {};
        byOrder[it.order_id] = {
          id: it.order_id, tisch: it.tisch, station: kind === "drink" ? "theke" : "kueche",
          bedienung: o.staff_name || "—", ts: new Date(o.created_at || it.created_at).getTime(),
          status: "arbeit", _statuses: [], lines: [],
        };
      }
      byOrder[it.order_id]._statuses.push(it.station_status);
      byOrder[it.order_id].lines.push({
        name: it.name, qty: 1, size: it.size, options: it.options || [],
      });
    });
    // gleiche Posten zusammenfassen (qty) + Status ableiten
    const result = Object.values(byOrder).map((t) => {
      const merged = {};
      t.lines.forEach((l) => {
        const key = l.name + "|" + (l.options || []).join(",");
        if (!merged[key]) merged[key] = { ...l, qty: 0 };
        merged[key].qty += 1;
      });
      const status = t._statuses.some((s) => s === "neu") ? "neu" : "arbeit";
      return { ...t, status, lines: Object.values(merged) };
    });
    setTickets(result);
  }, [kind]);

  useEffect(() => {
    reload();
    const ch = supabase
      .channel("tickets-" + kind)
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, reload)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [reload, kind]);

  // Status eines ganzen Bons setzen (alle Posten der Bestellung dieser Station)
  const setTicketStatus = useCallback(async (orderId, status) => {
    await supabase
      .from("order_items")
      .update({ station_status: status })
      .eq("order_id", orderId)
      .eq("kind", kind);
    reload();
  }, [kind, reload]);

  return { tickets, setTicketStatus };
}

/* ---------- Alle Buchungen (Admin) ---------- */
export function usePayments() {
  const [payments, setPayments] = useState([]);
  const reload = useCallback(async () => {
    const { data } = await supabase
      .from("payments").select("*").order("created_at", { ascending: false });
    setPayments(
      (data || []).map((p) => ({
        id: p.id, tisch: p.tisch, bedienung: p.staff_name, label: p.label,
        amount: Number(p.amount), received: Number(p.received), change: Number(p.change),
        ts: new Date(p.created_at).getTime(), items: p.items || [],
      }))
    );
  }, []);
  useEffect(() => {
    reload();
    const ch = supabase
      .channel("payments")
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, reload)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [reload]);
  return { payments };
}

/* ============================================================================
   Mutationen
   ============================================================================ */

/* Bestellung abschicken: eine orders-Zeile + N order_items.
   cart: [{ item:{id,kind,name,size,price}, qty, options:[] }]            */
export async function submitOrder({ tisch, user, cart }) {
  const { data: order, error } = await supabase
    .from("orders")
    .insert({ tisch, staff_id: user.id, staff_name: user.name })
    .select()
    .single();
  if (error || !order) throw error || new Error("Bestellung fehlgeschlagen");

  const rows = [];
  cart.forEach((l) => {
    for (let k = 0; k < l.qty; k++) {
      rows.push({
        order_id: order.id, tisch, ref_id: l.item.id, name: l.item.name,
        kind: l.item.kind, size: l.item.size || null, price: l.item.price,
        options: l.options || [],
      });
    }
  });
  const { error: e2 } = await supabase.from("order_items").insert(rows);
  if (e2) throw e2;
  return order;
}

/* Kassieren: markiert die übergebenen order_items als bezahlt und schreibt
   eine payments-Zeile (mit received/change + Einzelposten für den Export). */
export async function settlePayment({ tisch, user, itemIds, items, amount, label, received }) {
  const { error: e1 } = await supabase
    .from("order_items").update({ paid: true }).in("id", itemIds);
  if (e1) throw e1;

  const { error: e2 } = await supabase.from("payments").insert({
    tisch,
    staff_name: user?.name || "—",
    label,
    amount,
    received,
    change: received - amount,
    items: items.map((i) => ({
      name: i.name, kind: i.kind, price: i.price, options: i.options || [],
    })),
  });
  if (e2) throw e2;
}

export { hasSupabase };
