/* ==========================================================================
   PITAKA · My Wallet — shared mock dataset for ALL design concepts.
   Paste this block verbatim into each prototype's <script> (prototypes must
   stay self-contained). Every number shown in a prototype must be derived
   from this data so concepts stay comparable.
   "Today" is fixed to Tue, 24 Nov 2026.
   Mirrors the real app model: src/types/{wallet,schedule,budget,favorite}.ts
   ========================================================================== */
const TODAY = new Date(2026, 10, 24, 19, 5); // 24 Nov 2026, 7:05 PM

const PROFILE = {
  fullName: "Justin Santos",
  firstName: "Justin",
  initials: "JS",
  email: "justin.santos@gmail.com",
  lastSyncedAt: "Today, 6:58 PM",
};

/* Wallet.type in the app: "E-wallet" | "Bank" | "Cash" (+ preset group "Digital Bank") */
const WALLETS = [
  { id: "gcash",  name: "GCash",       type: "E-wallet",     account: "Personal",       balance: 18450.75, mark: "G",   logo: "gcash",  brand: "#0a5bff", number: "0917 •••• 482" },
  { id: "bpi",    name: "BPI Savings", type: "Bank",         account: "Primary bank",   balance: 42840.50, mark: "BPI", logo: "bpi",    brand: "#c8102e", number: "•••• 3391" },
  { id: "gotyme", name: "GoTyme",      type: "Digital Bank", account: "Emergency fund", balance: 12700.00, mark: "GT",  logo: "gotyme", brand: "#16b3a6", number: "•••• 7720" },
  { id: "maya",   name: "Maya",        type: "E-wallet",     account: "Savings",        balance: 7680.25,  mark: "M",   logo: "maya",   brand: "#00b464", number: "0917 •••• 482" },
  { id: "cash",   name: "Cash",        type: "Cash",         account: "On hand",        balance: 6350.00,  mark: "₱",   logo: "cash",   brand: "#3f8f5a", number: "Physical" },
];

/* Categories exactly as in the app (label, icon-name hint) */
const EXPENSE_CATEGORIES = [
  ["Food","cup"],["Groceries","cart"],["Transport","car"],["Bills","bolt"],["Internet","wifi"],
  ["Rent","home"],["Shopping","bag"],["Health","heart"],["Debt","card"],["Loan","bank"],
  ["Leisure","film"],["Subs","sync"],["Education","book"],["Family","users"],["Other","adjust"],
];
const INCOME_CATEGORIES = [
  ["Salary","briefcase"],["Freelance","phone"],["Business","cash"],["Bonus","star"],["Allowance","wallet"],
  ["Interest","trend"],["Cashback","tag"],["Repayment","swap"],["Loan","bank"],["Gift","gift"],
  ["Refund","arrow-down"],["Other","plus"],
];

/* kind: expense category | income category | "Transfer" | "Updated" (balance adjustment)
   amount: negative = money out, positive = money in. Transfers carry `to`. */
