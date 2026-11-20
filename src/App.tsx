import React, { useEffect, useRef, useState } from "react";

import {
  Activity,
  ArrowDownToLine,
  ArrowUpDown,
  BarChart3,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Database,
  FileSpreadsheet,
  FolderOpen,
  LayoutDashboard,
  LoaderCircle,
  LogIn,
  LogOut,
  Menu,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Truck,
  Upload,
  Users,
  X,
  AlertCircle,
  Braces,
  Terminal,
  Layers,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { api, ApiError } from "./api";
import type {
  User,
  Dataset,
  Profile,
  Rows,
  Preview,
  CleanOptions,
} from "./types";
import "./styles.css";

const samples = [
  {
    id: "retail",
    name: "Retail sales",
    label: "SALES & COMMERCE",
    description: "Find the patterns behind every purchase.",
    rows: "1,200",
    icon: BarChart3,
    color: "green",
    tags: ["Revenue", "Categories", "Regions"],
    bars: [32, 53, 43, 67, 55, 77, 69, 91, 79, 96, 82, 100],
  },
  {
    id: "subscriptions",
    name: "SaaS subscriptions",
    label: "PRODUCT & GROWTH",
    description: "Explore the numbers behind recurring revenue.",
    rows: "850",
    icon: Users,
    color: "purple",
    tags: ["Plans", "Revenue", "Customers"],
    bars: [22, 28, 33, 27, 44, 42, 53, 60, 57, 73, 85, 97],
  },
  {
    id: "logistics",
    name: "Delivery operations",
    label: "LOGISTICS & OPERATIONS",
    description: "Investigate what keeps deliveries moving.",
    rows: "640",
    icon: Truck,
    color: "blue",
    tags: ["Distance", "Delivery time", "Regions"],
    bars: [78, 61, 89, 55, 72, 49, 62, 42, 65, 39, 55, 34],
  },
];
const fmt = (value: number) => value.toLocaleString("en-ZA");
const label = (value: string) => value.replaceAll("_", " ");
const date = (value: string) =>
  new Intl.DateTimeFormat("en-ZA", {
    timeZone: "Africa/Johannesburg",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value)) + " +02:00";
const message = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong.";
type View = "overview" | "datasets" | "workspace" | "guide";
type Tab = "overview" | "explore" | "clean";
const defaults: CleanOptions = {
  trim: true,
  deduplicate: true,
  fillMissing: false,
  replacement: "Unknown",
  dropEmptyRows: false,
};

function Brand({ small = false }: { small?: boolean }) {
  return (
    <div className={`brand ${small ? "compact" : ""}`}>
      <div className="brand-mark">
        <span />
        <span />
        <span />
        <span />
      </div>
      {!small && (
        <div>
          data<span>detective</span>
          <small>FIND THE STORY.</small>
        </div>
      )}
    </div>
  );
}
function Spinner({ text = "Analysing your data…" }: { text?: string }) {
  return (
    <div className="loading">
      <LoaderCircle className="spin" size={24} />
      <span>{text}</span>
    </div>
  );
}
function ErrorNotice({ text }: { text: string }) {
  return text ? (
    <div role="alert" className="error">
      <AlertCircle size={18} />
      <span>{text}</span>
    </div>
  ) : null;
}
function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-content">
        <button
          className="icon-button close"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>
        <Brand small />
        <h2>{title}</h2>
        {subtitle && <p className="muted">{subtitle}</p>}
        {children}
      </div>
    </dialog>
  );
}

