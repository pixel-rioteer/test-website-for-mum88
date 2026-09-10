import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://qcgygucxfekeynwbbwxm.supabase.co";
const SUPABASE_KEY = "sb_publishable_frJkFVnpcJ04n4mkHt4BCQ_d3dCB04n";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Fixed daily appointment slots (see supabase-schema.sql to change these).
const DAY_SLOTS = ["09:00", "10:30", "12:00", "13:30", "15:00", "16:30"];

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

// ---------- state ----------
let treatments = [];
let selectedTreatment = null;
let selectedDate = null;   // "YYYY-MM-DD"
let selectedTime = null;   // "HH:MM"
let reservedTimes = [];    // times already booked on selectedDate
let calMonth = new Date();
calMonth.setDate(1);

// ---------- element refs ----------
const loadingNote = document.getElementById("loadingNote");
const comboWrap = document.getElementById("treatmentCombo");
const comboInput = document.getElementById("comboInput");
const comboPanel = document.getElementById("comboPanel");
const comboSelectedTag = document.getElementById("comboSelectedTag");
const comboSelectedLabel = document.getElementById("comboSelectedLabel");
const comboClear = document.getElementById("comboClear");

const dateTimeShell = document.getElementById("dateTimeShell");
const calWrap = document.getElementById("calWrap");
const calGrid = document.getElementById("calGrid");
const calMonthLabel = document.getElementById("calMonthLabel");
const calPrev = document.getElementById("calPrev");
const calNext = document.getElementById("calNext");
const timeWrap = document.getElementById("timeWrap");
const timeGrid = document.getElementById("timeGrid");
const timeDateLabel = document.getElementById("timeDateLabel");
const backToCalendar = document.getElementById("backToCalendar");
const dateTimeChosen = document.getElementById("dateTimeChosen");
const dateTimeChosenLabel = document.getElementById("dateTimeChosenLabel");
const dateTimeChange = document.getElementById("dateTimeChange");

const form = document.getElementById("bookingForm");
const formMsg = document.getElementById("formMsg");
const submitBtn = document.getElementById("submitBtn");
const summaryEl = document.getElementById("summaryBody");

