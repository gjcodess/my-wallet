import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type React from "react";

type Tab = "home" | "wallets" | "activity" | "settings";
type Sheet = "add" | "entry" | "transfer" | "update" | null;
type Tone =
  | "blue"
  | "lime"
  | "yellow"
  | "navy"
  | "mint"
  | "lilac"
  | "coral"
  | "ocean"
  | "plum"
  | "sunset"
  | "graphite"
  | "rose";
type Wallet = {
  id: number;
  name: string;
  type: string;
  balance: number;
  mark: string;
  tone: Tone;
  account: string;
};
type ActivityItem = {
  id: number;
  title: string;
  wallet: string;
  date: string;
  amount: number;
  icon: string;
  kind: string;
};

const tonePalette: Record<Tone, { label: string; from: string; to: string; ink: string }> = {
  blue: { label: "Blue", from: "#8fd0ff", to: "#2563eb", ink: "#ffffff" },
  lime: { label: "Lime", from: "#e3ff86", to: "#8fdd32", ink: "#14201a" },
  yellow: { label: "Sun", from: "#fff58a", to: "#f2c715", ink: "#211b07" },
  mint: { label: "Mint", from: "#d8fff0", to: "#6fd6a8", ink: "#102b22" },
  lilac: { label: "Lilac", from: "#f3edff", to: "#b8a0f2", ink: "#211938" },
  navy: { label: "Navy", from: "#3c5c9a", to: "#111b34", ink: "#ffffff" },
  coral: { label: "Coral", from: "#ffd0bf", to: "#f06f5f", ink: "#341611" },
  ocean: { label: "Ocean", from: "#79efff", to: "#2477d8", ink: "#ffffff" },
  plum: { label: "Plum", from: "#c29aff", to: "#4c2ca8", ink: "#ffffff" },
  sunset: { label: "Sunset", from: "#ffe682", to: "#ff875f", ink: "#30170d" },
  graphite: { label: "Graphite", from: "#788396", to: "#222833", ink: "#ffffff" },
  rose: { label: "Rose", from: "#ffe0ec", to: "#e66b9f", ink: "#35111f" },
};

const toneStyle = (tone: Tone) => {
  const palette = tonePalette[tone] || tonePalette.blue;
  return {
    "--tone-from": palette.from,
    "--tone-to": palette.to,
    "--tone-ink": palette.ink,
    "--tone": `linear-gradient(135deg, ${palette.from}, ${palette.to})`,
  } as React.CSSProperties;
};

const initialWallets: Wallet[] = [
  {
    id: 1,
    name: "GCash",
    type: "E-wallet",
    balance: 18450.75,
    mark: "G",
    tone: "blue",
    account: "Personal",
  },
  {
    id: 2,
    name: "Maya",
    type: "E-wallet",
    balance: 7680.25,
    mark: "M",
    tone: "yellow",
    account: "Savings",
  },
  {
    id: 3,
    name: "BPI Savings",
    type: "Bank",
    balance: 42840.5,
    mark: "BPI",
    tone: "navy",
    account: "Primary bank",
  },
  { id: 4, name: "Cash", type: "Cash", balance: 6350, mark: "₱", tone: "mint", account: "On hand" },
  {
    id: 5,
    name: "GoTyme",
    type: "Bank",
    balance: 12700,
    mark: "GT",
    tone: "lilac",
    account: "Emergency fund",
  },
];

const initialActivities: ActivityItem[] = [
  {
    id: 1,
    title: "SM Supermarket",
    wallet: "GCash",
    date: "Today, 6:42 PM",
    amount: -1856.35,
    icon: "bag",
    kind: "Payment",
  },
  {
    id: 2,
    title: "Balance adjustment",
    wallet: "Cash",
    date: "Today, 9:15 AM",
    amount: 500,
    icon: "adjust",
    kind: "Updated",
  },
  {
    id: 3,
    title: "Monthly salary",
    wallet: "BPI Savings",
    date: "May 31, 8:00 AM",
    amount: 32500,
    icon: "arrow-down",
    kind: "Received",
  },
  {
    id: 4,
    title: "GCash to Maya",
    wallet: "GCash",
    date: "May 30, 4:21 PM",
    amount: -2000,
    icon: "swap",
    kind: "Transfer",
  },
  {
    id: 5,
    title: "Meralco bill",
    wallet: "Maya",
    date: "May 29, 7:32 PM",
    amount: -3241.6,
    icon: "bolt",
    kind: "Bills",
  },
  {
    id: 6,
    title: "Coffee Project",
    wallet: "Cash",
    date: "May 29, 10:06 AM",
    amount: -285,
    icon: "cup",
    kind: "Food",
  },
];

const money = (value: number, compact = false) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 2,
    minimumFractionDigits: compact ? 0 : 2,
  }).format(value);

