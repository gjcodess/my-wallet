# Pitaka (My Wallet) — Design Exploration Master Spec

Shared by all six concept prototypes. Each concept has its own **art direction brief**; this file defines what
every concept must cover so they are comparable, complete and implementable in the real Expo / React Native app.

## 0. The product (from the real codebase)

Pitaka ("wallet" in Filipino; display name *My Wallet*) is an **offline-first personal finance tracker** for the
Philippines. Users track balances across **cash, banks, digital banks and e-wallets** (GCash, Maya, BPI, GoTyme…),
log expenses / money-in, move money between wallets, set budgets, and get reminded of recurring bills and paydays.
It's a *tracker* (manual logging), not a bank: there is no "send money to a person", no cards issued, no KYC.
Data: SQLite on device + optional Supabase cloud sync. Brand: lowercase geometric wordmark **"pitaka"** whose `p`
has a small folded-paper corner at the top-left (you may reinterpret the mark per concept, keep the fold idea).

### Information architecture (real app)
Bottom nav: **Home · Wallets · [ + Add ] · Activity · Settings**. A selected wallet opens a full-screen **Wallet detail**.
Everything else is a **bottom sheet / modal**.

| Area | Real features to represent |
|---|---|
| Launch | Brand intro animation (tap to skip) |
| App Lock | 4-digit PIN keypad unlock, biometric (fingerprint / Face ID) prompt, wrong-PIN shake; also PIN setup / change / disable flows |
| Home | Brand header + search button · **Total available balance** with hide/show (eye) toggle · Quick actions **Update · Transfer · Add · Wallets** · **wallet stack** (cards; real app lets you swipe/drag the stack) · **Favorites** (one-tap quick-add chips) · **Upcoming** recurring bills/paydays (due labels: "Due tomorrow", "Due in 6 days"; tap → record it) · **Recent transactions** + View all |
| Wallets | "My Wallets" · combined balance · list/stack of wallets with brand art & type (E-wallet / Bank / Digital Bank / Cash) · **reorder mode** (drag) · Add wallet · hide balances |
| Wallet detail | Wallet card · balance · account label · actions **Update balance · Transfer · Edit** · filter chips **Recent / Money in / Money out / Transfers** · wallet activity list (incoming transfers shown as positive) |
| Activity (analytics) | Total spending this month · **Month / Week** range · bar chart **Money in vs Spending** · money-flow summary (in / out / net) · **Monthly budget** pace (spent vs ₱35,000, days left) · **Category budgets** (limits w/ progress; near-limit + over-limit states) · **Categories breakdown** · transaction list with **filters** (All / Expenses / Income / Transfers / Adjusted + wallet filter + search) grouped by day, pagination or load-more · **Export CSV** |
| Settings | Profile (name, initials avatar, email, edit profile) · Account: **Sign in / Create account**, **Backup & sync** (last synced, Sync now) · Appearance: **Dark theme**, **Accent color** palette, **Hide balances** · Security: **App lock** toggle, **Change PIN**, **Biometric unlock**, Privacy · **Manage schedules**, **Favorites** · About (version 1.0) |
| Sheets | **Add transaction** (Expense / Money in toggle, amount keypad, category grid — use the real category lists, wallet picker, note "Where it went"/"Source", date, *Save as favorite*) · **Transfer** (from → to wallet, amount, optional fee, confirm step) · **Update balance** (Add / Subtract / Set exact) · **Add wallet** (preset search grouped E-wallet / Bank / Digital Bank / Cash, name, account label, card colour, starting balance) · **Edit wallet** (+ delete with confirm) · **Transaction details** (amount, category, wallet, date/time, note, sync status "Saved on device"/"Synced", actions: Edit, Delete, Save as favorite, Make recurring) · **Edit transaction** · **Search / command palette** (wallets, transactions, actions) · **Schedules manager** + schedule editor (name, amount, expense/income, category, wallet, first due date, repeat Weekly / Every 2 weeks / Monthly, phone reminder) · **Monthly budget** editor · **Category budget** editor · **Favorite editor** · **Auth** (sign in / create account) · **Confirm dialogs** (delete) · **Toasts** ("Expense saved", "Transfer complete"…) |
| States | **Empty state** (new user, no wallets/transactions) · hidden balances (masked ₱ ••••) · loading/sync-in-progress · near/over budget warnings · no search results |

## 1. Data — MUST use `design-exploration/_spec/data.js`

