// ══════════════════════════════════════════════
//  CURRENCY SYSTEM
// ══════════════════════════════════════════════
const CURRENCIES = [
  { code: "INR", symbol: "₹", locale: "en-IN", name: "Indian Rupee", flag: "IN" },
  { code: "USD", symbol: "$", locale: "en-US", name: "US Dollar", flag: "US" },
  { code: "EUR", symbol: "€", locale: "de-DE", name: "Euro", flag: "EU" },
  { code: "GBP", symbol: "£", locale: "en-GB", name: "British Pound", flag: "GB" },
  { code: "JPY", symbol: "¥", locale: "ja-JP", name: "Japanese Yen", flag: "JP" },
  { code: "CNY", symbol: "¥", locale: "zh-CN", name: "Chinese Yuan", flag: "CN" },
  { code: "AUD", symbol: "A$", locale: "en-AU", name: "Australian Dollar", flag: "AU" },
  { code: "CAD", symbol: "C$", locale: "en-CA", name: "Canadian Dollar", flag: "CA" },
  { code: "CHF", symbol: "Fr", locale: "de-CH", name: "Swiss Franc", flag: "CH" },
  { code: "SGD", symbol: "S$", locale: "en-SG", name: "Singapore Dollar", flag: "SG" },
  { code: "AED", symbol: "د.إ", locale: "ar-AE", name: "UAE Dirham", flag: "AE" },
  { code: "SAR", symbol: "﷼", locale: "ar-SA", name: "Saudi Riyal", flag: "SA" },
  { code: "MYR", symbol: "RM", locale: "ms-MY", name: "Malaysian Ringgit", flag: "MY" },
  { code: "IDR", symbol: "Rp", locale: "id-ID", name: "Indonesian Rupiah", flag: "ID" },
  { code: "THB", symbol: "฿", locale: "th-TH", name: "Thai Baht", flag: "TH" },
  { code: "PHP", symbol: "₱", locale: "en-PH", name: "Philippine Peso", flag: "PH" },
  { code: "KRW", symbol: "₩", locale: "ko-KR", name: "South Korean Won", flag: "KR" },
  { code: "BRL", symbol: "R$", locale: "pt-BR", name: "Brazilian Real", flag: "BR" },
  { code: "MXN", symbol: "$", locale: "es-MX", name: "Mexican Peso", flag: "MX" },
  { code: "ZAR", symbol: "R", locale: "en-ZA", name: "South African Rand", flag: "ZA" },
  { code: "NGN", symbol: "₦", locale: "en-NG", name: "Nigerian Naira", flag: "NG" },
  { code: "EGP", symbol: "£", locale: "ar-EG", name: "Egyptian Pound", flag: "EG" },
  { code: "PKR", symbol: "₨", locale: "ur-PK", name: "Pakistani Rupee", flag: "PK" },
  { code: "BDT", symbol: "৳", locale: "bn-BD", name: "Bangladeshi Taka", flag: "BD" },
  { code: "NPR", symbol: "Rs", locale: "ne-NP", name: "Nepali Rupee", flag: "NP" },
  { code: "LKR", symbol: "Rs", locale: "si-LK", name: "Sri Lankan Rupee", flag: "LK" },
  { code: "SEK", symbol: "kr", locale: "sv-SE", name: "Swedish Krona", flag: "SE" },
  { code: "NOK", symbol: "kr", locale: "nb-NO", name: "Norwegian Krone", flag: "NO" },
  { code: "DKK", symbol: "kr", locale: "da-DK", name: "Danish Krone", flag: "DK" },
  { code: "NZD", symbol: "NZ$", locale: "en-NZ", name: "New Zealand Dollar", flag: "NZ" },
];

let activeCurrencyCode = localStorage.getItem("ft_currency") || "INR";
function getCurrency() {
  return CURRENCIES.find(c => c.code === activeCurrencyCode) || CURRENCIES[0];
}

function fmt(n) {
  const c = getCurrency();
  try {
    return new Intl.NumberFormat(c.locale, {
      style: "currency",
      currency: c.code,
      maximumFractionDigits: 0
    }).format(n);
  } catch {
    return `${c.symbol}${Math.round(n).toLocaleString()}`;
  }
}

// ══════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════
let transactions = loadStored("ft_transactions", []);
let budgets      = loadStored("ft_budgets", {});
let goals        = loadStored("ft_goals", []);
let bills        = loadStored("ft_bills", []);
let darkMode     = localStorage.getItem("ft_dark") === "true";
let currentChartType = "doughnut";
let currentTxType    = "expense"; // "expense" or "income"
let txFilterType     = "all";     // "all", "expense", or "income"

let chart;
let rLineChart, rDonutChart, rBarChart;

const CATEGORY_ICONS = {
  "Food & Dining": "food",
  "Transport": "transport",
  "Shopping": "shopping",
  "Entertainment": "entertainment",
  "Health": "health",
  "Bills & Utilities": "bills",
  "Education": "education",
  "Salary": "salary",
  "Freelance": "freelance",
  "Investment": "investment",
  "Other": "other"
};

const iconMarkup = (name, cls = "ui-icon") => `<svg class="${cls}" aria-hidden="true"><use href="#icon-${name}"></use></svg>`;
const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));
const getIcon = cat => iconMarkup(CATEGORY_ICONS[cat] || "other");
const EMOJI_REGEX = /(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|\uFE0F|\u200D)/gu;
const stripEmoji = text => String(text || "").replace(EMOJI_REGEX, "").replace(/\s{2,}/g, " ").trim();
const COLORS = ["#3f6b57", "#10b981", "#f43f5e", "#f59e0b", "#06b6d4", "#8b5cf6", "#ec4899", "#14b8a6", "#84cc16", "#fb923c"];