const splitMoney = (value: number) => {
  const [whole, cents] = money(value).replace("₱", "").split(".");
  return { whole, cents };
};

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    home: (
      <>
        <path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19Z" />
        <path d="M9.5 20.5V15h5v5.5" />
      </>
    ),
    wallet: (
      <>
        <path d="M4.5 6h14A1.5 1.5 0 0 1 20 7.5v11a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-12A2.5 2.5 0 0 1 6.5 4H17" />
        <path d="M15 11h5v4h-5a2 2 0 0 1 0-4Z" />
      </>
    ),
    activity: (
      <>
        <path d="M5 19V11M10 19V5M15 19v-6M20 19V8" />
      </>
    ),
    settings: (
      <>
        <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
        <circle cx="16" cy="7" r="2" />
        <circle cx="8" cy="17" r="2" />
      </>
    ),
    eye: (
      <>
        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),
    "eye-off": (
      <>
        <path d="m3 3 18 18M10.7 6.1A9.7 9.7 0 0 1 12 6c6 0 9.5 6 9.5 6a15 15 0 0 1-2.1 2.7M6.1 6.1C3.8 7.8 2.5 12 2.5 12s3.5 6 9.5 6a9.3 9.3 0 0 0 3-.5M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    swap: (
      <>
        <path d="m7 7-3 3 3 3M4 10h15M17 17l3-3-3-3" />
      </>
    ),
    "arrow-down": (
      <>
        <path d="M12 4v15M6 13l6 6 6-6" />
      </>
    ),
    "arrow-up": (
      <>
        <path d="M12 20V5M6 11l6-6 6 6" />
      </>
    ),
    "arrow-out": (
      <>
        <path d="M7 17 17 7M8 7h9v9" />
      </>
    ),
    chevron: <path d="m9 5 7 7-7 7" />,
    down: <path d="m6 9 6 6 6-6" />,
    back: <path d="m15 5-7 7 7 7" />,
    more: (
      <>
        <circle cx="5" cy="12" r=".9" fill="currentColor" />
        <circle cx="12" cy="12" r=".9" fill="currentColor" />
        <circle cx="19" cy="12" r=".9" fill="currentColor" />
      </>
    ),
    close: <path d="m6 6 12 12M18 6 6 18" />,
    check: <path d="m5 12 4.2 4.2L19 6.5" />,
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </>
    ),
    moon: <path d="M20 15.2A8.5 8.5 0 0 1 8.8 4a8.5 8.5 0 1 0 11.2 11.2Z" />,
    lock: (
      <>
        <rect x="4.5" y="10" width="15" height="10.5" rx="2.5" />
        <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
      </>
    ),
    shield: <path d="M12 3 19.5 6v5.5c0 4.7-3.2 7.9-7.5 9.5-4.3-1.6-7.5-4.8-7.5-9.5V6Z" />,
    cloud: <path d="M6.5 18a4 4 0 0 1-.4-8A6 6 0 0 1 17.8 9.4 4.3 4.3 0 0 1 17.5 18Z" />,
    info: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 11v5M12 8v.2" />
      </>
    ),
    bag: (
      <>
        <path d="M5.5 8h13l-1 12.5h-11Z" />
        <path d="M9 9V6.5a3 3 0 0 1 6 0V9" />
      </>
    ),
    adjust: (
      <>
        <path d="M5 12h14M12 5v14" />
      </>
    ),
    cup: (
      <>
        <path d="M5 8h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5ZM16 10h1.5a2.5 2.5 0 0 1 0 5H16" />
      </>
    ),
    bolt: <path d="m13 2-7.5 12h6l-1 8L18 10h-6Z" />,
    car: (
      <>
        <path d="M5 16h14l-1.4-5.2A2.5 2.5 0 0 0 15.2 9H8.8a2.5 2.5 0 0 0-2.4 1.8Z" />
        <path d="M4 16v3h3v-3M17 16v3h3v-3M7.5 13h.1M16.5 13h.1" />
      </>
    ),
    briefcase: (
      <>
        <rect x="3.5" y="7" width="17" height="12" rx="2.5" />
        <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3.5 12h17" />
      </>
    ),
    gift: (
      <>
        <rect x="4" y="9" width="16" height="11" rx="2" />
        <path d="M3.5 9h17v4h-17ZM12 9v11M12 9H8.5a2 2 0 1 1 2-3.2L12 9Zm0 0h3.5a2 2 0 1 0-2-3.2L12 9Z" />
      </>
    ),
    heart: (
      <path d="M20.5 8.5c0 5-8.5 10.5-8.5 10.5S3.5 13.5 3.5 8.5A4.3 4.3 0 0 1 12 6a4.3 4.3 0 0 1 8.5 2.5Z" />
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 4 4" />
      </>
    ),
    edit: (
      <>
        <path d="m14 5 5 5-9.5 9.5H4.5v-5Z" />
        <path d="m12 7 5 5" />
      </>
    ),
    grid: (
      <>
        <rect x="4" y="4" width="6" height="6" rx="1.5" />
        <rect x="14" y="4" width="6" height="6" rx="1.5" />
        <rect x="4" y="14" width="6" height="6" rx="1.5" />
        <rect x="14" y="14" width="6" height="6" rx="1.5" />
      </>
    ),
    bank: (
      <>
        <path d="m3 9 9-5 9 5M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18" />
      </>
    ),
    phone: (
      <>
        <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
        <path d="M11 18.5h2" />
      </>
    ),
    cash: (
      <>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <circle cx="12" cy="12" r="2.5" />
        <path d="M6.5 9v.1M17.5 15v.1" />
      </>
    ),
    sync: (
      <>
        <path d="M20 7v5h-5M4 17v-5h5" />
        <path d="M18.5 12A6.5 6.5 0 0 0 6.7 8M5.5 12a6.5 6.5 0 0 0 11.8 4" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function Amount({
  value,
  hidden,
  size = "md",
}: {
  value: number;
  hidden: boolean;
  size?: "sm" | "md" | "lg";
}) {
  if (hidden) return <span className={`amount ${size}`}>₱ ••••••</span>;
  const { whole, cents } = splitMoney(value);
  return (
    <span className={`amount ${size}`}>
      <small>₱</small>
      {whole}
      <em>.{cents}</em>
    </span>
  );
}

function WalletFolder({
  wallet,
  hidden,
  onClick,
  onMenu,
  compact = false,
  className = "",
}: {
  wallet: Wallet;
  hidden: boolean;
  onClick?: () => void;
  onMenu?: () => void;
  compact?: boolean;
  className?: string;
}) {
  return (
    <article
      className={`wallet-folder ${wallet.tone} ${compact ? "compact" : ""} ${className}`}
      style={toneStyle(wallet.tone)}
      onClick={onClick}
    >
      <FolderSurface tab={0.6} tabHeight={compact ? 40 : 44} radius={compact ? 25 : 28} notch>
        <div className="folder-tab">
          <span className="wallet-logo">{wallet.mark}</span>
          <strong>{wallet.name}</strong>
        </div>
        <button
          className="folder-menu"
          onClick={(e) => {
            e.stopPropagation();
            onMenu?.();
          }}
          aria-label={`${wallet.name} options`}
        >
          <Icon name="more" size={18} />
        </button>
        <div className="folder-body">
          <span className="folder-label">Available balance</span>
          <Amount value={wallet.balance} hidden={hidden} size={compact ? "md" : "lg"} />
          <div className="folder-meta">
            <div>
              <span>Wallet type</span>
              <strong>{wallet.type}</strong>
            </div>
            <div>
              <span>Label</span>
              <strong>{wallet.account}</strong>
            </div>
          </div>
        </div>
      </FolderSurface>
    </article>
  );
}

function folderGeometry(
  width: number,
  height: number,
  tab: number,
  tabHeight: number,
  radius: number,
  gap: number,
) {
  const w = Math.max(width, 1);
  const h = Math.max(height, tabHeight + radius * 2);
  const r = Math.min(radius, w / 5, h / 3);
  const tabEnd = Math.min(w - r * 2.4, w * tab);
  const shoulder = Math.min(32, w * 0.085);
  const shoulderStart = tabEnd - shoulder;
  const shoulderEnd = tabEnd + shoulder;
  const gapX = gap * 1.45;
  const notchHeight = tabHeight - gap;
  const notchRadius = Math.min(18, notchHeight / 2);
  const notchX = tabEnd + gapX + shoulder * 0.35;
  const folder = [
    `M0 ${r}`,
    `C0 ${r * 0.45} ${r * 0.45} 0 ${r} 0`,
    `H${shoulderStart}`,
    `C${tabEnd} 0 ${tabEnd} ${tabHeight} ${shoulderEnd} ${tabHeight}`,
    `H${w - r}`,
    `C${w - r * 0.45} ${tabHeight} ${w} ${tabHeight + r * 0.45} ${w} ${tabHeight + r}`,
    `V${h - r}`,
    `C${w} ${h - r * 0.45} ${w - r * 0.45} ${h} ${w - r} ${h}`,
    `H${r}`,
    `C${r * 0.45} ${h} 0 ${h - r * 0.45} 0 ${h - r}`,
    "Z",
  ].join(" ");
  const notch = [
    `M${shoulderStart + gapX} 0`,
    `H${w - notchRadius}`,
    `C${w - notchRadius * 0.45} 0 ${w} ${notchRadius * 0.45} ${w} ${notchRadius}`,
    `V${notchHeight - notchRadius}`,
    `C${w} ${notchHeight - notchRadius * 0.45} ${w - notchRadius * 0.45} ${notchHeight} ${w - notchRadius} ${notchHeight}`,
    `H${shoulderEnd + gapX}`,
    `C${tabEnd + gapX} ${notchHeight} ${tabEnd + gapX} 0 ${shoulderStart + gapX} 0`,
    "Z",
  ].join(" ");
  return { folder, notch, notchX, notchHeight };
}

function FolderSurface({
  children,
  className = "",
  tab = 0.62,
  tabHeight = 34,
  radius = 26,
  notch = false,
  gap = 7,
}: {
  children: React.ReactNode;
  className?: string;
  tab?: number;
  tabHeight?: number;
  radius?: number;
  notch?: boolean;
  gap?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const gradientId = useId().replace(/:/g, "");
  const [size, setSize] = useState({ width: 360, height: 200 });

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => setSize({ width: element.offsetWidth, height: element.offsetHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const geometry = folderGeometry(size.width, size.height, tab, tabHeight, radius, gap);

  return (
    <div
      ref={ref}
      className={`folder-surface ${notch ? "has-notch" : ""} ${className}`}
      style={
        {
          "--tab-h": `${tabHeight}px`,
          "--notch-x": `${geometry.notchX}px`,
          "--notch-h": `${geometry.notchHeight}px`,
        } as React.CSSProperties
      }
    >
      <svg
        className="folder-svg"
        viewBox={`0 0 ${size.width} ${size.height}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" style={{ stopColor: "var(--tone-from, var(--soft))" }} />
            <stop offset="100%" style={{ stopColor: "var(--tone-to, var(--soft))" }} />
          </linearGradient>
        </defs>
        <path className="folder-main" d={geometry.folder} fill={`url(#${gradientId})`} />
        {notch && (
          <>
            <path className="folder-notch" d={geometry.notch} fill={`url(#${gradientId})`} />
            <path className="folder-notch-gloss" d={geometry.notch} />
          </>
        )}
      </svg>
      <div className="folder-content">{children}</div>
    </div>
  );
}

function TxRow({ item, hidden }: { item: ActivityItem; hidden: boolean }) {
  return (
    <div className="tx-row">
      <span className={`tx-icon ${item.amount > 0 ? "in" : ""}`}>
        <Icon name={item.icon} size={18} />
      </span>
      <div className="row-main">
        <strong>{item.title}</strong>
        <span>
          {item.kind} · {item.wallet}
        </span>
      </div>
      <div className="tx-value">
        <strong className={item.amount > 0 ? "positive" : ""}>
          {hidden ? "••••" : `${item.amount > 0 ? "+" : "-"} ${money(Math.abs(item.amount))}`}
        </strong>
        <span>{item.date.split(",")[0]}</span>
      </div>
    </div>
  );
}

function App() {
  const [tab, setTab] = useState<Tab>("home");
  const [wallets, setWallets] = useState<Wallet[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("my-wallet-folder-v2") || "null") as
        | Wallet[]
        | null;
      return saved?.length
        ? saved.map((wallet) =>
            wallet.id === 1 && wallet.name === "GCash" && wallet.tone === "lime"
              ? { ...wallet, tone: "blue" }
              : wallet,
          )
        : initialWallets;
    } catch {
      return initialWallets;
    }
  });
  const [hidden, setHidden] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem("my-wallet-theme") === "dark");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [toast, setToast] = useState("");
  const [activityItems, setActivityItems] = useState<ActivityItem[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("my-wallet-activity-v1") || "null") as
        | ActivityItem[]
        | null;
      return saved?.length ? saved : initialActivities;
    } catch {
      return initialActivities;
    }
  });
  const selected = wallets.find((w) => w.id === selectedId) || null;
  const total = useMemo(() => wallets.reduce((sum, w) => sum + w.balance, 0), [wallets]);

  useEffect(() => localStorage.setItem("my-wallet-folder-v2", JSON.stringify(wallets)), [wallets]);
  useEffect(() => localStorage.setItem("my-wallet-theme", dark ? "dark" : "light"), [dark]);
  useEffect(
    () => localStorage.setItem("my-wallet-activity-v1", JSON.stringify(activityItems)),
    [activityItems],
  );
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const open = (next: Sheet, wallet?: Wallet) => {
    if (wallet) setSelectedId(wallet.id);
    setSheet(next);
  };

  return (
    <div className={`app-shell ${dark ? "dark" : ""}`}>
      <main className="phone-frame">
        <div className="status-bar">
          <span>9:41</span>
          <span className="camera-pill" />
          <div className="status-icons">
            <i />
            <i />
            <b />
          </div>
        </div>
        {selected && !sheet ? (
          <WalletDetail
            wallet={selected}
            activities={activityItems}
            hidden={hidden}
            onBack={() => setSelectedId(null)}
            onUpdate={() => open("update", selected)}
            onTransfer={() => open("transfer", selected)}
          />
        ) : (
          <>
            <div className="screen-scroll">
              {tab === "home" && (
                <Home
                  wallets={wallets}
                  activities={activityItems}
                  total={total}
                  hidden={hidden}
                  setHidden={setHidden}
                  onWallet={(w) => setSelectedId(w.id)}
                  onSheet={open}
                  setTab={setTab}
                />
              )}
              {tab === "wallets" && (
                <Wallets
                  wallets={wallets}
                  total={total}
                  hidden={hidden}
                  onWallet={(w) => setSelectedId(w.id)}
                  onAdd={() => open("add")}
                />
              )}
              {tab === "activity" && <Activity activities={activityItems} hidden={hidden} />}
              {tab === "settings" && (
                <Settings
                  dark={dark}
                  setDark={setDark}
                  hidden={hidden}
                  setHidden={setHidden}
                  showToast={setToast}
                />
              )}
            </div>
            <BottomNav tab={tab} setTab={setTab} onAdd={() => open("entry")} />
          </>
        )}
        {sheet && (
          <SheetView
            type={sheet}
            wallets={wallets}
            selected={selected}
            setWallets={setWallets}
            setActivities={setActivityItems}
            onClose={() => setSheet(null)}
            onDone={(message) => {
              setSheet(null);
              setSelectedId(null);
              setToast(message);
            }}
          />
        )}
        {toast && (
          <div className="toast">
            <span>
              <Icon name="check" size={15} />
            </span>
            {toast}
          </div>
        )}
      </main>
    </div>
  );
}