Copy the whole file **verbatim** into your prototype's `<script>` (prototypes must be single-file / self-contained)
and derive every number from it (total ₱88,021.50, Nov spent ₱30,935.45, etc.). Today = **Tue 24 Nov 2026**.
User = **Justin Santos** (JS). You may *add* fields for your own presentation needs but never change values.
Real brand logos (128px rounded-square webp) are available as base64 data URIs in
`C:\Users\glenn\.gemini\antigravity\brain\bd68dc93-5e6e-4650-8566-1e8aab11c9b8\scratch\logos.js`
(keys: gcash maya bpi cash gotyme bdo unionbank maribank shopeepay grabpay metrobank landbank tonik coinsph paypal).
Embed only the ones you use (they're ~6 KB each). Using them is recommended for realism, but your concept may
instead render its own typographic/monogram marks if that serves the art direction better — be consistent.

## 2. Prototype technical requirements

* **One file**: `design-exploration/concept-0N/index.html` — HTML + CSS + vanilla JS, no frameworks, no external JS.
  Google Fonts `<link>` is allowed (always give a solid system fallback stack). All icons = inline SVG
  (draw a coherent icon set appropriate to your concept — consistent stroke width/corner style; no emoji as icons).
* **Viewport behaviour**: on screens ≤ 500px wide the app fills the viewport (100dvh, safe-area aware).
  On wider screens, render the app inside a realistic **390×844 phone frame** centred on a backdrop styled to match
  the concept, with a small caption (concept name + "← Design showcase" link to `../index.html`).
* **Hash router (mandatory, used by QA + the showcase)**. Every screen/sheet must be directly reachable:
  `#/intro #/lock #/auth #/home #/wallets #/wallet/<id> #/activity #/activity/budgets #/settings`
  `#/sheet/add-tx #/sheet/add-income #/sheet/transfer #/sheet/update #/sheet/add-wallet #/sheet/edit-wallet/<id>`
  `#/sheet/tx/<txId> #/sheet/edit-tx/<txId> #/sheet/search #/sheet/schedules #/sheet/schedule-edit #/sheet/budget`
  `#/sheet/category-budget/<Category> #/sheet/favorite #/sheet/profile #/sheet/pin #/sheet/confirm-delete #/empty`
  Sheets open **over** their natural parent screen (home unless obvious). `#/empty` shows the new-user empty home.
  In-app navigation should also update the hash so back/forward works. Unknown hash → home. No hash → `#/intro`
  which auto-advances to `#/lock`, then unlock → home (PIN is **1234**; any 4 digits can also unlock after the demo
  hint is shown — show a subtle "Demo PIN 1234" hint).
* **Real interactivity** (state kept in JS memory): adding an expense actually deducts from the wallet, updates totals,
  prepends to Recent & Activity, shows a toast; transfers move money; update balance works; hide-balances masks
  everything app-wide; dark/light theme toggle works (every concept must ship *both* themes, even if one is primary);
  accent colour picker works; filters, range toggle, search, tabs, reorder, delete-with-confirm all work.
  A "Reset demo" affordance can live in Settings › About.
* **Motion**: purposeful, 150–350 ms, custom easing (`cubic-bezier(.2,.8,.2,1)` or springy equivalents). Sheet
  slide-up with drag-handle (drag-to-dismiss is a bonus), screen transitions, number count-up on balance, chart
  bar/arc grow-in, press states (scale .97), toggle springs, toast in/out, PIN dot fill + error shake.
  Respect `prefers-reduced-motion`.
* **Accessibility**: text contrast ≥ 4.5:1 for body, ≥ 3:1 for large numerals; touch targets ≥ 44px; visible focus
  rings; `aria-label` on icon buttons; money uses tabular figures (`font-variant-numeric: tabular-nums`);
  never encode meaning by colour alone (use +/− signs, arrows, labels).
* **Implementability**: everything must be buildable in RN (flex layouts, SVG, gradients via expo-linear-gradient,
  no CSS-only effects that are impossible natively — avoid `backdrop-filter` as a core dependency, avoid
  mix-blend-mode reliance). Define your **design tokens as CSS custom properties** at the top (colour, type scale,
  spacing, radius, elevation, motion) — this becomes the RN theme later.
* **No console errors.** Test with the harness (below).

## 3. Quality bar — "human-designed, not AI slop"

Avoid: purple-blue gradient blobs, glassmorphism everywhere, generic 3-stat card grids, every element in a rounded
card, emoji icons, random decorative circles, centred-everything, lorem-ipsum vibes, inconsistent radii, low
contrast grey-on-grey text, too many accent colours.

Aim for: a strong **typographic hierarchy** (one hero number per screen), deliberate **grid & spacing scale**
(4/8-based), restraint with colour (1 accent + semantic colours), real **content density** that a finance user
needs, considered **micro-copy** in a Filipino-English context (e.g. "Padala kay Mama", "Payday in 6 days"),
signature details that make the concept memorable, and consistent components across every screen.
Charts must be legible (labels, axis hints, values on focus/tap) and drawn in the concept's style.

## 4. QA workflow (mandatory, iterate ≥ 2 rounds)

```
node design-exploration/_spec/shoot.mjs design-exploration/concept-0N            # standard 17-route set
node design-exploration/_spec/shoot.mjs design-exploration/concept-0N home settings --full   # full-page
node design-exploration/_spec/shoot.mjs design-exploration/concept-0N "home::document.querySelector('[data-qa=fab]').click()"
node design-exploration/_spec/shoot.mjs design-exploration/concept-0N home --w=1440 --h=900   # desktop frame
```
Screenshots land in `concept-0N/_shots/`. **Open and look at every PNG** (read_file) and fix: overflow/clipping,
misalignment, cramped spacing, weak hierarchy, contrast, inconsistent radii/icons, empty-looking areas, sheets
that cover content badly, and any console error. Check both themes (add `?theme=light` / `?theme=dark` query
support so QA can force a theme) and the hidden-balances state (`?hidden=1`). Delete `_shots/` when finished.

## 5. Deliverable report (return to coordinator)

Concept name, one-line philosophy, palette (hex), type pairing, radius/spacing/elevation rules, navigation model,
signature elements, 5–7 key design decisions, UX advantages, RN implementation notes, known limitations.