// ---------- helpers ----------
function formatPrice(pence) {
  return `£${(pence / 100).toFixed(pence % 100 === 0 ? 0 : 2)}`;
}
function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function friendlyDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}
function friendlyTime(t) {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}${period}` : `${h12}:${String(m).padStart(2, "0")}${period}`;
}

function updateSubmitState() {
  submitBtn.disabled = !(selectedTreatment && selectedDate && selectedTime);
}

function renderSummary() {
  if (!selectedTreatment && !selectedDate) {
    summaryEl.innerHTML = `<p class="empty">Choose a treatment, date and time to see a summary here.</p>`;
    return;
  }
  const rows = [];
  if (selectedTreatment) {
    rows.push(`<div class="line"><span>${selectedTreatment.name}</span><span>${formatPrice(selectedTreatment.price_pence)}</span></div>`);
    rows.push(`<div class="line"><span>Duration</span><span>${selectedTreatment.duration_minutes} min</span></div>`);
  }
  if (selectedDate) {
    rows.push(`<div class="line"><span>Date</span><span>${friendlyDate(selectedDate)}</span></div>`);
  }
  if (selectedTime) {
    rows.push(`<div class="line"><span>Time</span><span>${friendlyTime(selectedTime)}</span></div>`);
  }
  const total = selectedTreatment ? `<div class="total">${formatPrice(selectedTreatment.price_pence)}</div>` : "";
  summaryEl.innerHTML = rows.join("") + total +
    `<p style="margin-top:12px;font-size:.82rem;opacity:.85;">Payment is taken in person — this only reserves your request.</p>`;
}

// ================= Treatment combobox =================
function optionRow(t) {
  const unavailable = t.is_available === false;
  const el = document.createElement("div");
  el.className = "combo-option" + (unavailable ? " unavailable" : "");
  el.innerHTML = `
    <div>
      <div class="t-name">${t.name}</div>
      <div class="t-meta">${t.duration_minutes} minutes</div>
    </div>
    ${unavailable ? `<span class="badge-unavailable">Currently unavailable</span>` : `<span class="t-price">${formatPrice(t.price_pence)}</span>`}
  `;
  if (!unavailable) {
    el.addEventListener("click", () => {
      selectedTreatment = t;
      comboInput.value = "";
      comboWrap.classList.remove("open");
      comboPanel.classList.remove("open");
      comboSelectedLabel.textContent = `${t.name} — ${formatPrice(t.price_pence)}`;
      comboSelectedTag.classList.add("show");
      comboInput.style.display = "none";
      updateSubmitState();
      renderSummary();
    });
  }
  return el;
}

function renderComboPanel(filterText) {
  comboPanel.innerHTML = "";
  const q = filterText.trim().toLowerCase();
  const matches = treatments.filter(t => t.name.toLowerCase().includes(q));
  if (!matches.length) {
    comboPanel.innerHTML = `<div class="combo-empty">No treatments match “${filterText}”.</div>`;
  } else {
    matches.forEach(t => comboPanel.appendChild(optionRow(t)));
  }
  comboPanel.classList.add("open");
}

comboInput.addEventListener("focus", () => renderComboPanel(comboInput.value));
comboInput.addEventListener("input", () => renderComboPanel(comboInput.value));
document.addEventListener("click", (e) => {
  if (!comboWrap.contains(e.target)) comboPanel.classList.remove("open");
});
comboClear.addEventListener("click", () => {
  selectedTreatment = null;
  comboSelectedTag.classList.remove("show");
  comboInput.style.display = "";
  comboInput.value = "";
  comboInput.focus();
  updateSubmitState();
  renderSummary();
});

// ================= Calendar =================
function buildCalendar() {
  calMonthLabel.textContent = calMonth.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  calGrid.innerHTML = "";

  const year = calMonth.getFullYear();
  const month = calMonth.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today); maxDate.setDate(maxDate.getDate() + 90);

  for (let i = 0; i < firstDow; i++) {
    const filler = document.createElement("div");
    filler.className = "cal-day is-empty";
    calGrid.appendChild(filler);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const cell = document.createElement("div");
    cell.className = "cal-day";
    cell.textContent = String(day);

    const disabled = d < today || d > maxDate;
    if (disabled) cell.classList.add("is-disabled");
    if (isoDate(d) === isoDate(today)) cell.classList.add("is-today");

    if (!disabled) {
      cell.addEventListener("click", () => zoomIntoDay(cell, isoDate(d)));
    }
    calGrid.appendChild(cell);
  }
}

function zoomIntoDay(cell, iso) {
  // fade every other day, zoom the chosen one, then reveal the time step
  const allDays = calGrid.querySelectorAll(".cal-day:not(.is-empty)");
  allDays.forEach(d => { if (d !== cell) d.classList.add("is-fading"); });
  cell.classList.add("is-zooming");

  window.setTimeout(async () => {
    selectedDate = iso;
    await showTimeStep(iso);
  }, 420);
}

calPrev.addEventListener("click", () => {
  calMonth.setMonth(calMonth.getMonth() - 1);
  buildCalendar();
});
calNext.addEventListener("click", () => {
  calMonth.setMonth(calMonth.getMonth() + 1);
  buildCalendar();
});

// ================= Time slots =================
async function fetchReservedTimes(iso) {
  try {
    const { data, error } = await supabase
      .from("booked_times")
      .select("preferred_time")
      .eq("preferred_date", iso);
    if (error) throw error;
    return (data || []).map(r => r.preferred_time).filter(Boolean);
  } catch (err) {
    console.warn("no.88: could not check reserved times (table may not exist yet) — showing all times as open.", err);
    return [];
  }
}

async function showTimeStep(iso) {
  timeDateLabel.textContent = friendlyDate(iso);
  timeGrid.innerHTML = `<p class="loading-note">Checking availability…</p>`;
  calWrap.style.opacity = "0";
  timeWrap.classList.add("show");

  reservedTimes = await fetchReservedTimes(iso);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const isToday = iso === isoDate(today);
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

  timeGrid.innerHTML = "";
  DAY_SLOTS.forEach(t => {
    const [h, m] = t.split(":").map(Number);
    const past = isToday && (h * 60 + m) < nowMinutes;
    const reserved = reservedTimes.includes(t) || past;

    const btn = document.createElement("div");
    btn.className = "time-slot" + (reserved ? " is-reserved" : "");
    btn.textContent = friendlyTime(t);
    if (!reserved) {
      btn.addEventListener("click", () => {
        selectedTime = t;
        timeGrid.querySelectorAll(".time-slot").forEach(el => el.classList.remove("selected"));
        btn.classList.add("selected");
        finishDateTimeChoice();
      });
    }
    timeGrid.appendChild(btn);
  });
}

function finishDateTimeChoice() {
  dateTimeChosenLabel.textContent = `${friendlyDate(selectedDate)} at ${friendlyTime(selectedTime)}`;
  dateTimeChosen.classList.add("show");
  dateTimeShell.style.display = "none";
  updateSubmitState();
  renderSummary();
}

backToCalendar.addEventListener("click", resetToCalendar);
dateTimeChange.addEventListener("click", () => {
  dateTimeShell.style.display = "";
  dateTimeChosen.classList.remove("show");
  resetToCalendar();
});

function resetToCalendar() {
  selectedDate = null;
  selectedTime = null;
  timeWrap.classList.remove("show");
  calWrap.style.opacity = "1";
  calGrid.querySelectorAll(".cal-day").forEach(d => {
    d.classList.remove("is-fading", "is-zooming");
  });
  updateSubmitState();
  renderSummary();
}

// ================= Load treatments =================
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
  comboWrap.hidden = false;
  buildCalendar();
}

// ================= Submit =================
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!selectedTreatment || !selectedDate || !selectedTime) return;

  const fd = new FormData(form);
  const payload = {
    treatment_id: String(selectedTreatment.id).startsWith("fallback-") ? null : selectedTreatment.id,
    treatment_name: selectedTreatment.name,
    full_name: fd.get("full_name").trim(),
    email: fd.get("email").trim(),
    phone: fd.get("phone").trim(),
    preferred_date: selectedDate,
    preferred_time: selectedTime,
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

    selectedTreatment = null;
    comboSelectedTag.classList.remove("show");
    comboInput.style.display = "";
    dateTimeChosen.classList.remove("show");
    dateTimeShell.style.display = "";
    resetToCalendar();
    renderSummary();
  } catch (err) {
    console.error(err);
    formMsg.textContent = "Something went wrong sending your request — please call or email directly, or try again in a moment.";
    formMsg.classList.add("show", "err");
    updateSubmitState();
  } finally {
    submitBtn.textContent = "Request booking";
  }
});

loadTreatments();