// ── Elements ──
const balanceEl       = document.getElementById("balance");
const incomeEl        = document.getElementById("income");
const expenseEl       = document.getElementById("expense");
const savingsEl       = document.getElementById("savingsRate");
const listEl          = document.getElementById("transactionList");
const form            = document.getElementById("transactionForm");
const themeToggle     = document.getElementById("themeToggle");
const searchInput     = document.getElementById("searchInput");
const monthFilter     = document.getElementById("monthFilter");
const balanceBar      = document.getElementById("balanceBar");
const budgetListEl    = document.getElementById("budgetList");
const emptyState      = document.getElementById("emptyState");
const noChartData     = document.getElementById("noChartData");
const toastEl         = document.getElementById("toast");
const brandIcon       = document.getElementById("brandIcon");
const amountPrefix    = document.getElementById("amountPrefix");
const headerFlag      = document.getElementById("headerCurrencyFlag");
const headerCode      = document.getElementById("headerCurrencyCode");
const greetingTextEl  = document.getElementById("greetingText");
const greetingDateEl  = document.getElementById("greetingDate");
const statusTextEl    = document.getElementById("financialStatusText");
const billsDueBadge   = document.getElementById("billsDueBadge");
const txCountSubtitle = document.getElementById("txCountSubtitle");
const submitBtnText   = document.getElementById("submitBtnText");
const submitTxBtn     = document.getElementById("submitTxBtn");
const ctx             = document.getElementById("expenseChart").getContext("2d");

// ── Theme init ──
function renderThemeToggle() {
  const icon = darkMode ? "sun" : "moon";
  const label = darkMode ? "Switch to light mode" : "Switch to dark mode";
  themeToggle.innerHTML = iconMarkup(icon);
  themeToggle.setAttribute("aria-label", label);
  themeToggle.title = label;
}

if (darkMode) {
  document.body.classList.add("dark");
}
renderThemeToggle();

// ══════════════════════════════════════════════
//  GREETING & CONTEXT HEADER
// ══════════════════════════════════════════════
function updateGreeting() {
  const now = new Date();
  const hour = now.getHours();
  let greeting = "Hello";
  if (hour >= 4 && hour < 12) greeting = "Good morning";
  else if (hour >= 12 && hour < 17) greeting = "Good afternoon";
  else greeting = "Good evening";

  greetingTextEl.textContent = `${greeting}!`;

  const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
  greetingDateEl.textContent = now.toLocaleDateString(undefined, options);
}

function updateFinancialStatus() {
  let income = 0, expense = 0;
  transactions.forEach(t => {
    if (t.amount > 0) income += t.amount;
    else expense += Math.abs(t.amount);
  });

  const balance = income - expense;
  const savingsRate = income > 0 ? (balance / income) * 100 : 0;

  if (!transactions.length) {
    statusTextEl.textContent = "Ready for your first entry";
    return;
  }

  if (savingsRate >= 35) {
    statusTextEl.textContent = `${savingsRate.toFixed(0)}% of recorded income remains`;
  } else if (balance > 0) {
    statusTextEl.textContent = `${fmt(balance)} more income than expenses`;
  } else if (balance === 0) {
    statusTextEl.textContent = "Recorded income and expenses are even";
  } else {
    statusTextEl.textContent = `Expenses are ${fmt(Math.abs(balance))} above income`;
  }
}

// ══════════════════════════════════════════════
//  SEGMENTED FORM & QUICK CATEGORIES
// ══════════════════════════════════════════════
const typeExpenseBtn = document.getElementById("typeExpenseBtn");
const typeIncomeBtn  = document.getElementById("typeIncomeBtn");

typeExpenseBtn.addEventListener("click", () => setTransactionType("expense"));
typeIncomeBtn.addEventListener("click", () => setTransactionType("income"));

function setTransactionType(type) {
  currentTxType = type;
  if (type === "expense") {
    typeExpenseBtn.classList.add("active");
    typeIncomeBtn.classList.remove("active");
    submitBtnText.textContent = "+ Add Expense";
    submitTxBtn.style.background = "linear-gradient(135deg, #e11d48, #f43f5e)";
    submitTxBtn.style.boxShadow = "0 4px 14px rgba(225, 29, 72, 0.3)";
  } else {
    typeIncomeBtn.classList.add("active");
    typeExpenseBtn.classList.remove("active");
    submitBtnText.textContent = "+ Add Income";
    submitTxBtn.style.background = "linear-gradient(135deg, #059669, #10b981)";
    submitTxBtn.style.boxShadow = "0 4px 14px rgba(5, 150, 105, 0.3)";
  }
}

// Quick category chips click
document.querySelectorAll(".category-chip").forEach(chip => {
  chip.addEventListener("click", () => {
    const cat = chip.getAttribute("data-category");
    const categorySelect = document.getElementById("category");
    categorySelect.value = cat;

    // If salary, auto-switch to Income
    if (cat === "Salary" || cat === "Freelance" || cat === "Investment") {
      setTransactionType("income");
    } else {
      setTransactionType("expense");
    }

    // Gentle feedback animation
    chip.style.transform = "scale(0.95)";
    setTimeout(() => { chip.style.transform = ""; }, 150);
  });
});

// ══════════════════════════════════════════════
//  RECURRING — check on load
// ══════════════════════════════════════════════
function processRecurring() {
  const todayStr = today();
  let added = 0;
  const templates = transactions.filter(t => t.recurring && t.recurring !== "none");

  templates.forEach(t => {
    const lastDate = new Date(t.date + "T00:00:00");
    const now      = new Date(todayStr + "T00:00:00");
    let nextDate   = new Date(lastDate);

    if (t.recurring === "daily")   nextDate.setDate(nextDate.getDate() + 1);
    if (t.recurring === "weekly")  nextDate.setDate(nextDate.getDate() + 7);
    if (t.recurring === "monthly") nextDate.setMonth(nextDate.getMonth() + 1);

    if (nextDate <= now) {
      const newTx = {
        ...t,
        id: Date.now() + Math.random(),
        date: nextDate.toISOString().split("T")[0]
      };
      transactions.unshift(newTx);
      t.date = newTx.date;
      added++;
    }
  });

  if (added > 0) {
    save();
    showToast(`${added} recurring transaction${added > 1 ? "s" : ""} auto-added ✓`);
  }
}

