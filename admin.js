import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://qcgygucxfekeynwbbwxm.supabase.co";
const SUPABASE_KEY = "sb_publishable_frJkFVnpcJ04n4mkHt4BCQ_d3dCB04n";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ---------- element refs ----------
const loginSection = document.getElementById("loginSection");
const dashboardSection = document.getElementById("dashboardSection");
const loginForm = document.getElementById("loginForm");
const loginMsg = document.getElementById("loginMsg");
const logoutBtn = document.getElementById("logoutBtn");

const tabs = document.querySelectorAll(".admin-tab");
const panels = {
  bookings: document.getElementById("panel-bookings"),
  treatments: document.getElementById("panel-treatments"),
};

const bookingsLoading = document.getElementById("bookingsLoading");
const bookingsList = document.getElementById("bookingsList");
const bookingFilters = document.getElementById("bookingFilters");
const showAddBooking = document.getElementById("showAddBooking");
const addBookingForm = document.getElementById("addBookingForm");
const cancelAddBooking = document.getElementById("cancelAddBooking");
const addBookingMsg = document.getElementById("addBookingMsg");
const abTreatment = document.getElementById("ab_treatment");

const treatmentsLoading = document.getElementById("treatmentsLoading");
const treatmentsList = document.getElementById("treatmentsList");
const showAddTreatment = document.getElementById("showAddTreatment");
const addTreatmentForm = document.getElementById("addTreatmentForm");
const cancelAddTreatment = document.getElementById("cancelAddTreatment");
const addTreatmentMsg = document.getElementById("addTreatmentMsg");

let allBookings = [];
let allTreatments = [];
let activeFilter = "all";

// ================= Auth =================
supabase.auth.onAuthStateChange((_event, session) => {
  if (session) {
    loginSection.hidden = true;
    dashboardSection.hidden = false;
    logoutBtn.hidden = false;
    loadBookings();
    loadTreatments();
  } else {
    loginSection.hidden = false;
    dashboardSection.hidden = true;
    logoutBtn.hidden = true;
  }
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginMsg.className = "form-msg";
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    loginMsg.textContent = "Couldn't sign in — check your email and password.";
    loginMsg.classList.add("show", "err");
  }
});

logoutBtn.addEventListener("click", () => supabase.auth.signOut());

// ================= Tabs =================
tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    tabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    Object.entries(panels).forEach(([name, el]) => { el.hidden = name !== tab.dataset.tab; });
  });
});

// ================= Helpers =================
function formatPrice(pence) {
  return `£${(pence / 100).toFixed(pence % 100 === 0 ? 0 : 2)}`;
}
function friendlyDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}
function friendlyTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m ? `${h12}:${String(m).padStart(2, "0")}${period}` : `${h12}${period}`;
}

// ================= Bookings =================
async function loadBookings() {
  bookingsLoading.hidden = false;
  bookingsList.innerHTML = "";
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .order("preferred_date", { ascending: true })
    .order("preferred_time", { ascending: true });

  bookingsLoading.hidden = true;

  if (error) {
    bookingsList.innerHTML = `<p class="loading-note">Couldn't load bookings: ${error.message}</p>`;
    return;
  }
  allBookings = data || [];
  renderBookings();
}

function renderBookings() {
  const filtered = activeFilter === "all" ? allBookings : allBookings.filter(b => b.status === activeFilter);
  bookingsList.innerHTML = "";

  if (!filtered.length) {
    bookingsList.innerHTML = `<p class="loading-note">No bookings here yet.</p>`;
    return;
  }

  filtered.forEach(b => {
    const card = document.createElement("div");
    card.className = "admin-card";
    card.innerHTML = `
      <div class="admin-card-main">
        <div class="admin-card-top">
          <span class="t-name">${b.treatment_name}</span>
          <span class="status-badge status-${b.status}">${b.status}</span>
        </div>
        <div class="admin-card-meta">${friendlyDate(b.preferred_date)} · ${friendlyTime(b.preferred_time)}</div>
        <div class="admin-card-meta">${b.full_name} · ${b.email} · ${b.phone}</div>
        ${b.notes ? `<div class="admin-card-notes">${b.notes}</div>` : ""}
      </div>
      <div class="admin-card-actions"></div>
    `;
    const actions = card.querySelector(".admin-card-actions");

    if (b.status === "pending") {
      const accept = document.createElement("button");
      accept.className = "btn btn-primary btn-sm";
      accept.textContent = "Accept";
      accept.addEventListener("click", () => updateBookingStatus(b.id, "confirmed"));

      const decline = document.createElement("button");
      decline.className = "btn btn-ghost btn-sm";
      decline.textContent = "Decline";
      decline.addEventListener("click", () => updateBookingStatus(b.id, "cancelled"));

      actions.append(accept, decline);
    } else {
      const revert = document.createElement("button");
      revert.className = "btn btn-ghost btn-sm";
      revert.textContent = "Mark pending";
      revert.addEventListener("click", () => updateBookingStatus(b.id, "pending"));
      actions.append(revert);
    }

    const del = document.createElement("button");
    del.className = "btn btn-ghost btn-sm";
    del.textContent = "Delete";
    del.addEventListener("click", () => deleteBooking(b.id));
    actions.append(del);

    bookingsList.appendChild(card);
  });
}