const TRANSACTIONS = [
  { id:"t01", title:"SM Supermarket",          kind:"Groceries", wallet:"gcash",  amount:-1856.35, at:"2026-11-24T18:42", note:"Weekly groceries" },
  { id:"t02", title:"Balance adjustment",      kind:"Updated",   wallet:"cash",   amount:500.00,   at:"2026-11-24T09:15", note:"Found in jacket" },
  { id:"t03", title:"Grab to Ortigas",         kind:"Transport", wallet:"gcash",  amount:-248.00,  at:"2026-11-24T08:10" },
  { id:"t04", title:"Jollibee Katipunan",      kind:"Food",      wallet:"cash",   amount:-389.00,  at:"2026-11-23T19:30" },
  { id:"t05", title:"Netflix Premium",         kind:"Subs",      wallet:"maya",   amount:-549.00,  at:"2026-11-23T13:05" },
  { id:"t06", title:"Uniqlo Trinoma",          kind:"Shopping",  wallet:"bpi",    amount:-1990.00, at:"2026-11-22T15:20" },
  { id:"t07", title:"Coffee Project",          kind:"Food",      wallet:"cash",   amount:-285.00,  at:"2026-11-21T10:06" },
  { id:"t08", title:"GCash to Maya",           kind:"Transfer",  wallet:"gcash",  to:"maya", amount:-2000.00, at:"2026-11-20T16:21" },
  { id:"t09", title:"Logo design — Kapé Co.",  kind:"Freelance", wallet:"gcash",  amount:8500.00,  at:"2026-11-20T09:00" },
  { id:"t10", title:"Meralco bill",            kind:"Bills",     wallet:"maya",   amount:-3241.60, at:"2026-11-19T19:32" },
  { id:"t11", title:"PLDT Fiber",              kind:"Internet",  wallet:"maya",   amount:-1699.00, at:"2026-11-18T18:15" },
  { id:"t12", title:"Mercury Drug",            kind:"Health",    wallet:"cash",   amount:-642.50,  at:"2026-11-17T12:40" },
  { id:"t13", title:"Salary — Nov 15",         kind:"Salary",    wallet:"bpi",    amount:16250.00, at:"2026-11-15T08:00" },
  { id:"t14", title:"Rent — November",         kind:"Rent",      wallet:"bpi",    amount:-9500.00, at:"2026-11-15T09:30" },
  { id:"t15", title:"Ramen Nagi BGC",          kind:"Food",      wallet:"gcash",  amount:-1120.00, at:"2026-11-14T20:45" },
  { id:"t16", title:"GoTyme interest",         kind:"Interest",  wallet:"gotyme", amount:38.12,    at:"2026-11-12T00:05" },
  { id:"t17", title:"BPI to GoTyme",           kind:"Transfer",  wallet:"bpi",    to:"gotyme", amount:-3000.00, at:"2026-11-10T14:10" },
  { id:"t18", title:"Shopee checkout",         kind:"Shopping",  wallet:"gcash",  amount:-756.00,  at:"2026-11-09T21:12" },
  { id:"t19", title:"Angkas ride",             kind:"Transport", wallet:"cash",   amount:-180.00,  at:"2026-11-08T07:50" },
  { id:"t20", title:"Spotify Family",          kind:"Subs",      wallet:"gcash",  amount:-279.00,  at:"2026-11-06T06:00" },
  { id:"t21", title:"Tuition installment",     kind:"Education", wallet:"bpi",    amount:-4500.00, at:"2026-11-05T10:20" },
  { id:"t22", title:"Padala kay Mama",         kind:"Family",    wallet:"gcash",  amount:-3000.00, at:"2026-11-03T17:00" },
  { id:"t23", title:"SM Cinema — Wicked",      kind:"Leisure",   wallet:"maya",   amount:-700.00,  at:"2026-11-01T19:40" },
  /* October (for month-over-month comparison + longer history) */
  { id:"t24", title:"Salary — Oct 30",         kind:"Salary",    wallet:"bpi",    amount:16250.00, at:"2026-10-30T08:00" },
  { id:"t25", title:"Puregold",                kind:"Groceries", wallet:"cash",   amount:-2310.40, at:"2026-10-28T17:30" },
  { id:"t26", title:"Meralco bill",            kind:"Bills",     wallet:"maya",   amount:-2987.25, at:"2026-10-19T19:00" },
  { id:"t27", title:"Salary — Oct 15",         kind:"Salary",    wallet:"bpi",    amount:16250.00, at:"2026-10-15T08:00" },
  { id:"t28", title:"Rent — October",          kind:"Rent",      wallet:"bpi",    amount:-9500.00, at:"2026-10-15T09:30" },
  { id:"t29", title:"Cebu Pacific — MNL→CEB",  kind:"Leisure",   wallet:"bpi",    amount:-4280.00, at:"2026-10-08T11:15" },
  { id:"t30", title:"Cashback — Maya",         kind:"Cashback",  wallet:"maya",   amount:120.00,   at:"2026-10-04T10:00" },
];

/* Monthly budget + category limits (Activity → Budgets) */
const MONTHLY_BUDGET = 35000; // Nov spent ₱30,935.45 → 88% used, 6 days left (pace warning state)
/* Reference values (computed): total balance ₱88,021.50 · Nov spent ₱30,935.45 · Nov income ₱24,788.12
   Top categories: Rent 9,500 · Education 4,500 · Bills 3,241.60 · Family 3,000 · Shopping 2,746 (92% of limit) */
const CATEGORY_LIMITS = { Food: 4000, Groceries: 6000, Transport: 1500, Shopping: 3000, Subs: 1000, Bills: 5000, Leisure: 2000 };

/* Quick-add favorites (Home) */
const FAVORITES = [
  { id:"f1", name:"Morning coffee", direction:"expense", category:"Food",      wallet:"cash",  defaultAmount:285 },
  { id:"f2", name:"Grab to work",   direction:"expense", category:"Transport", wallet:"gcash", defaultAmount:248 },
  { id:"f3", name:"MRT + jeep",     direction:"expense", category:"Transport", wallet:"cash",  defaultAmount:58 },
  { id:"f4", name:"Lunch out",      direction:"expense", category:"Food",      wallet:"gcash", defaultAmount:null },
];