// ══════════════════════════════════════════════
//  ADD TRANSACTION
// ══════════════════════════════════════════════
form.addEventListener("submit", e => {
  e.preventDefault();
  const text      = document.getElementById("text").value.trim();
  const rawAmount = parseFloat(document.getElementById("amount").value);
  const category  = document.getElementById("category").value || (currentTxType === "income" ? "Salary" : "Other");
  const note      = document.getElementById("note").value.trim();
  const dateVal   = document.getElementById("date").value;
  const recurring = document.getElementById("recurring").value;

  if (!text || isNaN(rawAmount) || rawAmount <= 0) {
    return showToast("Please enter a valid amount");
  }

  // Calculate final amount based on active segmented toggle
  const finalAmount = currentTxType === "expense" ? -Math.abs(rawAmount) : Math.abs(rawAmount);

  transactions.unshift({
    id: Date.now(),
    text,
    amount: finalAmount,
    category,
    note,
    date: dateVal || today(),
    recurring: recurring || null
  });

  save();
  render();
  form.reset();

  document.getElementById("date").value = today();
  setTransactionType(currentTxType); // preserve active button styling

  showToast(`${currentTxType === "income" ? "Income" : "Expense"} added: ${fmt(rawAmount)} ✓`);
  checkMilestone();
});

function deleteTransaction(id) {
  transactions = transactions.filter(t => t.id !== id);
  save();
  render();
  showToast("Transaction deleted");
}

document.getElementById("clearBtn").addEventListener("click", () => {
  if (!transactions.length) return showToast("Nothing to clear");
  if (!confirm("Are you sure you want to delete all transactions? This cannot be undone.")) return;
  transactions = [];
  save();
  render();
  showToast("All transactions cleared");
});

// ══════════════════════════════════════════════
//  BUDGETS
// ══════════════════════════════════════════════
function setBudget() {
  const cat = document.getElementById("budgetCategory").value;
  const amt = parseFloat(document.getElementById("budgetAmount").value);
  if (!cat || isNaN(amt) || amt <= 0) return showToast("Pick a category & valid limit");

  budgets[cat] = amt;
  saveBudgets();
  render();
  document.getElementById("budgetCategory").value = "";
  document.getElementById("budgetAmount").value = "";
  showToast(`Budget set: ${cat} → ${fmt(amt)}`);
}

function removeBudget(cat) {
  delete budgets[cat];
  saveBudgets();
  render();
  showToast(`Budget removed: ${cat}`);
}

// ══════════════════════════════════════════════
//  SAVINGS GOALS
// ══════════════════════════════════════════════
function addGoal() {
  const name   = document.getElementById("goalName").value.trim();
  const target = parseFloat(document.getElementById("goalTarget").value);
  const emoji  = stripEmoji(document.getElementById("goalEmoji").value).slice(0, 2).toUpperCase() || "SG";

  if (!name || isNaN(target) || target <= 0) return showToast("Enter goal name & target");

  goals.push({ id: Date.now(), name, target, saved: 0, emoji });
  saveGoals();
  renderGoals();
  document.getElementById("goalName").value = "";
  document.getElementById("goalTarget").value = "";
  document.getElementById("goalEmoji").value = "";
  showToast(`Goal created: ${name}`);
}

function addToGoal(id) {
  const amt = parseFloat(prompt("How much would you like to add to this goal?"));
  if (isNaN(amt) || amt <= 0) return;
  const g = goals.find(g => g.id === id);
  if (!g) return;

  g.saved = Math.min(g.target, g.saved + amt);
  saveGoals();
  renderGoals();

  if (g.saved >= g.target) {
    showToast(`Goal "${g.name}" completed! 🎉`);
    fireConfetti();
  } else {
    showToast(`Added ${fmt(amt)} to "${g.name}"`);
  }
}

function removeGoal(id) {
  goals = goals.filter(g => g.id !== id);
  saveGoals();
  renderGoals();
  showToast("Goal removed");
}

function renderGoals() {
  const strip = document.getElementById("goalsStrip");
  const list  = document.getElementById("goalsList");
  if (!goals.length) {
    strip.style.display = "none";
    list.innerHTML = "";
    return;
  }
  strip.style.display = "flex";

  strip.innerHTML = goals.map(g => {
    const pct = Math.min(100, (g.saved / g.target) * 100).toFixed(0);
    const badge = stripEmoji(g.emoji).slice(0, 2).toUpperCase() || "SG";
    return `
      <div class="goal-card">
        <div class="goal-emoji">${badge}</div>
        <div class="goal-name">${escapeHTML(g.name)}</div>
        <div class="goal-amounts">${fmt(g.saved)} / ${fmt(g.target)}</div>
        <div class="goal-progress-wrap">
          <div class="goal-progress-bar" style="width:${pct}%;background:${pct >= 100 ? "var(--income)" : "var(--primary)"}"></div>
        </div>
        <div class="goal-pct">${pct}% saved</div>
        <div class="goal-actions">
          <button onclick="addToGoal(${g.id})" class="btn-secondary sm" style="flex:1">+ Add</button>
          <button onclick="removeGoal(${g.id})" class="btn-danger sm" aria-label="Remove goal">✕</button>
        </div>
      </div>`;
  }).join("");

  list.innerHTML = goals.map(g => {
    const pct = Math.min(100, (g.saved / g.target) * 100).toFixed(0);
    const badge = stripEmoji(g.emoji).slice(0, 2).toUpperCase() || "SG";
    return `
      <div class="budget-item ok" style="flex-direction:column;align-items:flex-start">
        <div style="display:flex;justify-content:space-between;width:100%;align-items:center">
          <span style="font-weight:600">${badge} ${escapeHTML(g.name)}</span>
          <button class="budget-remove" onclick="removeGoal(${g.id})">✕</button>
        </div>
        <div class="budget-bar-wrap" style="width:100%;margin-top:6px">
          <div class="budget-bar" style="width:${pct}%;background:var(--income)"></div>
        </div>
        <div style="font-size:.72rem;margin-top:3px">${fmt(g.saved)} / ${fmt(g.target)} · ${pct}%</div>
      </div>`;
  }).join("");
}

// ══════════════════════════════════════════════
//  BILL REMINDERS
// ══════════════════════════════════════════════
document.getElementById("billsBtn").addEventListener("click", openBillsModal);

function openBillsModal() {
  document.getElementById("billsModal").style.display = "flex";
  document.body.style.overflow = "hidden";
  renderBills();
  const dd = document.getElementById("billDueDate");
  if (!dd.value) dd.value = today();
}

function closeBillsModal() {
  document.getElementById("billsModal").style.display = "none";
  document.body.style.overflow = "";
}