async function updateBookingStatus(id, status) {
  const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
  if (error) { alert("Couldn't update booking: " + error.message); return; }
  await loadBookings();
}

async function deleteBooking(id) {
  if (!confirm("Delete this booking? This can't be undone.")) return;
  const { error } = await supabase.from("bookings").delete().eq("id", id);
  if (error) { alert("Couldn't delete booking: " + error.message); return; }
  await loadBookings();
}

bookingFilters.addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  bookingFilters.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
  chip.classList.add("active");
  activeFilter = chip.dataset.filter;
  renderBookings();
});

// ---- add booking form ----
showAddBooking.addEventListener("click", () => {
  abTreatment.innerHTML = allTreatments
    .map(t => `<option value="${t.id}">${t.name} — ${formatPrice(t.price_pence)}</option>`)
    .join("");
  addBookingForm.hidden = false;
  addBookingForm.scrollIntoView({ behavior: "smooth", block: "nearest" });
});
cancelAddBooking.addEventListener("click", () => { addBookingForm.hidden = true; addBookingForm.reset(); });

addBookingForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  addBookingMsg.className = "form-msg";
  const treatment = allTreatments.find(t => t.id === abTreatment.value);
  const payload = {
    treatment_id: abTreatment.value,
    treatment_name: treatment ? treatment.name : "",
    full_name: document.getElementById("ab_name").value.trim(),
    email: document.getElementById("ab_email").value.trim(),
    phone: document.getElementById("ab_phone").value.trim(),
    preferred_date: document.getElementById("ab_date").value,
    preferred_time: document.getElementById("ab_time").value,
    notes: document.getElementById("ab_notes").value || null,
    status: "confirmed",
  };
  const { error } = await supabase.from("bookings").insert(payload);
  if (error) {
    addBookingMsg.textContent = "Couldn't save booking: " + error.message;
    addBookingMsg.classList.add("show", "err");
    return;
  }
  addBookingForm.hidden = true;
  addBookingForm.reset();
  await loadBookings();
});

// ================= Treatments =================
async function loadTreatments() {
  treatmentsLoading.hidden = false;
  treatmentsList.innerHTML = "";
  const { data, error } = await supabase.from("treatments").select("*").order("sort_order", { ascending: true });
  treatmentsLoading.hidden = true;

  if (error) {
    treatmentsList.innerHTML = `<p class="loading-note">Couldn't load treatments: ${error.message}</p>`;
    return;
  }
  allTreatments = data || [];
  renderTreatments();
}

function renderTreatments() {
  treatmentsList.innerHTML = "";
  if (!allTreatments.length) {
    treatmentsList.innerHTML = `<p class="loading-note">No treatments yet — add your first one above.</p>`;
    return;
  }

  allTreatments.forEach(t => {
    const card = document.createElement("div");
    card.className = "admin-card";
    card.innerHTML = `
      <div class="admin-card-main">
        <div class="admin-card-top">
          <span class="t-name">${t.name}</span>
          <span class="t-price">${formatPrice(t.price_pence)}</span>
        </div>
        <div class="admin-card-meta">${t.category} · ${t.duration_minutes} minutes</div>
      </div>
      <div class="admin-card-actions">
        <label class="avail-toggle">
          <input type="checkbox" ${t.is_available ? "checked" : ""}>
          Available
        </label>
      </div>
    `;
    card.querySelector("input[type=checkbox]").addEventListener("change", (e) => toggleAvailability(t.id, e.target.checked));

    const del = document.createElement("button");
    del.className = "btn btn-ghost btn-sm";
    del.textContent = "Delete";
    del.addEventListener("click", () => deleteTreatment(t.id));
    card.querySelector(".admin-card-actions").appendChild(del);

    treatmentsList.appendChild(card);
  });
}

async function toggleAvailability(id, isAvailable) {
  const { error } = await supabase.from("treatments").update({ is_available: isAvailable }).eq("id", id);
  if (error) { alert("Couldn't update treatment: " + error.message); return; }
  await loadTreatments();
}

async function deleteTreatment(id) {
  if (!confirm("Delete this treatment? It will disappear from the booking page.")) return;
  const { error } = await supabase.from("treatments").delete().eq("id", id);
  if (error) { alert("Couldn't delete treatment: " + error.message); return; }
  await loadTreatments();
}

showAddTreatment.addEventListener("click", () => { addTreatmentForm.hidden = false; });
cancelAddTreatment.addEventListener("click", () => { addTreatmentForm.hidden = true; addTreatmentForm.reset(); });

addTreatmentForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  addTreatmentMsg.className = "form-msg";
  const payload = {
    name: document.getElementById("at_name").value.trim(),
    category: document.getElementById("at_category").value,
    duration_minutes: Number(document.getElementById("at_duration").value),
    price_pence: Math.round(Number(document.getElementById("at_price").value) * 100),
    description: document.getElementById("at_description").value || null,
    is_available: true,
    sort_order: allTreatments.length ? Math.max(...allTreatments.map(t => t.sort_order || 0)) + 10 : 10,
  };
  const { error } = await supabase.from("treatments").insert(payload);
  if (error) {
    addTreatmentMsg.textContent = "Couldn't save treatment: " + error.message;
    addTreatmentMsg.classList.add("show", "err");
    return;
  }
  addTreatmentForm.hidden = true;
  addTreatmentForm.reset();
  await loadTreatments();
});