function Home({
  wallets,
  activities,
  total,
  hidden,
  setHidden,
  onWallet,
  onSheet,
  setTab,
}: {
  wallets: Wallet[];
  activities: ActivityItem[];
  total: number;
  hidden: boolean;
  setHidden: (v: boolean) => void;
  onWallet: (w: Wallet) => void;
  onSheet: (s: Sheet, w?: Wallet) => void;
  setTab: (t: Tab) => void;
}) {
  const [front, setFront] = useState(0);
  const ordered = [...wallets.slice(front), ...wallets.slice(0, front)];
  const featured = ordered[0];
  return (
    <div className="page home-page">
      <header className="home-header">
        <div>
          <p>Hi, Justin</p>
          <h1>Welcome back!</h1>
        </div>
        <button
          className="profile-orb"
          onClick={() => setTab("settings")}
          aria-label="Open settings"
        >
          <span>JS</span>
          <i>
            <Icon name="grid" size={13} />
          </i>
        </button>
      </header>

      <section className="total-strip">
        <div>
          <span>Total money</span>
          <Amount value={total} hidden={hidden} size="sm" />
        </div>
        <button onClick={() => setHidden(!hidden)} aria-label="Toggle balances">
          <Icon name={hidden ? "eye-off" : "eye"} size={18} />
        </button>
      </section>

      <section className="wallet-stack" aria-label="Wallet stack">
        <button
          className="stack-layer stack-add"
          style={toneStyle("navy")}
          onClick={() => onSheet("add")}
        >
          <FolderSurface tab={0.6} tabHeight={42} radius={25} notch>
            <span className="stack-label">Add new wallet</span>
            <b>
              <Icon name="plus" size={16} />
            </b>
          </FolderSurface>
        </button>
        {ordered[1] && (
          <button
            className={`stack-layer stack-peek ${ordered[1].tone}`}
            style={toneStyle(ordered[1].tone)}
            onClick={() => setFront((front + 1) % wallets.length)}
            aria-label={`Bring ${ordered[1].name} to front`}
          >
            <FolderSurface tab={0.6} tabHeight={42} radius={25} notch>
              <span className="stack-label">
                <span className="wallet-logo">{ordered[1].mark}</span>
                <strong>{ordered[1].name}</strong>
              </span>
              <i>
                <Icon name="swap" size={15} />
              </i>
            </FolderSurface>
          </button>
        )}
        {featured && (
          <WalletFolder
            key={featured.id}
            wallet={featured}
            hidden={hidden}
            onClick={() => onWallet(featured)}
            onMenu={() => onSheet("update", featured)}
            className="stack-front"
          />
        )}
      </section>
      <div className="stack-dots">
        {wallets.map((w, i) => (
          <button
            key={w.id}
            className={i === front ? "active" : ""}
            onClick={() => setFront(i)}
            aria-label={`Show ${w.name}`}
          />
        ))}
      </div>

      <section className="action-grid">
        <ActionButton
          icon="edit"
          label="Update"
          tone="blue"
          onClick={() => onSheet("update", featured)}
        />
        <ActionButton
          icon="swap"
          label="Transfer"
          tone="yellow"
          onClick={() => onSheet("transfer", featured)}
        />
        <ActionButton icon="plus" label="Add" tone="navy" onClick={() => onSheet("add")} />
        <ActionButton icon="grid" label="Wallets" tone="mint" onClick={() => setTab("wallets")} />
      </section>

      <section className="section">
        <SectionTitle title="All transactions" action="Today" onClick={() => setTab("activity")} />
        <div className="tx-list">
          {activities.slice(0, 4).map((item) => (
            <TxRow key={item.id} item={item} hidden={hidden} />
          ))}
        </div>
      </section>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  tone,
  onClick,
}: {
  icon: string;
  label: string;
  tone: Tone;
  onClick: () => void;
}) {
  return (
    <button className={`action-button ${tone}`} style={toneStyle(tone)} onClick={onClick}>
      <span>
        <Icon name={icon} size={18} />
      </span>
      <strong>{label}</strong>
    </button>
  );
}

