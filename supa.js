// ===== Auto Glow — Supabase client (shared by site + dashboard) =====
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const supa = createClient(
  "https://asgskarfxlgtbnwcukyr.supabase.co",
  "sb_publishable_k6o1HBBMaoGk0s2_z8q-yw_FqSQVjRn",
  { auth: { detectSessionInUrl: true, flowType: "implicit" } }
);

export const fmtWhen = (b) => {
  const d = new Date(b.date + "T00:00:00");
  return `${d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} · ${b.time}`;
};

export const isUpcoming = (b) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(b.date + "T00:00:00") >= today && b.status !== "completed" && b.status !== "cancelled";
};

export const STATUS_LABEL = {
  requested: "Requested",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};