function billsOverlayClose(e) {
  if (e.target === document.getElementById("billsModal")) closeBillsModal();
}

function getDaysUntil(dateStr) {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + "T00:00:00");
  return Math.round((d - t) / (1000 * 60 * 60 * 24));
}

function addBill() {
  const name    = document.getElementById("billName").value.trim();
  const amount  = parseFloat(document.getElementById("billAmount").value);
  const dueDate = document.getElementById("billDueDate").value;
  const repeat  = document.getElementById("billRepeat").value;
  if (!name || isNaN(amount) || amount <= 0 || !dueDate) return showToast("Fill in all bill details");

  bills.push({ id: Date.now(), name, amount, dueDate, repeat });
  saveBills();
  renderBills();
  renderDueSoon();
  document.getElementById("billName").value = "";
  document.getElementById("billAmount").value = "";
  showToast(`Bill added: ${name}`);
}

function removeBill(id) {
  bills = bills.filter(b => b.id !== id);
  saveBills();
  renderBills();
  renderDueSoon();
  showToast("Bill removed");
}

function renderDueSoon() {
  const strip = document.getElementById("dueSoonStrip");
  if (!strip) return;

  const tagged = bills
    .map(b => ({ ...b, days: getDaysUntil(b.dueDate) }))
    .filter(b => b.days <= 14)
    .sort((a, b) => a.days - b.days);

  // Update header badge
  const urgentCount = tagged.filter(b => b.days <= 7).length;
  if (billsDueBadge) {
    if (urgentCount > 0) {
      billsDueBadge.textContent = urgentCount;
      billsDueBadge.style.display = "inline-block";
    } else {
      billsDueBadge.style.display = "none";
    }
  }

  if (!tagged.length) {
    strip.style.display = "none";
    return;
  }
  strip.style.display = "block";

  strip.innerHTML = `
    <div class="due-soon-wrap">
      <div class="due-soon-header">
        <span class="due-soon-title">Upcoming Bills</span>
        <button onclick="openBillsModal()" class="btn-secondary sm">Manage All</button>
      </div>
      <div class="due-soon-list">
        ${tagged.map(b => {
          const urgency = b.days < 0 ? "overdue" : b.days <= 3 ? "urgent" : b.days <= 7 ? "soon" : "ok";
          const label   = b.days < 0 ? `${Math.abs(b.days)}d overdue` : b.days === 0 ? "Due today!" : b.days === 1 ? "Tomorrow" : `${b.days}d left`;
          return `<div class="due-soon-item">
            <div class="due-item-left">
              <span class="due-badge ${urgency}">${label}</span>
              <span class="due-item-name">${escapeHTML(b.name)}</span>
            </div>
            <span class="due-item-amount">${fmt(b.amount)}</span>
          </div>`;
        }).join("")}
      </div>
    </div>`;
}

function renderBills() {
  const list = document.getElementById("billsList");
  if (!list) return;

  if (!bills.length) {
    list.innerHTML = `<div class="empty-state" style="padding:32px">No bills recorded yet — add one above</div>`;
    return;
  }

  const sorted = bills.map(b => ({ ...b, days: getDaysUntil(b.dueDate) })).sort((a, b) => a.days - b.days);

  list.innerHTML = sorted.map(b => {
    const urgency = b.days < 0 ? "overdue" : b.days <= 3 ? "urgent" : b.days <= 7 ? "soon" : "ok";
    const label   = b.days < 0 ? `${Math.abs(b.days)}d overdue` : b.days === 0 ? "Due today!" : b.days === 1 ? "Tomorrow" : `in ${b.days}d`;
    const repeatLabel = b.repeat === "once" ? "One-time" : b.repeat === "monthly" ? "Monthly" : b.repeat === "quarterly" ? "Quarterly" : "Yearly";
    return `
      <div class="bill-item ${urgency}">
        <div class="bill-icon">
          ${iconMarkup("bills")}
        </div>
        <div class="bill-info">
          <div class="bill-name">${escapeHTML(b.name)}</div>
          <div class="bill-meta">${repeatLabel} · Due ${formatDate(b.dueDate)}</div>
        </div>
        <div class="bill-right">
          <div class="bill-amount">${fmt(b.amount)}</div>
          <span class="due-badge ${urgency}">${label}</span>
        </div>
        <button class="delete-btn" onclick="removeBill(${b.id})" title="Remove bill" aria-label="Remove bill">${iconMarkup("trash")}</button>
      </div>`;
  }).join("");
}

// ══════════════════════════════════════════════
//  IMPORT / EXPORT CSV
// ══════════════════════════════════════════════
document.getElementById("importBtn").addEventListener("click", () => {
  document.getElementById("importFile").click();
});

document.getElementById("importFile").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const rows = parseCSV(ev.target.result);
    if (rows.length < 2) {
      showToast("CSV file has no transaction rows");
      return;
    }
    const headers = rows[0].map(value => value.trim().toLowerCase());
    const column = (name, fallback) => {
      const index = headers.indexOf(name);
      return index < 0 ? fallback : index;
    };
    const dateIndex = column("date", 0);
    const textIndex = column("description", 1);
    const categoryIndex = column("category", 2);
    const amountIndex = column("amount", 3);
    const noteIndex = column("note", 5);
    const recurringIndex = column("recurring", 6);
    let imported = 0, skipped = 0;
    rows.slice(1).forEach(cols => {
      if (cols.every(value => !value.trim())) return;
      const text = (cols[textIndex] || "").trim();
      const amt = Number.parseFloat(cols[amountIndex]);
      if (!text || !Number.isFinite(amt)) { skipped++; return; }
      transactions.unshift({
        id: Date.now() + Math.random(),
        text,
        amount: amt,
        category: (cols[categoryIndex] || "").trim() || "Other",
        note: (cols[noteIndex] || "").trim(),
        date: (cols[dateIndex] || "").trim() || today(),
        recurring: (cols[recurringIndex] || "").trim() || null
      });
      imported++;
    });
    save();
    render();
    showToast(`Imported ${imported} transactions${skipped ? `, skipped ${skipped}` : ""}`);
  };
  reader.readAsText(file);
  e.target.value = "";
});