function App() {
  const [user, setUser] = useState<User | null>(null),
    [authReady, setAuthReady] = useState(false);
  const [view, setView] = useState<View>("overview"),
    [tab, setTab] = useState<Tab>("overview");
  const [datasets, setDatasets] = useState<Dataset[]>([]),
    [selected, setSelected] = useState<Dataset | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null),
    [profileError, setProfileError] = useState("");
  const [auth, setAuth] = useState<"login" | "register" | null>(null),
    [upload, setUpload] = useState(false),
    [mobile, setMobile] = useState(false);
  const [busy, setBusy] = useState(""),
    [error, setError] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const uploadRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    api<{ user: User }>("auth/session")
      .then((r) => setUser(r.user))
      .catch((e) => {
        if (!(e instanceof ApiError && e.status === 401)) setError(message(e));
      })
      .finally(() => setAuthReady(true));
  }, []);
  useEffect(() => {
    if (user)
      api<{ datasets: Dataset[] }>("datasets/list")
        .then((r) => setDatasets(r.datasets))
        .catch((e) => setError(message(e)));
    else setDatasets([]);
  }, [user, refresh]);
  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    setProfile(null);
    setProfileError("");
    api<Profile>("datasets/profile", { id: selected.id }, controller.signal)
      .then(setProfile)
      .catch((e) => {
        if (e.name !== "AbortError") setProfileError(message(e));
      });
    return () => controller.abort();
  }, [selected, refresh]);
  function navigate(next: View) {
    setView(next);
    setMobile(false);
    setError("");
  }
  function openDataset(dataset: Dataset) {
    setSelected(dataset);
    setTab("overview");
    navigate("workspace");
  }
  async function loadSample(kind: string, signedIn = !!user) {
    if (!signedIn) {
      setPending(kind);
      setAuth("register");
      return;
    }
    setBusy(kind);
    setError("");
    try {
      const result = await api<{ dataset: Dataset }>("datasets/sample", {
        kind,
      });
      setRefresh((v) => v + 1);
      openDataset(result.dataset);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy("");
    }
  }
  function startUpload() {
    if (!user) {
      setPending("upload");
      setAuth("register");
    } else setUpload(true);
  }
  async function uploadFile(file: File) {
    setError("");
    if (file.size > 1_000_000) {
      setError("Choose a CSV below 1 MB.");
      return;
    }
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Choose a .csv file.");
      return;
    }
    setBusy("upload");
    try {
      const csv = new TextDecoder("utf-8", { fatal: true }).decode(
        await file.arrayBuffer(),
      );
      const result = await api<{ dataset: Dataset }>("datasets/upload", {
        name: file.name,
        csv,
      });
      setUpload(false);
      setRefresh((v) => v + 1);
      openDataset(result.dataset);
    } catch (e) {
      setError(
        e instanceof TypeError
          ? "Please use a UTF-8 encoded CSV file."
          : message(e),
      );
    } finally {
      setBusy("");
      if (uploadRef.current) uploadRef.current.value = "";
    }
  }
  function authenticated(identity: User) {
    setUser(identity);
    setAuth(null);
    setError("");
    const action = pending;
    setPending(null);
    if (action === "upload") setUpload(true);
    else if (action) void loadSample(action, true);
  }
  async function logout() {
    try {
      await api("auth/logout");
      setUser(null);
      setSelected(null);
      setProfile(null);
      navigate("overview");
    } catch (e) {
      setError(message(e));
    }
  }
  return (
    <div className="app-shell">
      {mobile && (
        <button
          className="sidebar-backdrop"
          onClick={() => setMobile(false)}
          aria-label="Close navigation"
        />
      )}
      <aside className={`sidebar ${mobile ? "is-open" : ""}`}>
        <Brand />
        <div className="workspace-label">YOUR WORKSPACE</div>
        <nav aria-label="Main navigation">
          <button
            className={view === "overview" ? "active" : ""}
            onClick={() => navigate("overview")}
          >
            <LayoutDashboard size={19} />
            Overview
          </button>
          <button
            className={view === "datasets" ? "active" : ""}
            onClick={() => navigate("datasets")}
          >
            <Database size={19} />
            My datasets
            {user && <span className="nav-count">{datasets.length}</span>}
          </button>
          {selected && (
            <button
              className={view === "workspace" ? "active" : ""}
              onClick={() => navigate("workspace")}
            >
              <Activity size={19} />
              Data workspace
            </button>
          )}
        </nav>
        <div className="workspace-label learn-label">EXPLORE</div>
        <nav>
          <button
            className={view === "guide" ? "active" : ""}
            onClick={() => navigate("guide")}
          >
            <BookOpen size={19} />
            How it works
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="side-note">
            <div className="side-note-icon">
              <Sparkles size={19} />
            </div>
            <strong>
              A little curiosity.
              <br />A lot of possibility.
            </strong>
            <p>
              Good insights start with
              <br />a closer look at your data.
            </p>
            <button onClick={() => navigate("guide")}>
              Take a quick tour <ChevronRight size={15} />
            </button>
          </div>
          <div className="sidebar-footer">
            <span className="live-dot" />
            Local demo <span>v0.1</span>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>
              {view === "workspace"
                ? selected?.name
                : view === "guide"
                  ? "How it works"
                  : view === "datasets"
                    ? "My datasets"
                    : "Overview"}
            </strong>
          </div>
          <div className="topbar-actions">
            <span className="private-label">
              <ShieldCheck size={15} />
              Your data stays yours
            </span>
            {user ? (
              <>
                <div className="avatar">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="user-name">{user.name}</span>
                <button
                  title="Sign out"
                  aria-label="Sign out"
                  className="icon-button"
                  onClick={logout}
                >
                  <LogOut size={17} />
                </button>
              </>
            ) : (
              <button
                className="button small secondary"
                onClick={() => setAuth("login")}
                disabled={!authReady}
              >
                <LogIn size={15} />
                Sign in
              </button>
            )}
          </div>
        </header>
        <main>
          {!upload && <ErrorNotice text={error} />}
          {view === "overview" && (
            <>
              <div className="page-heading">
                <div className="eyebrow">A FRESH PERSPECTIVE ON YOUR DATA</div>
                <h1>
                  {user
                    ? `Welcome back, ${user.name.split(" ")[0]}.`
                    : "Every dataset has a story."}
                </h1>
                <p>
                  Find the patterns. Clear the noise. Make your next discovery.
                </p>
              </div>
              <section className="hero">
                <div className="hero-copy">
                  <span className="pill">
                    <span />
                    FROM MESSY TO MEANINGFUL
                  </span>
                  <h2>
                    Your next insight
                    <br />
                    is hiding in plain sight.
                  </h2>
                  <p>
                    Turn a spreadsheet into a clearer picture. Explore your
                    data, spot the issues, and clean it up in a few simple
                    steps.
                  </p>
                  <div className="hero-buttons">
                    <button className="button primary" onClick={startUpload}>
                      <Upload size={17} />
                      Upload a dataset
                    </button>
                    <button
                      className="button text-button"
                      onClick={() =>
                        document
                          .getElementById("samples")
                          ?.scrollIntoView({ behavior: "smooth" })
                      }
                    >
                      Try a sample <ChevronDown size={16} />
                    </button>
                  </div>
                  <div className="hero-caption">
                    <ShieldCheck size={14} />
                    Private workspace <span>•</span> Original files preserved
                  </div>
                </div>
                <div className="hero-art" aria-hidden="true">
                  <div className="art-grid" />
                  <div className="floating-tag">
                    <CheckCircle2 size={16} />A clearer picture
                  </div>
                  <div className="art-window">
                    <div className="art-window-header">
                      <span className="art-icon">
                        <BarChart3 size={19} />
                      </span>
                      <div>
                        <strong>From data to discovery</strong>
                        <small>Connect the dots.</small>
                      </div>
                      <span className="art-dots">•••</span>
                    </div>
                    <div className="art-chart">
                      <div className="chart-grid-lines" />
                      {[30, 47, 38, 59, 51, 70, 61, 83, 73, 94].map((v, i) => (
                        <div
                          key={i}
                          style={{ height: `${v}%` }}
                          className={i === 9 ? "bright" : ""}
                        />
                      ))}
                    </div>
                    <div className="art-window-footer">
                      <span>EXPLORE</span>
                      <span>UNDERSTAND</span>
                      <span>IMPROVE</span>
                    </div>
                  </div>
                  <div className="floating-bottom">
                    <div>
                      <Sparkles size={18} />
                    </div>
                    <span>
                      Less noise.<strong>More confidence.</strong>
                    </span>
                  </div>
                </div>
              </section>
              <div className="section-heading" id="samples">
                <div>
                  <h2>Start with a little curiosity</h2>
                  <p>
                    No file handy? Explore a sample with real-world data
                    challenges.
                  </p>
                </div>
                <span className="subtle-badge">3 practice datasets</span>
              </div>
              <div className="sample-grid">
                {samples.map((sample) => (
                  <button
                    key={sample.id}
                    className={`sample-card ${sample.color}`}
                    disabled={!!busy}
                    onClick={() => loadSample(sample.id)}
                  >
                    <div className="sample-top">
                      <span className="sample-icon">
                        <sample.icon size={21} />
                      </span>
                      <span className="sample-label">{sample.label}</span>
                      <ChevronRight size={17} />
                    </div>
                    <h3>{sample.name}</h3>
                    <p>{sample.description}</p>
                    <div className="sample-chart" aria-hidden="true">
                      {sample.bars.map((v, i) => (
                        <span key={i} style={{ height: `${v}%` }} />
                      ))}
                    </div>
                    <div className="sample-bottom">
                      <span>
                        <FileSpreadsheet size={14} />
                        {sample.rows} rows{" "}
                        <span className="dot-separator">·</span> 7 columns
                      </span>
                      {busy === sample.id ? (
                        <LoaderCircle size={17} className="spin" />
                      ) : (
                        <span className="sample-open">
                          Explore <ChevronRight size={14} />
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              <div className="overview-bottom">
                <section className="panel recent-panel">
                  <div className="panel-heading">
                    <h3>Your recent datasets</h3>
                    <button
                      className="inline-button"
                      onClick={() => navigate("datasets")}
                    >
                      View all <ChevronRight size={14} />
                    </button>
                  </div>
                  {datasets.length ? (
                    <div className="recent-list">
                      {datasets.slice(0, 3).map((d) => (
                        <button key={d.id} onClick={() => openDataset(d)}>
                          <span className="file-icon">
                            <FileSpreadsheet size={20} />
                          </span>
                          <span>
                            <strong>{d.name}</strong>
                            <small>{date(d.created_at)}</small>
                          </span>
                          <ChevronRight size={17} />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-inline">
                      <span className="empty-icon">
                        <FolderOpen size={27} />
                      </span>
                      <div>
                        <strong>Your discoveries start here</strong>
                        <p>
                          {user
                            ? "Upload a file or explore a sample. Your datasets will appear here."
                            : "Create your free local account to save and revisit your datasets."}
                        </p>
                      </div>
                    </div>
                  )}
                </section>
                <section className="workflow-note">
                  <div className="workflow-icon">
                    <SlidersHorizontal size={20} />
                  </div>
                  <div>
                    <h3>Good data. Better decisions.</h3>
                    <p>
                      Inspect first. Preview your changes.
                      <br />
                      Export only when you’re happy.
                    </p>
                    <button
                      className="inline-button"
                      onClick={() => navigate("guide")}
                    >
                      See how it works <ChevronRight size={14} />
                    </button>
                  </div>
                </section>
              </div>
            </>
          )}
          {view === "datasets" && (
            <>
              <div className="page-title-row">
                <div>
                  <div className="eyebrow">YOUR PRIVATE LIBRARY</div>
                  <h1>My datasets</h1>
                  <p className="muted">
                    Pick up where your last discovery left off.
                  </p>
                </div>
                <button className="button primary" onClick={startUpload}>
                  <Plus size={17} />
                  Add dataset
                </button>
              </div>
              <section className="panel">
                {datasets.length ? (
                  <div className="dataset-list">
                    {datasets.map((d) => (
                      <button key={d.id} onClick={() => openDataset(d)}>
                        <span className="file-icon">
                          <FileSpreadsheet size={23} />
                        </span>
                        <span>
                          <strong>{d.name}</strong>
                          <small>Added {date(d.created_at)}</small>
                        </span>
                        <span className="badge neutral">
                          Original preserved
                        </span>
                        <ChevronRight size={18} />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <Database size={42} />
                    <h2>A home for your data</h2>
                    <p>
                      {user
                        ? "Add your first CSV or choose a sample to get started."
                        : "Sign in or create an account to keep a private dataset library."}
                    </p>
                    <button
                      className="button primary"
                      onClick={user ? startUpload : () => setAuth("register")}
                    >
                      {user ? "Upload a dataset" : "Create an account"}
                    </button>
                  </div>
                )}
              </section>
            </>
          )}
          {view === "workspace" && selected && (
            <>
              <div className="page-title-row">
                <div>
                  <button
                    className="back-link"
                    onClick={() => navigate("datasets")}
                  >
                    <ChevronLeft size={15} />
                    My datasets
                  </button>
                  <h1 className="dataset-title">{selected.name}</h1>
                  <p className="muted">
                    Your original is safe. Let’s see what the data is telling
                    you.
                  </p>
                </div>
                <button
                  className="button secondary"
                  onClick={() => setTab("clean")}
                >
                  <ArrowDownToLine size={17} />
                  Clean & export
                </button>
              </div>
              <div className="tabs" role="tablist" aria-label="Dataset views">
                {(["overview", "explore", "clean"] as Tab[]).map((t) => (
                  <button
                    role="tab"
                    aria-selected={tab === t}
                    className={tab === t ? "selected" : ""}
                    key={t}
                    onClick={() => setTab(t)}
                  >
                    {t === "overview" ? (
                      <BarChart3 size={17} />
                    ) : t === "explore" ? (
                      <Database size={17} />
                    ) : (
                      <Sparkles size={17} />
                    )}
                    {
                      {
                        overview: "Data overview",
                        explore: "Explore data",
                        clean: "Clean & export",
                      }[t]
                    }
                  </button>
                ))}
              </div>
              {profileError ? (
                <>
                  <ErrorNotice text={profileError} />
                  <button
                    className="button secondary"
                    onClick={() => setRefresh((v) => v + 1)}
                  >
                    Retry analysis
                  </button>
                </>
              ) : !profile ? (
                <Spinner />
              ) : tab === "overview" ? (
                <ProfileView
                  profile={profile}
                  onClean={() => setTab("clean")}
                  onExplore={() => setTab("explore")}
                />
              ) : tab === "explore" ? (
                <Explore
                  key={selected.id}
                  dataset={selected}
                  profile={profile}
                />
              ) : (
                <Clean key={selected.id} dataset={selected} profile={profile} />
              )}
            </>
          )}
          {view === "guide" && <Guide onStart={() => navigate("overview")} />}
          <footer className="page-footer">
            <span>Built for curious minds.</span>
            <span>
              Data Detective <span className="dot-separator">/</span> A hands-on
              data discovery studio
            </span>
          </footer>
        </main>
      </div>
      {auth && (
        <Auth
          mode={auth}
          setMode={setAuth}
          onClose={() => {
            setAuth(null);
            setPending(null);
          }}
          onSuccess={authenticated}
        />
      )}
      {upload && (
        <Modal
          title="Meet your next discovery."
          subtitle="Upload a CSV to begin exploring. Your original stays unchanged."
          onClose={() => {
            if (!busy) {
              setUpload(false);
              setError("");
            }
          }}
        >
          <ErrorNotice text={error} />
          <label
            className={`drop-zone ${busy ? "disabled" : ""}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (!busy && e.dataTransfer.files[0])
                void uploadFile(e.dataTransfer.files[0]);
            }}
          >
            <Upload size={34} />
            <strong>
              {busy ? "Preparing your dataset…" : "Drop your CSV here"}
            </strong>
            <span>or click to choose a file</span>
            <input
              ref={uploadRef}
              type="file"
              accept=".csv,text/csv"
              disabled={!!busy}
              onChange={(e) => {
                if (e.target.files?.[0]) void uploadFile(e.target.files[0]);
              }}
            />
            <small>UTF-8 CSV · up to 1 MB · 20,000 rows · 80 columns</small>
          </label>
          <div className="helper">
            <ShieldCheck size={17} />
            Only your account can access this dataset.
          </div>
        </Modal>
      )}
    </div>
  );
}

function Auth({
  mode,
  setMode,
  onClose,
  onSuccess,
}: {
  mode: "login" | "register";
  setMode: (m: "login" | "register") => void;
  onClose: () => void;
  onSuccess: (u: User) => void;
}) {
  const [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [show, setShow] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api<{ user: User }>(`auth/${mode}`, {
        name,
        email,
        password,
      });
      onSuccess(result.user);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={mode === "register" ? "Make room for discovery." : "Welcome back."}
      subtitle={
        mode === "register"
          ? "Create your account and start finding the story in your data."
          : "Sign in to pick up where you left off."
      }
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form onSubmit={submit}>
        <ErrorNotice text={error} />
        {mode === "register" && (
          <label className="field">
            Your name
            <input
              autoFocus
              required
              minLength={2}
              maxLength={80}
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex Morgan"
            />
          </label>
        )}
        <label className="field">
          Email address
          <input
            autoFocus={mode === "login"}
            required
            type="email"
            autoComplete="email"
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </label>
        <label className="field">
          Password
          <div className="password-input">
            <input
              aria-label="Password"
              required
              type={show ? "text" : "password"}
              minLength={10}
              maxLength={128}
              autoComplete={
                mode === "register" ? "new-password" : "current-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={
                mode === "register"
                  ? "At least 10 characters"
                  : "Enter your password"
              }
            />
            <button
              type="button"
              aria-label={show ? "Hide password" : "Show password"}
              onClick={() => setShow((v) => !v)}
            >
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>
        <button className="button primary full" disabled={busy}>
          {busy ? <LoaderCircle className="spin" size={18} /> : null}
          {busy
            ? "One moment…"
            : mode === "register"
              ? "Create account"
              : "Sign in"}
        </button>
        <div className="auth-switch">
          {mode === "register"
            ? "Already have an account?"
            : "New to Data Detective?"}{" "}
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setMode(mode === "register" ? "login" : "register");
              setError("");
            }}
          >
            {mode === "register" ? "Sign in" : "Create an account"}
          </button>
        </div>
        <div className="helper">
          <ShieldCheck size={16} />
          Private datasets. Securely hashed passwords.
        </div>
      </form>
    </Modal>
  );
}

function Metric({
  title,
  value,
  detail,
  icon: Icon,
  tone = "",
}: {
  title: string;
  value: string;
  detail: string;
  icon: typeof Database;
  tone?: string;
}) {
  return (
    <div className={`metric ${tone}`}>
      <div>
        <span>{title}</span>
        <Icon size={18} />
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}
function Chart({
  data,
  histogram = false,
}: {
  data: { name: string; value: number }[];
  histogram?: boolean;
}) {
  return (
    <div className="chart-area">
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={0}
        initialDimension={{ width: 500, height: 250 }}
      >
        <BarChart
          data={data}
          margin={{ top: 12, right: 10, left: 0, bottom: 8 }}
        >
          <CartesianGrid vertical={false} stroke="#edf0ef" />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "#6a7774" }}
            interval={0}
            tickFormatter={(v) => (v.length > 14 ? v.slice(0, 12) + "…" : v)}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "#6a7774" }}
            width={58}
            tickFormatter={(v) =>
              Intl.NumberFormat("en", { notation: "compact" }).format(v)
            }
          />
          <Tooltip
            cursor={{ fill: "#f3f7f5" }}
            contentStyle={{
              border: "1px solid #e4eae7",
              borderRadius: 10,
              fontSize: 14,
            }}
            formatter={(v) => (typeof v === "number" ? fmt(v) : v)}
          />
          <Bar
            dataKey="value"
            radius={[5, 5, 0, 0]}
            maxBarSize={histogram ? 45 : 65}
          >
            {data.map((_, i) => (
              <Cell
                key={i}
                fill={
                  histogram
                    ? "#9c8fcb"
                    : ["#218a70", "#5da58d", "#8ac1a9", "#b6d7c5", "#cddfd5"][
                        i % 5
                      ]
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
function ProfileView({
  profile: p,
  onClean,
  onExplore,
}: {
  profile: Profile;
  onClean: () => void;
  onExplore: () => void;
}) {
  return (
    <>
      <div className="metrics">
        <Metric
          title="Total rows"
          value={fmt(p.rows)}
          detail={`${p.columnCount} columns to explore`}
          icon={Database}
        />
        <Metric
          title="Data health"
          value={`${p.quality}%`}
          detail="Completeness, duplicates & spacing"
          icon={Activity}
          tone="green"
        />
        <Metric
          title="Missing values"
          value={fmt(p.missing)}
          detail="Empty cells across your dataset"
          icon={CircleHelp}
        />
        <Metric
          title="Duplicate rows"
          value={fmt(p.duplicates)}
          detail="Exact repeats across all columns"
          icon={Layers}
        />
      </div>
      <div className="analysis-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h3>
                {p.chart.length
                  ? `${label(p.chartLabel)} by ${label(p.categoryLabel)}`
                  : "Dataset structure"}
              </h3>
              <p>
                {p.chart.length
                  ? "Totals from your original dataset"
                  : "Column types and completeness at a glance"}
              </p>
            </div>
            <span className="badge neutral">Original data</span>
          </div>
          {p.chart.length ? (
            <Chart data={p.chart} />
          ) : (
            <div className="column-summary">
              {p.columns.map((c) => (
                <div key={c.name}>
                  <strong>{c.name}</strong>
                  <span>{c.type}</span>
                  <span>{c.missing} missing</span>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="panel health-panel">
          <div className="panel-heading">
            <h3>A closer look</h3>
            <Search size={18} />
          </div>
          <div className="health-score">
            <div
              className="score-ring"
              style={{ "--score": `${p.quality}%` } as React.CSSProperties}
            >
              <div>
                <strong>
                  {p.quality}
                  <span>%</span>
                </strong>
                <small>data health</small>
              </div>
            </div>
            <p>
              {p.quality === 100
                ? "Looking good. Your data passes our structural checks."
                : "A strong starting point. A little cleanup can make it clearer."}
            </p>
          </div>
          <button className="button secondary full" onClick={onClean}>
            <Sparkles size={16} />
            Review cleaning options
          </button>
        </section>
      </div>
      <section className="panel issues-panel">
        <div className="panel-heading">
          <div>
            <h3>What we found</h3>
            <p>A few things worth a closer look before your next decision.</p>
          </div>
          <button className="inline-button" onClick={onExplore}>
            Explore the data <ChevronRight size={14} />
          </button>
        </div>
        <div className="issue-grid">
          {p.issues.map((issue) => (
            <div className="issue" key={issue.key}>
              <span className={`issue-icon ${issue.count ? "amber" : "mint"}`}>
                {issue.count ? (
                  <AlertCircle size={19} />
                ) : (
                  <CheckCircle2 size={19} />
                )}
              </span>
              <h4>{issue.title}</h4>
              <strong>
                {fmt(issue.count)} <span>{issue.unit}</span>
              </strong>
              <p>{issue.description}</p>
            </div>
          ))}
        </div>
      </section>
      <div className="helper">
        <CircleHelp size={16} />
        Health score measures missing cells, exact duplicate rows and excess
        spacing. Outliers are review flags, not errors.
      </div>
    </>
  );
}

function DataTable({
  headers,
  rows,
  sort,
  onSort,
}: {
  headers: string[];
  rows: string[][];
  sort?: string;
  onSort?: (column: string) => void;
}) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>
                {onSort ? (
                  <button
                    onClick={() => onSort(h)}
                    className={sort === h ? "sort-active" : ""}
                  >
                    {label(h)}
                    <ArrowUpDown size={13} />
                  </button>
                ) : (
                  label(h)
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>
                  {cell.trim() ? (
                    cell
                  ) : (
                    <span className="missing-cell">Missing</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && (
        <div className="no-rows">No rows match your search.</div>
      )}
    </div>
  );
}
function Explore({ dataset, profile }: { dataset: Dataset; profile: Profile }) {
  const [search, setSearch] = useState(""),
    [page, setPage] = useState(1),
    [sort, setSort] = useState(""),
    [direction, setDirection] = useState("asc"),
    [rows, setRows] = useState<Rows | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(() => {
      api<Rows>(
        "datasets/rows",
        { id: dataset.id, search, page, sort, direction, pageSize: 10 },
        controller.signal,
      )
        .then((result) => {
          setRows(result);
          setError("");
        })
        .catch((e) => {
          if (e.name !== "AbortError") setError(message(e));
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [dataset.id, search, page, sort, direction, retry]);
  function sortBy(column: string) {
    setDirection(column === sort && direction === "asc" ? "desc" : "asc");
    setSort(column);
    setPage(1);
  }
  return (
    <>
      <section className="panel">
        <div className="panel-heading explore-toolbar">
          <div>
            <h3>Look beyond the spreadsheet</h3>
            <p>Search any value or select a column heading to sort.</p>
          </div>
          <label className="search-field">
            <Search size={17} />
            <input
              aria-label="Search all columns"
              placeholder="Search all columns…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            {search && (
              <button aria-label="Clear search" onClick={() => setSearch("")}>
                <X size={15} />
              </button>
            )}
          </label>
        </div>
        <ErrorNotice text={error} />
        {error && (
          <button
            className="button secondary"
            onClick={() => {
              setError("");
              setRetry((v) => v + 1);
            }}
          >
            Retry
          </button>
        )}
        {loading ? (
          <Spinner text="Loading rows…" />
        ) : (
          rows && (
            <DataTable
              headers={rows.headers}
              rows={rows.rows}
              sort={sort}
              onSort={sortBy}
            />
          )
        )}
        <div className="pagination">
          <span>
            {rows
              ? `${fmt(rows.total)} matching rows`
              : `${fmt(profile.rows)} rows`}{" "}
            <span className="dot-separator">·</span> 10 per page
          </span>
          <div>
            <button
              aria-label="Previous page"
              disabled={loading || !rows || rows.page <= 1}
              onClick={() => setPage(rows!.page - 1)}
            >
              <ChevronLeft size={17} />
            </button>
            <span>
              Page {rows?.page || 1} of {rows?.pages || 1}
            </span>
            <button
              aria-label="Next page"
              disabled={loading || !rows || rows.page >= rows.pages}
              onClick={() => setPage(rows!.page + 1)}
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </section>
      <div className="analysis-grid lower-analysis">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h3>Column profiles</h3>
              <p>Inferred from every non-empty value in the original.</p>
            </div>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Column</th>
                  <th>Type</th>
                  <th>Unique</th>
                  <th>Missing</th>
                  <th>Mean</th>
                </tr>
              </thead>
              <tbody>
                {profile.columns.map((c) => (
                  <tr key={c.name}>
                    <td>{label(c.name)}</td>
                    <td>
                      <span
                        className={`badge ${c.type === "number" ? "mint" : "neutral"}`}
                      >
                        {c.type}
                      </span>
                    </td>
                    <td>{fmt(c.unique)}</td>
                    <td>{c.missing}</td>
                    <td>{c.mean === undefined ? "—" : fmt(c.mean)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h3>Value distribution</h3>
              <p>
                {profile.histogram.length
                  ? label(profile.chartLabel)
                  : "No purely numeric columns detected"}
              </p>
            </div>
          </div>
          {profile.histogram.length ? (
            <Chart data={profile.histogram} histogram />
          ) : (
            <div className="empty-inline">
              <BarChart3 size={26} />
              <p>Upload numeric data to see a distribution.</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function Clean({ dataset, profile }: { dataset: Dataset; profile: Profile }) {
  const [options, setOptions] = useState<CleanOptions>(defaults),
    [preview, setPreview] = useState<Preview | null>(null),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [downloaded, setDownloaded] = useState(false);
  function update<K extends keyof CleanOptions>(
    key: K,
    value: CleanOptions[K],
  ) {
    setOptions((v) => ({ ...v, [key]: value }));
    setPreview(null);
    setDownloaded(false);
    setError("");
  }
  async function runPreview() {
    setBusy("preview");
    setError("");
    try {
      setPreview(
        await api<Preview>("datasets/preview", { id: dataset.id, options }),
      );
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy("");
    }
  }
  async function download() {
    setBusy("export");
    setError("");
    try {
      const result = await api<{ csv: string; filename: string }>(
        "datasets/export",
        { id: dataset.id, options },
      );
      const url = URL.createObjectURL(
        new Blob([result.csv], { type: "text/csv;charset=utf-8;" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = result.filename;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setDownloaded(true);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy("");
    }
  }
  return (
    <>
      <ErrorNotice text={error} />
      <div className="clean-layout">
        <section className="panel cleaning-options">
          <div className="panel-heading">
            <div>
              <h3>A little cleanup goes a long way.</h3>
              <p>You choose the changes. We show you the result.</p>
            </div>
          </div>
          <fieldset disabled={!!busy}>
            <label className="check-option">
              <input
                type="checkbox"
                checked={options.trim}
                onChange={(e) => update("trim", e.target.checked)}
              />
              <span>
                <strong>Trim extra spaces</strong>
                <small>Remove leading and trailing whitespace.</small>
              </span>
              <span className="badge neutral">{profile.whitespace}</span>
            </label>
            <label className="check-option">
              <input
                type="checkbox"
                checked={options.deduplicate}
                onChange={(e) => update("deduplicate", e.target.checked)}
              />
              <span>
                <strong>Remove duplicate rows</strong>
                <small>
                  Keep the first occurrence after your other changes.
                </small>
              </span>
              <span className="badge neutral">{profile.duplicates}</span>
            </label>
            <label className="check-option">
              <input
                type="checkbox"
                checked={options.fillMissing}
                onChange={(e) => update("fillMissing", e.target.checked)}
              />
              <span>
                <strong>Fill missing values</strong>
                <small>Apply your chosen value to every blank cell.</small>
              </span>
              <span className="badge neutral">{profile.missing}</span>
            </label>
            {options.fillMissing && (
              <label className="field replacement">
                Replacement value
                <input
                  maxLength={80}
                  value={options.replacement}
                  onChange={(e) => update("replacement", e.target.value)}
                />
                <small>
                  A text replacement makes numeric columns mixed text.
                </small>
              </label>
            )}
            <label className="check-option">
              <input
                type="checkbox"
                checked={options.dropEmptyRows}
                onChange={(e) => update("dropEmptyRows", e.target.checked)}
              />
              <span>
                <strong>Remove completely empty rows</strong>
                <small>Only rows with no remaining values are removed.</small>
              </span>
            </label>
          </fieldset>
          <div className="options-footer">
            <button
              className="button primary full"
              disabled={!!busy}
              onClick={runPreview}
            >
              {busy === "preview" ? (
                <LoaderCircle size={17} className="spin" />
              ) : (
                <Eye size={17} />
              )}
              Preview changes
            </button>
            <div className="helper">
              <ShieldCheck size={15} />
              Your original file is never changed.
            </div>
          </div>
        </section>
        <section className="panel preview-summary">
          <div className="panel-heading">
            <h3>
              {preview ? "Your cleanup preview" : "A clearer picture awaits"}
            </h3>
            <Sparkles size={19} />
          </div>
          {preview ? (
            <>
              <div className="before-after">
                <span>BEFORE</span>
                <span>AFTER</span>
              </div>
              {[
                [
                  "Data health",
                  `${preview.before.quality}%`,
                  `${preview.after.quality}%`,
                ],
                ["Rows", fmt(preview.before.rows), fmt(preview.after.rows)],
                [
                  "Missing cells",
                  fmt(preview.before.missing),
                  fmt(preview.after.missing),
                ],
                [
                  "Duplicate rows",
                  fmt(preview.before.duplicates),
                  fmt(preview.after.duplicates),
                ],
                [
                  "Extra spaces",
                  fmt(preview.before.whitespace),
                  fmt(preview.after.whitespace),
                ],
              ].map(([name, before, after]) => (
                <div className="comparison-row" key={name}>
                  <span>{name}</span>
                  <span>{before}</span>
                  <strong>{after}</strong>
                </div>
              ))}
              <p className="preview-note">
                {preview.removedRows} rows removed. Outliers are retained for
                your review.
              </p>
              <button
                className="button primary full"
                disabled={!!busy}
                onClick={download}
              >
                {busy === "export" ? (
                  <LoaderCircle size={17} className="spin" />
                ) : downloaded ? (
                  <Check size={17} />
                ) : (
                  <ArrowDownToLine size={17} />
                )}{" "}
                {downloaded ? "Download again" : "Download cleaned CSV"}
              </button>
              {downloaded && (
                <p role="status" className="success-text">
                  Your cleaned CSV has been sent to your downloads.
                </p>
              )}
            </>
          ) : (
            <div className="empty-state">
              <div className="preview-empty-icon">
                <SlidersHorizontal size={35} />
              </div>
              <h3>Preview before you commit.</h3>
              <p>
                Select your cleaning options, then compare the before and after.
                Nothing changes until you export a copy.
              </p>
            </div>
          )}
        </section>
      </div>
      {preview && (
        <section className="panel preview-table">
          <div className="panel-heading">
            <div>
              <h3>A peek at the result</h3>
              <p>
                First 8 cleaned rows · export includes all{" "}
                {fmt(preview.after.rows)} rows.
              </p>
            </div>
            <span className="badge mint">Preview only</span>
          </div>
          <DataTable headers={preview.headers} rows={preview.rows} />
        </section>
      )}
      <div className="helper">
        <CircleHelp size={16} />
        Cleaning order: trim → fill missing → remove empty rows → deduplicate.
        Exports escape formula-like text for safer spreadsheet opening.
      </div>
    </>
  );
}

function Guide({ onStart }: { onStart: () => void }) {
  return (
    <>
      <div className="page-heading">
        <div className="eyebrow">A LITTLE CONTEXT. A LOT OF CLARITY.</div>
        <h1>Curiosity, meet capability.</h1>
        <p>
          A practical data studio, built to make the work behind the insights
          visible.
        </p>
      </div>
      <section className="guide-intro">
        <div>
          <span className="pill">THE WORKFLOW</span>
          <h2>
            From a file to
            <br />a fresh perspective.
          </h2>
          <p>
            Bring a CSV, ask better questions, and leave with cleaner data.
            Every step is deliberate. Every change is yours to choose.
          </p>
          <button className="button primary" onClick={onStart}>
            Start exploring
          </button>
        </div>
        <div className="steps">
          {[
            {
              icon: Upload,
              title: "Bring your data",
              text: "Upload a UTF-8 CSV or choose one of three deterministic sample datasets.",
            },
            {
              icon: Search,
              title: "Look a little closer",
              text: "Inspect missing values, repeated rows, extra spaces and numeric outliers.",
            },
            {
              icon: SlidersHorizontal,
              title: "Make considered changes",
              text: "Select cleaning options and compare exact before-and-after results.",
            },
            {
              icon: ArrowDownToLine,
              title: "Take your insight with you",
              text: "Download the cleaned CSV. Your original stays safely in your private workspace.",
            },
          ].map((step) => (
            <div key={step.title}>
              <span>
                <step.icon size={21} />
              </span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <div className="section-heading">
        <div>
          <h2>Built with intention</h2>
          <p>A look at the engineering behind the experience.</p>
        </div>
      </div>
      <div className="tech-grid">
        {[
          {
            icon: Braces,
            title: "React + TypeScript",
            text: "Typed data contracts, reusable UI components, accessible dialogs, cancellable requests and responsive layouts.",
          },
          {
            icon: Terminal,
            title: "Python analysis",
            text: "CSV parsing, column inference, IQR outlier detection, aggregation and deterministic transformations with automated tests.",
          },
          {
            icon: Layers,
            title: "Java API",
            text: "POST-only endpoints, request validation, password hashing, opaque sessions, account isolation and bounded Python workers.",
          },
          {
            icon: Database,
            title: "SQLite persistence",
            text: "Private accounts and original datasets, parameterised query files, independent tables and explicit +02:00 timestamps.",
          },
        ].map((item) => (
          <section className="panel tech-card" key={item.title}>
            <item.icon size={24} />
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </section>
        ))}
      </div>
      <section className="panel methods">
        <h3>Honest methods. Clear boundaries.</h3>
        <p>
          The data health score penalises missing cells, excess spacing and
          exact duplicate rows. Numeric outliers use the 1.5 × interquartile
          range rule and are flagged for review, never automatically deleted.
          Numeric type inference requires every non-empty value to be a finite
          number; mixed values remain text.
        </p>
        <p>
          This local portfolio demo supports CSV files up to 1 MB, 20,000 rows
          and 80 columns, with 30 saved datasets per account. Samples are
          synthetic and reproducible. It does not provide email verification,
          password recovery, collaborative editing or production hosting. All
          displayed times use Africa/Johannesburg (+02:00).
        </p>
      </section>
    </>
  );
}

export default App;