function SectionTitle({
  title,
  action,
  onClick,
}: {
  title: string;
  action?: string;
  onClick?: () => void;
}) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      {action && (
        <button onClick={onClick}>
          {action}
          <Icon name="down" size={14} />
        </button>
      )}
    </div>
  );
}

function Wallets({
  wallets,
  total,
  hidden,
  onWallet,
  onAdd,
}: {
  wallets: Wallet[];
  total: number;
  hidden: boolean;
  onWallet: (w: Wallet) => void;
  onAdd: () => void;
}) {
  return (
    <div className="page">
      <TopBar
        title="My Wallets"
        right={
          <button className="round-button" onClick={onAdd} aria-label="Add wallet">
            <Icon name="plus" />
          </button>
        }
      />
      <div className="wallets-total">
        <span>Combined balance</span>
        <Amount value={total} hidden={hidden} size="lg" />
        <p>
          <Icon name="sync" size={14} /> Synced locally · {wallets.length} wallets
        </p>
      </div>
      <div className="wallet-list">
        {wallets.map((wallet) => (
          <button className="wallet-tile" key={wallet.id} onClick={() => onWallet(wallet)}>
            <span className={`tile-badge ${wallet.tone}`} style={toneStyle(wallet.tone)}>
              {wallet.mark}
            </span>
            <span className="row-main">
              <strong>{wallet.name}</strong>
              <span>
                {wallet.type} · {wallet.account}
              </span>
            </span>
            <span className="tile-value">
              <Amount value={wallet.balance} hidden={hidden} size="sm" />
              <Icon name="chevron" size={16} />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Activity({ activities, hidden }: { activities: ActivityItem[]; hidden: boolean }) {
  const [range, setRange] = useState("Month");
  const bars = [
    [42, 58],
    [62, 50],
    [48, 85],
    [38, 55],
    [71, 66],
    [56, 74],
  ];
  return (
    <div className="page">
      <TopBar
        title="Activity"
        right={
          <button className="round-button" aria-label="More">
            <Icon name="more" />
          </button>
        }
      />
      <div className="spending-head">
        <span>Total spending</span>
        <Amount value={11376.9} hidden={hidden} size="lg" />
      </div>
      <div className="chart-shell" style={toneStyle("navy")}>
        <FolderSurface className="chart-folder" tab={0.62} tabHeight={42} radius={28} notch>
          <button
            className="range-pill"
            onClick={() => setRange(range === "Month" ? "Week" : "Month")}
          >
            {range}
            <Icon name="down" size={13} />
          </button>
          <div className="chart-grid">
            <span>₱30k</span>
            <span>₱20k</span>
            <span>₱10k</span>
            <span>₱0</span>
          </div>
          <div className="bars">
            {bars.map(([a, b], i) => (
              <div key={i}>
                <span style={{ height: `${a}%` }} />
                <span style={{ height: `${b}%` }} />
                <small>{["Jan", "Feb", "Mar", "Apr", "May", "Jun"][i]}</small>
              </div>
            ))}
          </div>
        </FolderSurface>
      </div>
      <div className="flow-cards">
        <div className="flow-card income">
          <span>
            <Icon name="arrow-down" size={16} />
          </span>
          <p>
            Money in<strong>{hidden ? "••••" : money(36007)}</strong>
          </p>
        </div>
        <div className="flow-card expense">
          <span>
            <Icon name="arrow-up" size={16} />
          </span>
          <p>
            Money out<strong>{hidden ? "••••" : money(18070)}</strong>
          </p>
        </div>
      </div>
      <SectionTitle title="Categories" action="Expense" />
      <div className="category-scroll">
        {[
          ["bag", "Groceries", 4207],
          ["bolt", "Bills", 3241.6],
          ["cup", "Food", 2185],
          ["swap", "Transfers", 6200],
        ].map(([icon, label, amount]) => (
          <FolderSurface
            className="category-folder"
            key={label}
            tab={0.58}
            tabHeight={18}
            radius={20}
          >
            <Icon name={String(icon)} size={20} />
            <span>{label}</span>
            <strong>{hidden ? "••••" : money(Number(amount))}</strong>
          </FolderSurface>
        ))}
      </div>
      <section className="section">
        <SectionTitle title="Recent activity" action="Today" />
        <div className="tx-list">
          {activities.map((item) => (
            <TxRow key={item.id} item={item} hidden={hidden} />
          ))}
        </div>
      </section>
    </div>
  );
}

function Settings({
  dark,
  setDark,
  hidden,
  setHidden,
  showToast,
}: {
  dark: boolean;
  setDark: (v: boolean) => void;
  hidden: boolean;
  setHidden: (v: boolean) => void;
  showToast: (s: string) => void;
}) {
  return (
    <div className="page">
      <TopBar title="Settings" />
      <section className="profile-card">
        <span>JS</span>
        <div>
          <strong>Justin Santos</strong>
          <p>Offline-first wallet profile</p>
        </div>
        <Icon name="chevron" />
      </section>
      <SettingsGroup title="Appearance">
        <SettingRow
          icon={dark ? "moon" : "sun"}
          title="Dark theme"
          subtitle={dark ? "Enabled" : "Light mode"}
          control={<Switch on={dark} onClick={() => setDark(!dark)} label="Dark theme" />}
        />
        <SettingRow
          icon="eye"
          title="Hide balances"
          subtitle="Mask money across screens"
          control={<Switch on={hidden} onClick={() => setHidden(!hidden)} label="Hide balances" />}
        />
      </SettingsGroup>
      <SettingsGroup title="Security">
        <SettingRow
          icon="lock"
          title="App lock"
          subtitle="Fingerprint or screen lock"
          onClick={() => showToast("App lock is ready")}
        />
        <SettingRow
          icon="shield"
          title="Privacy"
          subtitle="Stored privately on device"
          onClick={() => showToast("Your data stays on this device")}
        />
      </SettingsGroup>
      <SettingsGroup title="Sync & data">
        <SettingRow
          icon="cloud"
          title="Backup & sync"
          subtitle="Last saved just now"
          onClick={() => showToast("All changes saved offline")}
        />
        <SettingRow
          icon="info"
          title="About My Wallet"
          subtitle="Version 2.0"
          onClick={() => showToast("You have the latest version")}
        />
      </SettingsGroup>
    </div>
  );
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="settings-group">
      <h3>{title}</h3>
      <div>{children}</div>
    </section>
  );
}

function SettingRow({
  icon,
  title,
  subtitle,
  control,
  onClick,
}: {
  icon: string;
  title: string;
  subtitle: string;
  control?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button className="setting-row" onClick={onClick}>
      <span className="setting-icon">
        <Icon name={icon} size={18} />
      </span>
      <span className="row-main">
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </span>
      {control || <Icon name="chevron" size={16} />}
    </button>
  );
}

function Switch({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <span
      role="switch"
      aria-label={label}
      aria-checked={on}
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`switch ${on ? "on" : ""}`}
    >
      <span />
    </span>
  );
}

function TopBar({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <header className="top-bar">
      {onBack ? (
        <button className="round-button" onClick={onBack} aria-label="Back">
          <Icon name="back" />
        </button>
      ) : (
        <span />
      )}
      <h1>{title}</h1>
      {right || <span />}
    </header>
  );
}

function WalletDetail({
  wallet,
  activities,
  hidden,
  onBack,
  onUpdate,
  onTransfer,
}: {
  wallet: Wallet;
  activities: ActivityItem[];
  hidden: boolean;
  onBack: () => void;
  onUpdate: () => void;
  onTransfer: () => void;
}) {
  const related = activities.filter((item) => item.wallet === wallet.name);
  return (
    <div className="detail-screen">
      <TopBar
        title={wallet.name}
        onBack={onBack}
        right={
          <button className="round-button" aria-label="Options">
            <Icon name="more" />
          </button>
        }
      />
      <div className="detail-content">
        <WalletFolder wallet={wallet} hidden={hidden} />
        <div className="detail-actions">
          <button onClick={onUpdate}>
            <Icon name="edit" size={18} />
            Update balance
          </button>
          <button onClick={onTransfer}>
            <Icon name="swap" size={18} />
            Transfer
          </button>
        </div>
        <SectionTitle title="Wallet activity" action="Recent" />
        {related.length ? (
          <div className="tx-list">
            {related.map((item) => (
              <TxRow key={item.id} item={item} hidden={hidden} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <span>
              <Icon name="activity" />
            </span>
            <h3>No activity yet</h3>
            <p>Balance updates and transfers for this wallet will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SheetView({
  type,
  wallets,
  selected,
  setWallets,
  setActivities,
  onClose,
  onDone,
}: {
  type: Exclude<Sheet, null>;
  wallets: Wallet[];
  selected: Wallet | null;
  setWallets: React.Dispatch<React.SetStateAction<Wallet[]>>;
  setActivities: React.Dispatch<React.SetStateAction<ActivityItem[]>>;
  onClose: () => void;
  onDone: (s: string) => void;
}) {
  const fallback = selected?.id || wallets[0]?.id || 0;
  const [name, setName] = useState("");
  const [category, setCategory] = useState("E-wallet");
  const [tone, setTone] = useState<Tone>("blue");
  const [balance, setBalance] = useState("");
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState(fallback);
  const [destination, setDestination] = useState(
    wallets.find((w) => w.id !== fallback)?.id || fallback,
  );
  const [walletId, setWalletId] = useState(fallback);
  const [entryType, setEntryType] = useState<"expense" | "income">("expense");
  const [entryCategory, setEntryCategory] = useState("Food");
  const [note, setNote] = useState("");
  const current = wallets.find((w) => w.id === walletId) || wallets[0];
  const sourceWallet = wallets.find((w) => w.id === source) || wallets[0];
  const preview: Wallet = {
    id: 0,
    name: name || "New wallet",
    type: category,
    balance: Number(balance) || 0,
    mark: (name || "NW").slice(0, 2).toUpperCase(),
    tone,
    account: "Manual tracking",
  };
  const transferValue = Number(amount);
  const entryValue = Number(amount);
  const entryWallet = wallets.find((w) => w.id === walletId) || wallets[0];
  const entryCategories =
    entryType === "expense"
      ? [
          ["Food", "cup"],
          ["Transport", "car"],
          ["Bills", "bolt"],
          ["Shopping", "bag"],
          ["Health", "heart"],
          ["Other", "adjust"],
        ]
      : [
          ["Salary", "briefcase"],
          ["Freelance", "phone"],
          ["Gift", "gift"],
          ["Refund", "arrow-down"],
          ["Other", "plus"],
        ];
  const entryIcon = entryCategories.find(([label]) => label === entryCategory)?.[1] || "adjust";
  const entryInvalid =
    !entryValue || (entryType === "expense" && entryValue > (entryWallet?.balance || 0));
  const transferInvalid =
    !transferValue || source === destination || transferValue > sourceWallet.balance;

  const recordActivity = (item: Omit<ActivityItem, "id" | "date">) => {
    const date = `Today, ${new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit" }).format(new Date())}`;
    setActivities((prev) => [{ ...item, id: Date.now(), date }, ...prev]);
  };

  const save = () => {
    if (type === "entry" && entryWallet && !entryInvalid) {
      const signedValue = entryType === "expense" ? -entryValue : entryValue;
      setWallets((prev) =>
        prev.map((w) => (w.id === entryWallet.id ? { ...w, balance: w.balance + signedValue } : w)),
      );
      recordActivity({
        title: note.trim() || entryCategory,
        wallet: entryWallet.name,
        amount: signedValue,
        icon: entryIcon,
        kind: entryType === "expense" ? entryCategory : "Money in",
      });
      onDone(`${entryType === "expense" ? "Expense" : "Money"} ${money(entryValue)} saved`);
    }
    if (type === "add" && name.trim()) {
      setWallets((prev) => [...prev, { ...preview, id: Date.now(), name: name.trim() }]);
      onDone(`${name.trim()} added`);
    }
    if (type === "update" && amount) {
      const difference = Number(amount) - current.balance;
      setWallets((prev) =>
        prev.map((w) => (w.id === walletId ? { ...w, balance: Number(amount) } : w)),
      );
      if (difference) {
        recordActivity({
          title: "Balance adjustment",
          wallet: current.name,
          amount: difference,
          icon: "adjust",
          kind: "Updated",
        });
      }
      onDone(`${current.name} balance updated`);
    }
    if (type === "transfer" && !transferInvalid) {
      setWallets((prev) =>
        prev.map((w) =>
          w.id === source
            ? { ...w, balance: w.balance - transferValue }
            : w.id === destination
              ? { ...w, balance: w.balance + transferValue }
              : w,
        ),
      );
      recordActivity({
        title: `${sourceWallet.name} to ${wallets.find((w) => w.id === destination)?.name}`,
        wallet: sourceWallet.name,
        amount: -transferValue,
        icon: "swap",
        kind: "Transfer",
      });
      onDone(`${money(transferValue)} transferred`);
    }
  };

  return (
    <div className="sheet-layer" role="dialog" aria-modal="true">
      <button className="sheet-backdrop" onClick={onClose} aria-label="Close" />
      <section className={`bottom-sheet ${type === "add" || type === "entry" ? "tall" : ""}`}>
        <div className="sheet-handle" />
        <TopBar
          title={
            type === "add"
              ? "New Wallet"
              : type === "entry"
                ? "Add Transaction"
                : type === "update"
                  ? "Update Balance"
                  : "Transfer"
          }
          onBack={onClose}
        />
        {type === "add" && (
          <>
            <WalletFolder wallet={preview} hidden={false} compact />
            <h3 className="form-title">Wallet detail</h3>
            <label className="soft-field">
              <span>Wallet name</span>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. UnionBank"
              />
            </label>
            <div className="field-row">
              <label className="soft-field">
                <span>Category</span>
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option>E-wallet</option>
                  <option>Bank</option>
                  <option>Cash</option>
                  <option>Savings</option>
                </select>
              </label>
              <label className="soft-field">
                <span>Opening balance</span>
                <input
                  inputMode="decimal"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value.replace(/[^\d.]/g, ""))}
                  placeholder="₱0.00"
                />
              </label>
            </div>
            <div className="tone-picker" aria-label="Wallet color">
              {(Object.keys(tonePalette) as Tone[]).map((t) => (
                <button
                  key={t}
                  className={`${t} ${tone === t ? "active" : ""}`}
                  style={toneStyle(t)}
                  onClick={() => setTone(t)}
                  aria-label={`${tonePalette[t].label} color`}
                  title={tonePalette[t].label}
                >
                  {tone === t && <Icon name="check" size={15} />}
                </button>
              ))}
            </div>
            <button className="save-button" disabled={!name.trim()} onClick={save}>
              Save wallet
            </button>
          </>
        )}
        {type === "entry" && entryWallet && (
          <div className={`transaction-flow ${entryType}`}>
            <div className="entry-toggle" role="tablist" aria-label="Transaction type">
              {(["expense", "income"] as const).map((kind) => (
                <button
                  key={kind}
                  className={entryType === kind ? "active" : ""}
                  onClick={() => {
                    setEntryType(kind);
                    setEntryCategory(kind === "expense" ? "Food" : "Salary");
                  }}
                  role="tab"
                  aria-selected={entryType === kind}
                >
                  <span>
                    <Icon name={kind === "expense" ? "arrow-up" : "arrow-down"} size={16} />
                  </span>
                  {kind === "expense" ? "Expense" : "Money in"}
                </button>
              ))}
            </div>

            <div
              className="entry-hero"
              style={toneStyle(entryType === "expense" ? "blue" : "yellow")}
            >
              <FolderSurface tab={0.58} tabHeight={42} radius={28} notch>
                <div className="entry-hero-tab">
                  <span className="entry-hero-icon">
                    <Icon name={entryIcon} size={16} />
                  </span>
                  <strong>{entryCategory}</strong>
                </div>
                <span className="entry-hero-badge">
                  {entryType === "expense" ? "Spend" : "Receive"}
                </span>
                <div className="entry-hero-body">
                  <label htmlFor="entry-amount">
                    {entryType === "expense" ? "Amount spent" : "Amount received"}
                  </label>
                  <div className="entry-amount-input">
                    <b>₱</b>
                    <input
                      id="entry-amount"
                      autoFocus
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="entry-balance-row">
                    <span>{entryWallet.name} after</span>
                    <strong>
                      {money(
                        entryWallet.balance +
                          (entryType === "expense" ? -1 : 1) * (entryValue || 0),
                      )}
                    </strong>
                  </div>
                </div>
              </FolderSurface>
            </div>

            <div className="entry-quick" aria-label="Quick amounts">
              {[100, 500, 1000, 5000].map((v) => (
                <button key={v} onClick={() => setAmount(String((entryValue || 0) + v))}>
                  +{money(v, true)}
                </button>
              ))}
            </div>

            <section className="entry-section">
              <div className="entry-section-head">
                <h3>From wallet</h3>
                <span>{wallets.length} wallets</span>
              </div>
              <div className="entry-wallets">
                {wallets.map((w) => (
                  <button
                    key={w.id}
                    className={walletId === w.id ? "active" : ""}
                    onClick={() => setWalletId(w.id)}
                  >
                    <span className="entry-wallet-mark" style={toneStyle(w.tone)}>
                      {w.mark}
                    </span>
                    <span>
                      <strong>{w.name}</strong>
                      <small>{money(w.balance)}</small>
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section className="entry-section">
              <div className="entry-section-head">
                <h3>Category</h3>
                <span>{entryType === "expense" ? "Where it went" : "Source"}</span>
              </div>
              <div className="category-picker">
                {entryCategories.map(([label, icon]) => (
                  <button
                    key={label}
                    className={entryCategory === label ? "active" : ""}
                    onClick={() => setEntryCategory(label)}
                  >
                    <span>
                      <Icon name={icon} size={17} />
                    </span>
                    {label}
                  </button>
                ))}
              </div>
            </section>

            <label className="entry-note">
              <span>
                <Icon name="edit" size={17} />
              </span>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  entryType === "expense"
                    ? "Add a note, e.g. lunch with team"
                    : "Add a note, e.g. client payout"
                }
              />
            </label>
            {entryType === "expense" && entryValue > entryWallet.balance && (
              <p className="error-text">This is higher than the wallet balance.</p>
            )}
            <div className="entry-footer">
              <div>
                <span>{entryType === "expense" ? "Expense" : "Money in"}</span>
                <strong>{entryValue ? money(entryValue) : "₱0.00"}</strong>
              </div>
              <button className="save-button" disabled={entryInvalid} onClick={save}>
                {entryType === "expense" ? "Save expense" : "Add money"}
                <Icon name="check" size={18} />
              </button>
            </div>
          </div>
        )}
        {type === "update" && current && (
          <>
            <WalletFolder wallet={current} hidden={false} compact />
            <label className="soft-field select-field">
              <span>Wallet</span>
              <select value={walletId} onChange={(e) => setWalletId(Number(e.target.value))}>
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="amount-entry">
              <span>New balance</span>
              <div>
                <b>₱</b>
                <input
                  autoFocus
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                  placeholder="0.00"
                />
              </div>
              <p>Current: {money(current.balance)}</p>
            </div>
            <div className="quick-amounts">
              {[500, 1000, 5000].map((v) => (
                <button key={v} onClick={() => setAmount(String(current.balance + v))}>
                  + {money(v, true)}
                </button>
              ))}
            </div>
            <button className="save-button" disabled={!amount} onClick={save}>
              Save new balance
            </button>
          </>
        )}
        {type === "transfer" && (
          <>
            <div className="transfer-route">
              <label>
                <span>From</span>
                <select value={source} onChange={(e) => setSource(Number(e.target.value))}>
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                onClick={() => {
                  setSource(destination);
                  setDestination(source);
                }}
                aria-label="Swap wallets"
              >
                <Icon name="swap" size={18} />
              </button>
              <label>
                <span>To</span>
                <select
                  value={destination}
                  onChange={(e) => setDestination(Number(e.target.value))}
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="amount-entry">
              <span>Amount to transfer</span>
              <div>
                <b>₱</b>
                <input
                  autoFocus
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                  placeholder="0.00"
                />
              </div>
              <p>Available: {money(sourceWallet.balance)}</p>
            </div>
            {source === destination && <p className="error-text">Choose two different wallets.</p>}
            {transferValue > sourceWallet.balance && (
              <p className="error-text">Amount is higher than the available balance.</p>
            )}
            <div className="confirm-panel">
              <span>You will send</span>
              <strong>{transferValue ? money(transferValue) : "₱0.00"}</strong>
              <p>
                {sourceWallet.name} → {wallets.find((w) => w.id === destination)?.name}
              </p>
            </div>
            <button className="save-button" disabled={transferInvalid} onClick={save}>
              Confirm transfer
            </button>
          </>
        )}
      </section>
    </div>
  );
}

function BottomNav({
  tab,
  setTab,
  onAdd,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  onAdd: () => void;
}) {
  const items: { id: Tab; icon: string; label: string }[] = [
    { id: "home", icon: "home", label: "Home" },
    { id: "wallets", icon: "wallet", label: "Wallets" },
    { id: "activity", icon: "activity", label: "Activity" },
    { id: "settings", icon: "settings", label: "Settings" },
  ];
  return (
    <nav className="bottom-nav">
      {items.slice(0, 2).map((item) => (
        <NavButton
          key={item.id}
          {...item}
          active={tab === item.id}
          onClick={() => setTab(item.id)}
        />
      ))}
      <button className="nav-add" onClick={onAdd} aria-label="Add transaction">
        <Icon name="plus" size={22} />
      </button>
      {items.slice(2).map((item) => (
        <NavButton
          key={item.id}
          {...item}
          active={tab === item.id}
          onClick={() => setTab(item.id)}
        />
      ))}
    </nav>
  );
}

function NavButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button className={active ? "active" : ""} onClick={onClick}>
      <Icon name={icon} size={20} />
      <span>{label}</span>
    </button>
  );
}

export default App;