document.getElementById("exportBtn").addEventListener("click", () => {
  if (!transactions.length) return showToast("No transactions to export");
  const rows = transactions.map(t => [
    t.date, t.text, t.category, t.amount, getCurrency().code, t.note || "", t.recurring || ""
  ].map(escapeCSV).join(","));
  download(["Date,Description,Category,Amount,Currency,Note,Recurring", ...rows].join("\n"),
    `fintrack_${today()}.csv`, "text/csv");
  showToast("CSV exported ✓");
});

// ══════════════════════════════════════════════
//  FILTERS & TABS
// ══════════════════════════════════════════════
searchInput.addEventListener("input", render);
monthFilter.addEventListener("change", render);

// Filter pills (All, Expenses, Income)
document.querySelectorAll(".filter-pill").forEach(pill => {
  pill.addEventListener("click", () => {
    document.querySelectorAll(".filter-pill").forEach(p => p.classList.remove("active"));
    pill.classList.add("active");
    txFilterType = pill.getAttribute("data-filter");
    render();
  });
});

function switchChart(type, btn) {
  currentChartType = type;
  document.querySelectorAll(".chart-tabs .tab-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  render();
}

// ══════════════════════════════════════════════
//  RENDER MAIN DASHBOARD
// ══════════════════════════════════════════════
function render() {
  const searchQ = searchInput.value.toLowerCase();
  const monthQ  = monthFilter.value;
  let income = 0, expenseTotal = 0, categoryTotals = {};

  transactions.forEach(t => {
    if (t.amount > 0) income += t.amount;
    else expenseTotal += Math.abs(t.amount);
    if (t.amount < 0) {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + Math.abs(t.amount);
    }
  });

  const balance = income - expenseTotal;
  animateCounter(balanceEl, balance);
  animateCounter(incomeEl, income);
  animateCounter(expenseEl, expenseTotal);

  const sv = income > 0 ? Math.max(0, ((balance / income) * 100).toFixed(0)) : 0;
  savingsEl.textContent = `${sv}%`;
  balanceBar.style.width = income > 0 ? `${Math.min(100, Math.max(0, (balance / income) * 100))}%` : "0%";

  const balanceNote = document.getElementById("balanceNote");
  if (balanceNote) {
    balanceNote.textContent = balance >= 0 ? "Positive cash flow" : "Net negative balance";
  }

  // Filter transactions
  const filtered = transactions.filter(t => {
    const s = t.text.toLowerCase().includes(searchQ) ||
              t.category.toLowerCase().includes(searchQ) ||
              (t.note || "").toLowerCase().includes(searchQ);
    const m = !monthQ || t.date.startsWith(monthQ);
    let typeMatches = true;
    if (txFilterType === "expense") typeMatches = t.amount < 0;
    else if (txFilterType === "income") typeMatches = t.amount > 0;
    return s && m && typeMatches;
  });

  // Update transaction count & subtotal
  if (txCountSubtitle) {
    const filteredTotal = filtered.reduce((acc, t) => acc + t.amount, 0);
    const sign = filteredTotal >= 0 ? "+" : "";
    txCountSubtitle.textContent = `${filtered.length} record${filtered.length !== 1 ? "s" : ""} · ${sign}${fmt(filteredTotal)}`;
  }

  listEl.innerHTML = "";
  emptyState.style.display = filtered.length ? "none" : "block";

  filtered.forEach(t => {
    const isInc = t.amount > 0;
    const li = document.createElement("li");
    li.dataset.id = t.id;
    li.innerHTML = `
      <div class="swipe-delete-bg">${iconMarkup("trash")}</div>
      <div class="tx-icon ${isInc ? "income" : "expense"}">${getIcon(t.category)}</div>
      <div class="tx-info">
        <div class="tx-name" title="${escapeHTML(t.text)}">${escapeHTML(t.text)}${t.recurring ? ` <span class="recurring-badge">${escapeHTML(t.recurring)}</span>` : ""}</div>
        <div class="tx-meta">${escapeHTML(t.category)}${t.note ? " · " + escapeHTML(t.note) : ""}</div>
      </div>
      <div class="tx-right">
        <div class="tx-amount ${isInc ? "income" : "expense"}">${isInc ? "+" : "−"}${fmt(Math.abs(t.amount))}</div>
        <div class="tx-date">${formatDate(t.date)}</div>
      </div>
      <button class="delete-btn" onclick="deleteTransaction(${t.id})" title="Delete transaction" aria-label="Delete transaction">${iconMarkup("trash")}</button>`;
    addSwipeToDelete(li, t.id);
    listEl.appendChild(li);
  });

  updateMainChart(categoryTotals);
  renderBudgets(categoryTotals);
  renderGoals();
  renderDueSoon();
  updateFinancialStatus();
}

// ══════════════════════════════════════════════
//  ANIMATED COUNTER
// ══════════════════════════════════════════════
function animateCounter(el, target) {
  const duration = 500, start = Date.now();
  const tick = () => {
    const elapsed = Date.now() - start;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    el.textContent = fmt(target * ease);
    if (progress < 1) requestAnimationFrame(tick);
    else el.textContent = fmt(target);
  };
  requestAnimationFrame(tick);
}

// ══════════════════════════════════════════════
//  CONFETTI & MILESTONES
// ══════════════════════════════════════════════
function fireConfetti() {
  if (typeof confetti === "undefined") return;
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ["#3f6b57", "#10b981", "#f59e0b", "#ec4899"]
  });
}

function checkMilestone() {
  let income = 0, expense = 0;
  transactions.forEach(t => { if (t.amount > 0) income += t.amount; else expense += Math.abs(t.amount); });
  const sv = income > 0 ? ((income - expense) / income) * 100 : 0;
  const prev = parseFloat(localStorage.getItem("ft_last_sv") || 0);
  if (sv >= 50 && prev < 50) { showToast("🎯 Halfway there! 50% savings rate achieved!"); fireConfetti(); }
  if (sv >= 75 && prev < 75) { showToast("🌟 Outstanding! 75% savings rate achieved!"); fireConfetti(); }
  localStorage.setItem("ft_last_sv", sv.toFixed(1));
}