/* Recurring bills & paydays (Home → Upcoming, Manage schedules) */
const SCHEDULES = [
  { id:"s1", title:"Globe Postpaid", amount:1299,  direction:"expense", category:"Bills",    wallet:"gcash", due:"2026-11-25", repeat:"monthly", reminder:true  },
  { id:"s2", title:"Payday",         amount:16250, direction:"income",  category:"Salary",   wallet:"bpi",   due:"2026-11-30", repeat:"biweekly", reminder:true },
  { id:"s3", title:"Spotify Family", amount:279,   direction:"expense", category:"Subs",     wallet:"gcash", due:"2026-12-06", repeat:"monthly", reminder:false },
  { id:"s4", title:"Rent",           amount:9500,  direction:"expense", category:"Rent",     wallet:"bpi",   due:"2026-12-15", repeat:"monthly", reminder:true  },
  { id:"s5", title:"PLDT Fiber",     amount:1699,  direction:"expense", category:"Internet", wallet:"maya",  due:"2026-12-18", repeat:"monthly", reminder:false },
];
const REPEAT_LABEL = { weekly: "Weekly", biweekly: "Every 2 weeks", monthly: "Monthly" };

/* Add-wallet preset catalogue (groups exactly as in the app) */
const WALLET_PRESETS = {
  "E-wallet":     ["GCash","Maya","ShopeePay","GrabPay","Coins.ph","PayPal"],
  "Bank":         ["BPI","BDO","UnionBank","Metrobank","Landbank","Security Bank"],
  "Digital Bank": ["GoTyme","MariBank","Tonik","CIMB","UNO Bank"],
  "Cash":         ["Cash"],
};

/* ----------------------------- helpers ---------------------------------- */
const fmt = (v, { sign = false, cents = true } = {}) => {
  const abs = Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 });
  return `${v < 0 ? "−" : sign && v > 0 ? "+" : ""}₱${abs}`;
};
const fmtCompact = (v) => Math.abs(v) >= 1000 ? `₱${(v / 1000).toFixed(Math.abs(v) >= 10000 ? 1 : 1).replace(/\.0$/, "")}K` : `₱${Math.round(v)}`;
const splitMoney = (v) => { const [w, c] = Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).split("."); return { whole: w, cents: c }; };
const walletById = (id) => WALLETS.find((w) => w.id === id);
const isTransfer = (t) => t.kind === "Transfer";
const isAdjust = (t) => t.kind === "Updated";
const isExpense = (t) => t.amount < 0 && !isTransfer(t) && !isAdjust(t);
const isIncome = (t) => t.amount > 0 && !isTransfer(t) && !isAdjust(t);
const txDate = (t) => new Date(t.at);
const sameMonth = (d, ref = TODAY) => d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
const totalBalance = () => WALLETS.reduce((s, w) => s + w.balance, 0); // ₱88,021.50
const monthTx = (ref = TODAY) => TRANSACTIONS.filter((t) => sameMonth(txDate(t), ref));
const monthSpent = (ref = TODAY) => monthTx(ref).filter(isExpense).reduce((s, t) => s - t.amount, 0);
const monthIncome = (ref = TODAY) => monthTx(ref).filter(isIncome).reduce((s, t) => s + t.amount, 0);
const spendingByCategory = (ref = TODAY) => {
  const m = {}; monthTx(ref).filter(isExpense).forEach((t) => { m[t.kind] = (m[t.kind] || 0) - t.amount; });
  return Object.entries(m).sort((a, b) => b[1] - a[1]); // [[category, amount], ...]
};
/* daily series for the current month up to today: [{day, in, out}] */
const dailySeries = (ref = TODAY) => Array.from({ length: ref.getDate() }, (_, i) => {
  const day = i + 1; const tx = monthTx(ref).filter((t) => txDate(t).getDate() === day);
  return { day, in: tx.filter(isIncome).reduce((s, t) => s + t.amount, 0), out: tx.filter(isExpense).reduce((s, t) => s - t.amount, 0) };
});
/* weekly series: last 7 days ending today */
const weekSeries = (ref = TODAY) => Array.from({ length: 7 }, (_, i) => {
  const d = new Date(ref); d.setDate(ref.getDate() - 6 + i);
  const tx = TRANSACTIONS.filter((t) => txDate(t).toDateString() === d.toDateString());
  return { label: d.toLocaleDateString("en-PH", { weekday: "short" }), date: d, in: tx.filter(isIncome).reduce((s, t) => s + t.amount, 0), out: tx.filter(isExpense).reduce((s, t) => s - t.amount, 0) };
});
const walletTx = (id) => TRANSACTIONS.filter((t) => t.wallet === id || t.to === id)
  .map((t) => (t.to === id ? { ...t, amount: Math.abs(t.amount), incoming: true } : t));
const dayLabel = (d) => {
  const diff = Math.round((new Date(TODAY.toDateString()) - new Date(d.toDateString())) / 864e5);
  return diff === 0 ? "Today" : diff === 1 ? "Yesterday" : d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
};
const timeLabel = (d) => d.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
const daysAway = (iso) => Math.round((new Date(iso + "T00:00:00") - new Date(TODAY.toDateString())) / 864e5);
const dueLabel = (n) => n === 0 ? "Due today" : n === 1 ? "Due tomorrow" : n < 0 ? `${-n} days overdue` : `Due in ${n} days`;
