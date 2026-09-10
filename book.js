import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://qcgygucxfekeynwbbwxm.supabase.co";
const SUPABASE_KEY = "sb_publishable_frJkFVnpcJ04n4mkHt4BCQ_d3dCB04n";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Fallback menu, used only if the `treatments` table hasn't been created
// yet in Supabase (see supabase-schema.sql). Everything here is treated
// as available since we have no live availability data to grey out.
const FALLBACK_TREATMENTS = [
  { id: "fallback-1", name: "Signature Holistic Massage (60 min)", duration_minutes: 60, price_pence: 7500, is_available: true },
  { id: "fallback-2", name: "Signature Holistic Massage (90 min)", duration_minutes: 90, price_pence: 9800, is_available: true },
  { id: "fallback-3", name: "Hydrotherm Massage", duration_minutes: 60, price_pence: 8000, is_available: true },
  { id: "fallback-4", name: "Back, Neck & Shoulder Massage", duration_minutes: 60, price_pence: 7500, is_available: true },
  { id: "fallback-5", name: "Hot Stone Massage", duration_minutes: 90, price_pence: 11800, is_available: true },
  { id: "fallback-6", name: "Indian Head Massage", duration_minutes: 60, price_pence: 7500, is_available: true },
  { id: "fallback-7", name: "Manual Lymphatic Drainage", duration_minutes: 90, price_pence: 12000, is_available: true },
  { id: "fallback-8", name: "Pregnancy Massage", duration_minutes: 60, price_pence: 7500, is_available: true },
  { id: "fallback-9", name: "Signature Rose Facial", duration_minutes: 60, price_pence: 8800, is_available: true },
  { id: "fallback-10", name: "Face Lift Massage", duration_minutes: 75, price_pence: 9500, is_available: true },
];

const listEl = document.getElementById("treatmentList");
const loadingNote = document.getElementById("loadingNote");
const summaryEl = document.getElementById("summaryBody");
const form = document.getElementById("bookingForm");
const formMsg = document.getElementById("formMsg");
const submitBtn = document.getElementById("submitBtn");

let treatments = [];
let selectedId = null;

function formatPrice(pence) {
  return `£${(pence / 100).toFixed(pence % 100 === 0 ? 0 : 2)}`;
}

function renderTreatments() {
  listEl.innerHTML = "";
  treatments.forEach((t) => {
    const unavailable = t.is_available === false;
    const label = document.createElement("label");
    label.className = "treatment-option" + (unavailable ? " unavailable" : "") + (selectedId === t.id ? " selected" : "");

    label.innerHTML = `
      <input type="radio" name="treatment" value="${t.id}" ${unavailable ? "disabled" : ""}>
      <div class="row">
        <div>
          <div class="t-name">${t.name}</div>
          <div class="t-meta">${t.duration_minutes} minutes</div>
        </div>
        ${unavailable
          ? `<span class="badge-unavailable">Currently unavailable</span>`
          : `<span class="t-price">${formatPrice(t.price_pence)}</span>`
        }
      </div>
    `;

    if (!unavailable) {
      label.addEventListener("click", () => {
        selectedId = t.id;
        renderTreatments();
        renderSummary();
      });
    }

    listEl.appendChild(label);
  });
}

function renderSummary() {
  const selected = treatments.find((t) => t.id === selectedId);
  if (!selected) {
    summaryEl.innerHTML = `<p class="empty">Choose a treatment on the left to see a summary here.</p>`;
    submitBtn.disabled = true;
    return;
  }
  summaryEl.innerHTML = `
    <div class="line"><span>${selected.name}</span><span>${formatPrice(selected.price_pence)}</span></div>
    <div class="line"><span>Duration</span><span>${selected.duration_minutes} min</span></div>
    <div class="total">${formatPrice(selected.price_pence)}</div>
    <p style="margin-top:12px;font-size:.82rem;opacity:.85;">Payment is taken in person — this only reserves your request.</p>
  `;
  submitBtn.disabled = false;
}

async function loadTreatments() {
  try {
    const { data, error } = await supabase
      .from("treatments")
      .select("id, name, duration_minutes, price_pence, is_available")
      .order("sort_order", { ascending: true });

    if (error) throw error;

    treatments = (data && data.length ? data : FALLBACK_TREATMENTS);
    if (!data || !data.length) {
      console.info("no.88: `treatments` table is empty — showing fallback menu. Run supabase-schema.sql to load the real menu.");
    }
  } catch (err) {
    console.warn("no.88: could not reach Supabase `treatments` table, showing fallback menu.", err);
    treatments = FALLBACK_TREATMENTS;
  }

  loadingNote.remove();
  renderTreatments();
  renderSummary();
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!selectedId) return;

  const selected = treatments.find((t) => t.id === selectedId);
  const fd = new FormData(form);

  const payload = {
    treatment_id: selectedId.startsWith("fallback-") ? null : selectedId,
    treatment_name: selected.name,
    full_name: fd.get("full_name").trim(),
    email: fd.get("email").trim(),
    phone: fd.get("phone").trim(),
    preferred_date: fd.get("preferred_date"),
    preferred_time: fd.get("preferred_time") || null,
    notes: fd.get("notes") || null,
  };

  submitBtn.disabled = true;
  submitBtn.textContent = "Sending…";
  formMsg.className = "form-msg";

  try {
    const { error } = await supabase.from("bookings").insert(payload);
    if (error) throw error;

    formMsg.textContent = "Thank you — your booking request has been sent. I'll confirm your appointment by phone or email shortly.";
    formMsg.classList.add("show", "ok");
    form.reset();
    selectedId = null;
    renderTreatments();
    renderSummary();
  } catch (err) {
    console.error(err);
    formMsg.textContent = "Something went wrong sending your request — please call or email directly, or try again in a moment.";
    formMsg.classList.add("show", "err");
    submitBtn.disabled = false;
  } finally {
    submitBtn.textContent = "Request booking";
  }
});

loadTreatments();