// ══════════════════════════════════════════════
//  SWIPE TO DELETE
// ══════════════════════════════════════════════
function addSwipeToDelete(li, id) {
  let startX = 0, currentX = 0, swiping = false;
  const bg = li.querySelector(".swipe-delete-bg");

  li.addEventListener("touchstart", e => {
    startX = e.touches[0].clientX;
    swiping = true;
  }, { passive: true });

  li.addEventListener("touchmove", e => {
    if (!swiping) return;
    currentX = e.touches[0].clientX - startX;
    if (currentX < 0) {
      const shift = Math.max(currentX, -80);
      li.style.transform = `translateX(${shift}px)`;
      bg.style.opacity = Math.min(Math.abs(shift) / 80, 1);
    }
  }, { passive: true });

  li.addEventListener("touchend", () => {
    swiping = false;
    if (currentX < -60) {
      li.style.transform = "translateX(-100%)";
      li.style.opacity = "0";
      li.style.transition = "all .25s ease";
      setTimeout(() => deleteTransaction(id), 250);
    } else {
      li.style.transform = "";
      bg.style.opacity = "0";
    }
    currentX = 0;
  });
}

// ══════════════════════════════════════════════
//  MAIN CHART
// ══════════════════════════════════════════════
function updateMainChart(data) {
  const labels = Object.keys(data), values = Object.values(data);
  const catCountEl = document.getElementById("chartCategoryCount");
  if (catCountEl) {
    catCountEl.textContent = labels.length ? `${labels.length} categories` : "No expenses";
  }

  if (chart) chart.destroy();
  if (!labels.length) {
    noChartData.style.display = "block";
    return;
  }
  noChartData.style.display = "none";

  const isDark = document.body.classList.contains("dark");
  const textColor = isDark ? "#e8edf5" : "#0f172a";
  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";

  if (currentChartType === "doughnut") {
    chart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: COLORS,
          borderWidth: 2,
          borderColor: isDark ? "#111726" : "#ffffff"
        }]
      },
      options: {
        responsive: true,
        cutout: "68%",
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: textColor,
              font: { family: "-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif", size: 11 },
              padding: 14,
              boxWidth: 10
            }
          },
          tooltip: {
            callbacks: {
              label: c => ` ${fmt(c.parsed)} (${((c.parsed / values.reduce((a, b) => a + b, 0)) * 100).toFixed(1)}%)`
            }
          }
        }
      }
    });
  } else {
    chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "Expenses",
          data: values,
          backgroundColor: COLORS,
          borderRadius: 8,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: c => ` ${fmt(c.parsed.y)}` } }
        },
        scales: {
          x: { ticks: { color: textColor, font: { family: "-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif", size: 10 } }, grid: { color: gridColor } },
          y: { ticks: { color: textColor, font: { family: "-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif", size: 10 }, callback: v => fmt(v) }, grid: { color: gridColor } }
        }
      }
    });
  }
}

// ══════════════════════════════════════════════
//  BUDGET RENDER
// ══════════════════════════════════════════════
function renderBudgets(categoryTotals) {
  const entries = Object.entries(budgets);
  if (!entries.length) {
    budgetListEl.innerHTML = "";
    return;
  }

  budgetListEl.innerHTML = entries.map(([cat, limit]) => {
    const spent = categoryTotals[cat] || 0;
    const pct = Math.min(100, (spent / limit) * 100);
    const status = spent >= limit ? "over" : pct >= 80 ? "near" : "ok";
    const label = status === "over" ? "Over budget" : status === "near" ? "Near limit" : "On track";
    const color = status === "over" ? "var(--expense)" : status === "near" ? "var(--warning)" : "var(--income)";

    return `
      <div class="budget-item ${status}">
        <div style="flex:1">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-weight:600;font-size:.82rem">${getIcon(cat)} ${cat}</span>
            <button class="budget-remove" onclick="removeBudget('${cat}')" title="Remove budget">✕</button>
          </div>
          <div class="budget-bar-wrap">
            <div class="budget-bar" style="width:${pct}%;background:${color}"></div>
          </div>
        </div>
        <div style="text-align:right;font-size:.78rem;margin-left:12px;flex-shrink:0">
          <div>${fmt(spent)} / ${fmt(limit)}</div>
          <div style="margin-top:2px">${label}</div>
        </div>
      </div>`;
  }).join("");
}

// ══════════════════════════════════════════════
//  CURRENCY MODAL
// ══════════════════════════════════════════════
document.getElementById("currencyBtn").addEventListener("click", openCurrencyModal);

function openCurrencyModal() {
  document.getElementById("currencyModal").style.display = "flex";
  document.body.style.overflow = "hidden";
  const c = getCurrency();
  document.getElementById("currentCurrencyLabel").textContent = `Active: ${c.flag} ${c.name} (${c.code})`;
  renderCurrencyGrid("");
  document.getElementById("currencySearch").value = "";
}

function closeCurrencyModal() {
  document.getElementById("currencyModal").style.display = "none";
  document.body.style.overflow = "";
}

function currencyOverlayClose(e) {
  if (e.target === document.getElementById("currencyModal")) closeCurrencyModal();
}

document.getElementById("currencySearch").addEventListener("input", e => {
  renderCurrencyGrid(e.target.value.toLowerCase());
});

function renderCurrencyGrid(query) {
  const grid = document.getElementById("currencyGrid");
  const list = query
    ? CURRENCIES.filter(c => c.name.toLowerCase().includes(query) || c.code.toLowerCase().includes(query) || c.symbol.includes(query))
    : CURRENCIES;

  if (!list.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:24px;color:var(--muted)">No currencies found</div>`;
    return;
  }

  grid.innerHTML = list.map(c => `
    <div class="currency-item ${c.code === activeCurrencyCode ? "active" : ""}" onclick="selectCurrency('${c.code}')">
      <span class="currency-flag">${c.flag}</span>
      <div class="currency-info">
        <div class="currency-code">${c.code}</div>
        <div class="currency-name">${c.name}</div>
        <div class="currency-symbol">${c.symbol}</div>
      </div>
    </div>`).join("");
}

function selectCurrency(code) {
  activeCurrencyCode = code;
  localStorage.setItem("ft_currency", code);
  closeCurrencyModal();
  updateCurrencyUI();
  render();
  showToast(`Currency set to ${getCurrency().flag} ${getCurrency().code}`);
}

function updateCurrencyUI() {
  const c = getCurrency();
  if (brandIcon) brandIcon.textContent = c.symbol;
  if (amountPrefix) amountPrefix.textContent = c.symbol;
  if (headerFlag) headerFlag.textContent = c.flag;
  if (headerCode) headerCode.textContent = c.code;
}

// ══════════════════════════════════════════════
//  REPORT MODAL
// ══════════════════════════════════════════════
document.getElementById("reportBtn").addEventListener("click", openReport);

function openReport() {
  if (!transactions.length) return showToast("Add transactions first to view reports");
  buildReport();
  document.getElementById("reportModal").style.display = "flex";
  document.body.style.overflow = "hidden";
}

function closeReport() {
  document.getElementById("reportModal").style.display = "none";
  document.body.style.overflow = "";
  [rLineChart, rDonutChart, rBarChart].forEach(c => { if (c) c.destroy(); });
  rLineChart = rDonutChart = rBarChart = null;
}

function overlayClose(e) {
  if (e.target === document.getElementById("reportModal")) closeReport();
}

function buildReport() {
  const isDark = document.body.classList.contains("dark");
  const textColor = isDark ? "#e8edf5" : "#0f172a";
  const gridColor = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";

  let totalIncome = 0, totalExpense = 0, catTotals = {}, monthMap = {};
  transactions.forEach(t => {
    const mo = t.date ? t.date.slice(0, 7) : "Unknown";
    if (!monthMap[mo]) monthMap[mo] = { income: 0, expense: 0 };
    if (t.amount > 0) {
      totalIncome += t.amount;
      monthMap[mo].income += t.amount;
    } else {
      totalExpense += Math.abs(t.amount);
      monthMap[mo].expense += Math.abs(t.amount);
    }
    if (t.amount < 0) {
      catTotals[t.category] = (catTotals[t.category] || 0) + Math.abs(t.amount);
    }
  });

  const balance = totalIncome - totalExpense;
  const savings = totalIncome > 0 ? ((balance / totalIncome) * 100).toFixed(1) : 0;
  const months = Object.keys(monthMap).sort();
  const c = getCurrency();

  document.getElementById("reportPeriod").textContent =
    months.length
      ? `${formatMonth(months[0])} – ${formatMonth(months[months.length - 1])} · ${transactions.length} entries · ${c.flag} ${c.code}`
      : "";

  document.getElementById("reportSummary").innerHTML = [
    { label: "Total Income",   value: fmt(totalIncome),  color: "var(--income)" },
    { label: "Total Expenses", value: fmt(totalExpense), color: "var(--expense)" },
    { label: "Net Balance",    value: fmt(balance),       color: balance >= 0 ? "var(--income)" : "var(--expense)" },
    { label: "Savings Rate",   value: `${Math.max(0, savings)}%`, color: "var(--primary)" },
    { label: "Avg Monthly",    value: fmt(months.length ? totalExpense / months.length : 0), color: "var(--muted)" },
    { label: "Transactions",   value: transactions.length, color: "var(--text)" },
  ].map(s => `<div class="rs-card"><div class="rs-label">${s.label}</div><div class="rs-value" style="color:${s.color}">${s.value}</div></div>`).join("");

  [rLineChart, rDonutChart, rBarChart].forEach(c => { if (c) c.destroy(); });
  const cd = { responsive: true, maintainAspectRatio: false };

  const lineCtx = document.getElementById("rLineChart").getContext("2d");
  document.getElementById("rLineChart").style.height = "180px";
  rLineChart = new Chart(lineCtx, {
    type: "line",
    data: {
      labels: months.map(formatMonth),
      datasets: [
        { label: "Income",   data: months.map(m => monthMap[m].income), borderColor: "#10b981", backgroundColor: "rgba(16,185,129,.12)", tension: .4, fill: true, pointRadius: 4, pointBackgroundColor: "#10b981" },
        { label: "Expenses", data: months.map(m => monthMap[m].expense), borderColor: "#f43f5e", backgroundColor: "rgba(244,63,94,.12)", tension: .4, fill: true, pointRadius: 4, pointBackgroundColor: "#f43f5e" }
      ]
    },
    options: {
      ...cd,
      plugins: {
        legend: { labels: { color: textColor, font: { family: "-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif", size: 11 } } },
        tooltip: { callbacks: { label: c => ` ${fmt(c.parsed.y)}` } }
      },
      scales: {
        x: { ticks: { color: textColor, font: { family: "-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif", size: 10 } }, grid: { color: gridColor } },
        y: { ticks: { color: textColor, font: { family: "-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif", size: 10 }, callback: v => fmt(v) }, grid: { color: gridColor } }
      }
    }
  });

  const dCtx = document.getElementById("rDonutChart").getContext("2d");
  document.getElementById("rDonutChart").style.height = "180px";
  const catLabels = Object.keys(catTotals), catValues = Object.values(catTotals);
  rDonutChart = new Chart(dCtx, {
    type: "doughnut",
    data: {
      labels: catLabels,
      datasets: [{ data: catValues, backgroundColor: COLORS, borderWidth: 2, borderColor: isDark ? "#172033" : "#ffffff" }]
    },
    options: {
      ...cd,
      cutout: "60%",
      plugins: {
        legend: { position: "bottom", labels: { color: textColor, font: { family: "-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif", size: 10 }, padding: 10, boxWidth: 10 } },
        tooltip: { callbacks: { label: c => ` ${fmt(c.parsed)} (${((c.parsed / (catValues.reduce((a, b) => a + b, 0) || 1)) * 100).toFixed(1)}%)` } }
      }
    }
  });

  const bCtx = document.getElementById("rBarChart").getContext("2d");
  document.getElementById("rBarChart").style.height = "180px";
  const netValues = months.map(m => monthMap[m].income - monthMap[m].expense);
  rBarChart = new Chart(bCtx, {
    type: "bar",
    data: {
      labels: months.map(formatMonth),
      datasets: [{
        label: "Net",
        data: netValues,
        backgroundColor: netValues.map(v => v >= 0 ? "rgba(16,185,129,.75)" : "rgba(244,63,94,.75)"),
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      ...cd,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${fmt(c.parsed.y)}` } } },
      scales: {
        x: { ticks: { color: textColor, font: { family: "-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif", size: 10 } }, grid: { color: gridColor } },
        y: { ticks: { color: textColor, font: { family: "-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif", size: 10 }, callback: v => fmt(v) }, grid: { color: gridColor } }
      }
    }
  });

  const sortedCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
  document.getElementById("reportCatTable").innerHTML = sortedCats.length ? `
    <table class="r-table"><thead><tr><th>Category</th><th>Spent</th><th>% of Expenses</th><th>Entries</th></tr></thead>
    <tbody>${sortedCats.map(([cat, amt]) => {
      const count = transactions.filter(t => t.category === cat && t.amount < 0).length;
      const pct = totalExpense > 0 ? ((amt / totalExpense) * 100).toFixed(1) : 0;
      return `<tr><td>${getIcon(cat)} ${escapeHTML(cat)}</td><td style="font-family:'JetBrains Mono',monospace;font-weight:600">${fmt(amt)}</td>
        <td><div style="display:flex;align-items:center;gap:8px"><div style="flex:1;height:6px;background:var(--border);border-radius:99px;overflow:hidden"><div style="width:${Math.min(100, parseFloat(pct))}%;height:100%;background:var(--primary);border-radius:99px"></div></div><span style="font-size:.78rem;color:var(--muted);width:36px">${pct}%</span></div></td>
        <td style="color:var(--muted)">${count}</td></tr>`;
    }).join("")}</tbody></table>` : `<div class="empty-state">No expense data recorded</div>`;

  const top5Exp = [...transactions].filter(t => t.amount < 0).sort((a, b) => a.amount - b.amount).slice(0, 5);
  document.getElementById("reportTopExp").innerHTML = top5Exp.length
    ? top5Exp.map((t, i) => `<div class="top-tx-item"><div class="top-tx-rank">${i + 1}</div><div class="tx-icon expense" style="width:30px;height:30px">${getIcon(t.category)}</div><div class="top-tx-info"><div class="top-tx-name">${escapeHTML(t.text)}</div><div class="top-tx-cat">${escapeHTML(t.category)} · ${formatDate(t.date)}</div></div><div class="top-tx-amt expense-text">−${fmt(Math.abs(t.amount))}</div></div>`).join("")
    : `<div class="empty-state">No expenses</div>`;

  const top5Inc = [...transactions].filter(t => t.amount > 0).sort((a, b) => b.amount - a.amount).slice(0, 5);
  document.getElementById("reportTopInc").innerHTML = top5Inc.length
    ? top5Inc.map((t, i) => `<div class="top-tx-item"><div class="top-tx-rank" style="background:var(--income-bg);color:var(--income)">${i + 1}</div><div class="tx-icon income" style="width:30px;height:30px">${getIcon(t.category)}</div><div class="top-tx-info"><div class="top-tx-name">${escapeHTML(t.text)}</div><div class="top-tx-cat">${escapeHTML(t.category)} · ${formatDate(t.date)}</div></div><div class="top-tx-amt income-text">+${fmt(t.amount)}</div></div>`).join("")
    : `<div class="empty-state">No income records</div>`;

  document.getElementById("reportMonthTable").innerHTML = `
    <table class="r-table"><thead><tr><th>Month</th><th>Income</th><th>Expenses</th><th>Net</th><th>Savings %</th></tr></thead>
    <tbody>${months.slice().reverse().map(mo => {
      const { income: inc, expense: exp } = monthMap[mo];
      const net = inc - exp, sv = inc > 0 ? ((net / inc) * 100).toFixed(0) : "—";
      return `<tr><td style="font-weight:600">${formatMonth(mo)}</td><td class="income-text" style="font-family:'JetBrains Mono',monospace">+${fmt(inc)}</td><td class="expense-text" style="font-family:'JetBrains Mono',monospace">−${fmt(exp)}</td><td style="font-family:'JetBrains Mono',monospace;font-weight:700;color:${net >= 0 ? "var(--income)" : "var(--expense)"}">${net >= 0 ? "+" : ""}${fmt(net)}</td><td><span class="pill ${sv === "—" ? "" : "income"}">${sv === "—" ? "—" : sv + "%"}</span></td></tr>`;
    }).join("")}</tbody></table>`;
}

function exportReport() {
  window.print();
}

// ══════════════════════════════════════════════
//  ESCAPE KEY MODAL CLOSING
// ══════════════════════════════════════════════
window.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    closeBillsModal();
    closeCurrencyModal();
    closeReport();
  }
});

// ══════════════════════════════════════════════
//  THEME TOGGLE
// ══════════════════════════════════════════════
themeToggle.addEventListener("click", () => {
  darkMode = !darkMode;
  document.body.classList.toggle("dark", darkMode);
  renderThemeToggle();
  localStorage.setItem("ft_dark", darkMode);
  render();
});

// ══════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════
function loadStored(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    if (Array.isArray(fallback)) return Array.isArray(value) ? value : fallback;
    return value && typeof value === "object" && !Array.isArray(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

function parseCSV(source) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') { field += '"'; i++; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"' && field === "") quoted = true;
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += char;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function escapeCSV(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function save()       { localStorage.setItem("ft_transactions", JSON.stringify(transactions)); }
function saveBudgets() { localStorage.setItem("ft_budgets", JSON.stringify(budgets)); }
function saveGoals()  { localStorage.setItem("ft_goals", JSON.stringify(goals)); }
function saveBills()  { localStorage.setItem("ft_bills", JSON.stringify(bills)); }
function today()      { return new Date().toISOString().split("T")[0]; }

function formatDate(str) {
  if (!str) return "";
  return new Date(str + "T00:00:00").toLocaleDateString(getCurrency().locale, {
    day: "2-digit",
    month: "short",
    year: "2-digit"
  });
}

function formatMonth(str) {
  if (!str || str === "Unknown") return str;
  const [y, m] = str.split("-");
  return new Date(y, m - 1).toLocaleDateString(getCurrency().locale, {
    month: "short",
    year: "numeric"
  });
}

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toastEl.classList.remove("show"), 2600);
}

function download(content, filename, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = filename;
  a.click();
}

// ══════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════
document.getElementById("date").value = today();
updateGreeting();
updateCurrencyUI();
processRecurring();
render();
renderDueSoon();
