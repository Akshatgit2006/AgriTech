import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  NavLink,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import {
  Sprout,
  LayoutDashboard,
  Map,
  Wheat,
  FlaskConical,
  CloudSun,
  CalendarDays,
  ShoppingBag,
  Package,
  MessagesSquare,
  Users,
  ShieldCheck,
  Settings,
  LogOut,
  Bell,
  Search,
  Plus,
  ArrowUpRight,
  ArrowRight,
  Menu,
  X,
  Leaf,
  Droplets,
  Wind,
  Sun,
  ChevronLeft,
  ChevronRight,
  Check,
  Trash2,
  Pencil,
  MapPin,
  LoaderCircle,
  AlertCircle,
  Tractor,
} from "lucide-react";
import { api, money, dateLabel, today } from "./api";
import { hindi } from "./i18n";

const Context = createContext();
const useApp = () => useContext(Context);
const nav = [
  ["/", "Overview", LayoutDashboard],
  ["/farms", "My farms", Map],
  ["/crops", "Crop journal", Wheat],
  ["/soil", "Soil health", FlaskConical],
  ["/weather", "Weather & alerts", CloudSun],
  ["/activities", "Farm activities", CalendarDays],
  ["/shop", "Resource shop", ShoppingBag],
  ["/orders", "My orders", Package],
  ["/consultations", "Expert help", MessagesSquare],
  ["/community", "Community", Users],
];
function useData(path, refresh = 0) {
  const [state, set] = useState({ data: null, error: "", loading: true });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    set((s) => ({ ...s, error: "", loading: true }));
    if (!path) {
      set({ data: null, error: "", loading: false });
      return;
    }
    api(path)
      .then((data) => active && set({ data, error: "", loading: false }))
      .catch(
        (error) =>
          active && set({ data: null, error: error.message, loading: false }),
      );
    return () => {
      active = false;
    };
  }, [path, refresh, retry]);
  return { ...state, reload: () => setRetry((r) => r + 1) };
}
function Loading() {
  const { t } = useApp();
  return (
    <div className="loading">
      <LoaderCircle className="spin" size={24} />
      {t("Loading your farm…")}
    </div>
  );
}
function ErrorBox({ message, retry }) {
  const { t } = useApp();
  return (
    <div className="error-box" role="alert">
      <AlertCircle size={20} />
      <span>{message}</span>
      {retry && (
        <button className="text-btn" onClick={retry}>
          {t("Try again")}
        </button>
      )}
    </div>
  );
}
function Empty({
  title = "No records yet",
  text = "Create your first record to get started.",
}) {
  const { t } = useApp();
  return (
    <div className="empty">
      <Sprout size={32} />
      <h3>{t(title)}</h3>
      <p>{t(text)}</p>
    </div>
  );
}
function Badge({ children }) {
  return (
    <span
      className={`badge ${["Urgent", "Cancelled", "Disabled"].includes(children) ? "red" : ["Watch", "Placed", "Open", "Sowing"].includes(children) ? "amber" : ""}`}
    >
      {children}
    </span>
  );
}
function PageHeader({
  eyebrow = "YOUR FARM WORKSPACE",
  title,
  description,
  action,
}) {
  const { t } = useApp();
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{t(title)}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
function Modal({ title, children, onClose }) {
  const ref = useRef();
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={onClose}
      onClick={(event) => event.target === ref.current && onClose()}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button
          className="icon-btn"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
const commonFarm = { key: "farmId", label: "Farm", type: "farm" };
const notes = {
  key: "notes",
  label: "Notes",
  type: "textarea",
  optional: true,
  maxLength: 2000,
};
const definitions = {
  farms: {
    title: "My farms",
    add: "Add farm",
    subtitle: "A little more connected to every acre.",
    fields: [
      { key: "name", label: "Name" },
      { key: "location", label: "Location" },
      { key: "area", label: "Area (acres)", type: "number", min: 0.01 },
      { key: "latitude", label: "Latitude", type: "number", min: -90, max: 90 },
      {
        key: "longitude",
        label: "Longitude",
        type: "number",
        min: -180,
        max: 180,
      },
      {
        key: "soilType",
        label: "Soil type",
        options: ["Loamy", "Clay", "Sandy", "Silty", "Other"],
      },
    ],
  },
  crops: {
    title: "Crop journal",
    add: "Add crop",
    subtitle: "Follow each crop from the first seed to harvest.",
    fields: [
      commonFarm,
      { key: "name", label: "Crop name" },
      { key: "variety", label: "Variety", optional: true },
      { key: "plantedAt", label: "Planting date", type: "date" },
      { key: "harvestAt", label: "Expected harvest", type: "date" },
      {
        key: "stage",
        label: "Growth stage",
        options: [
          "Planned",
          "Sowing",
          "Growing",
          "Flowering",
          "Harvest ready",
          "Harvested",
        ],
      },
      { key: "area", label: "Area (acres)", type: "number", min: 0.01 },
      notes,
    ],
  },
  soil: {
    title: "Soil health",
    add: "Add soil reading",
    subtitle: "Keep your soil observations and laboratory readings together.",
    fields: [
      commonFarm,
      { key: "testedAt", label: "Test date", type: "date" },
      { key: "ph", label: "pH", type: "number", min: 0, max: 14 },
      {
        key: "nitrogen",
        label: "Nitrogen (mg/kg)",
        type: "number",
        min: 0,
        max: 10000,
      },
      {
        key: "phosphorus",
        label: "Phosphorus (mg/kg)",
        type: "number",
        min: 0,
        max: 10000,
      },
      {
        key: "potassium",
        label: "Potassium (mg/kg)",
        type: "number",
        min: 0,
        max: 10000,
      },
      {
        key: "moisture",
        label: "Moisture (%)",
        type: "number",
        min: 0,
        max: 100,
      },
      notes,
    ],
  },
  activities: {
    title: "Farm activities",
    add: "Log activity",
    subtitle: "A simple record of the work that makes things grow.",
    fields: [
      commonFarm,
      { key: "title", label: "Title", maxLength: 160 },
      { key: "date", label: "Date", type: "date" },
      {
        key: "type",
        label: "Activity type",
        options: [
          "Irrigation",
          "Fertilization",
          "Sowing",
          "Harvest",
          "Inspection",
          "Other",
        ],
      },
      notes,
    ],
  },
  consultations: {
    title: "Expert help",
    add: "Ask an expert",
    fields: [
      { key: "subject", label: "Subject", maxLength: 160 },
      {
        key: "category",
        label: "Category",
        options: ["Crop health", "Soil", "Irrigation", "General"],
      },
      { key: "message", label: "Message", type: "textarea", maxLength: 4000 },
    ],
  },
  posts: {
    title: "Community",
    add: "New discussion",
    fields: [
      { key: "title", label: "Title", maxLength: 160 },
      {
        key: "category",
        label: "Category",
        options: ["General", "Crop tips", "Questions", "Success stories"],
      },
      { key: "body", label: "Message", type: "textarea", maxLength: 4000 },
    ],
  },
  products: {
    fields: [
      { key: "name", label: "Name" },
      {
        key: "category",
        label: "Category",
        options: ["Seeds", "Nutrition", "Tools", "Irrigation"],
      },
      {
        key: "description",
        label: "Description",
        type: "textarea",
        maxLength: 2000,
      },
      { key: "price", label: "Price (₹)", type: "number", min: 1 },
      { key: "stock", label: "Stock", type: "number", min: 0, step: 1 },
      { key: "unit", label: "Unit", maxLength: 40 },
    ],
  },
  advisories: {
    fields: [
      { key: "title", label: "Title", maxLength: 160 },
      { key: "body", label: "Body", type: "textarea", maxLength: 4000 },
      {
        key: "severity",
        label: "Severity",
        options: ["Info", "Watch", "Urgent"],
      },
      { key: "region", label: "Region", maxLength: 160 },
      { key: "crop", label: "Crop", maxLength: 80 },
    ],
  },
};
function RecordForm({ type, initial, onClose, onSave }) {
  const { t } = useApp();
  const fields = definitions[type].fields;
  const farms = useData(
    fields.some((f) => f.type === "farm") ? "/farms?limit=100" : null,
  );
  const [values, setValues] = useState(() =>
    Object.fromEntries(
      fields.map((f) => [
        f.key,
        initial?.[f.key] ??
          (f.options?.[0] || (f.type === "date" ? today() : "")),
      ]),
    ),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSave(
        Object.fromEntries(
          fields.map((f) => [
            f.key,
            f.type === "number" ? Number(values[f.key]) : values[f.key],
          ]),
        ),
      );
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="record-form">
      {error && <ErrorBox message={error} />}
      <div className="form-grid">
        {fields.map((field) => (
          <label
            key={field.key}
            className={field.type === "textarea" ? "full" : ""}
          >
            <span>
              {t(field.label)}
              {field.optional && <small> (optional)</small>}
            </span>
            {field.options || field.type === "farm" ? (
              <select
                required
                value={values[field.key]}
                onChange={(e) =>
                  setValues({ ...values, [field.key]: e.target.value })
                }
              >
                {field.type === "farm" && (
                  <option value="">{t("Select a farm")}</option>
                )}
                {(field.options || farms.data?.items || []).map((option) => (
                  <option
                    key={option._id || option}
                    value={option._id || option}
                  >
                    {option.name || option}
                  </option>
                ))}
              </select>
            ) : field.type === "textarea" ? (
              <textarea
                required={!field.optional}
                maxLength={field.maxLength}
                rows={4}
                value={values[field.key]}
                onChange={(e) =>
                  setValues({ ...values, [field.key]: e.target.value })
                }
              />
            ) : (
              <input
                required={!field.optional}
                type={field.type || "text"}
                min={field.min}
                max={field.max}
                step={field.step || "any"}
                maxLength={field.maxLength || 120}
                value={values[field.key]}
                onChange={(e) =>
                  setValues({ ...values, [field.key]: e.target.value })
                }
              />
            )}
          </label>
        ))}
      </div>
      {fields.some((f) => f.type === "farm") &&
        !farms.loading &&
        !farms.data?.items.length && (
          <p className="notice">Add a farm before saving this record.</p>
        )}
      <div className="form-actions">
        <button type="button" className="button secondary" onClick={onClose}>
          {t("Cancel")}
        </button>
        <button className="button" disabled={busy}>
          {busy ? (
            <LoaderCircle className="spin" size={16} />
          ) : (
            <Check size={16} />
          )}{" "}
          {t("Save")}
        </button>
      </div>
    </form>
  );
}
function Pagination({ data, page, setPage }) {
  const { t } = useApp();
  if (!data?.total) return null;
  return (
    <div className="pagination">
      <span>
        {data.total} records · {page} / {data.pages}
      </span>
      <div>
        <button
          className="icon-btn"
          aria-label={t("Previous")}
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
        >
          <ChevronLeft size={18} />
        </button>
        <button
          className="icon-btn"
          aria-label={t("Next")}
          disabled={page >= data.pages}
          onClick={() => setPage(page + 1)}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
function SearchBar({ value, onChange }) {
  const { t } = useApp();
  return (
    <label className="search-field">
      <Search size={17} />
      <input
        aria-label={t("Search")}
        placeholder={t("Search records…")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
function FieldArt({ compact = false }) {
  return (
    <svg
      className={compact ? "field-art compact" : "field-art"}
      viewBox="0 0 420 230"
      aria-hidden="true"
    >
      <defs>
        <clipPath id={compact ? "clip-small" : "clip-field"}>
          <rect width="420" height="230" rx="20" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${compact ? "clip-small" : "clip-field"})`}>
        <circle cx="335" cy="45" r="31" fill="#e4d78e" />
        <path d="M0 148Q90 40 210 126T440 89V240H0Z" fill="#729674" />
        <path d="M-20 190Q130 67 440 152V240H-20" fill="#a6b778" />
        <path d="M-30 240Q120 96 450 206V240" fill="#d9ca8b" />
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <path
            key={i}
            d={`M${90 + i * 40} 240Q${130 + i * 28} 166 ${440} ${170 + i * 13}`}
            fill="none"
            stroke="#b1a76a"
            strokeWidth="3"
          />
        ))}
        <path
          d="M35 190V98m0 44q-32-14-26-42 27 2 26 42m0 20q32-14 26-42-27 2-26 42"
          fill="#395f43"
          stroke="#395f43"
          strokeWidth="5"
        />
        <path
          d="M100 170v-68m0 29q-22-8-20-29 22 2 20 29m0 16q23-10 20-28-20 2-20 28"
          fill="#426a48"
          stroke="#426a48"
          strokeWidth="4"
        />
        <path d="M260 145v-31h34v31" fill="#efe7c8" />
        <path d="M253 115l24-21 24 21" fill="#36573d" />
      </g>
    </svg>
  );
}

function Auth() {
  const { t, setUser, health, language, setLanguage } = useApp();
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState({ name: "", email: "", password: "" });
  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await api(`/auth/${register ? "register" : "login"}`, {
        method: "POST",
        body: fields,
      });
      setUser(result.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <div className="auth-story">
        <div className="brand">
          <span className="brand-icon">
            <Sprout />
          </span>
          field<span>wise</span>
          <span className="brand-dot">+</span>
        </div>
        <div className="auth-intro">
          <span className="eyebrow">THE FARMER'S FIELD DESK</span>
          <h1>See the whole season clearly.</h1>
          <p>
            Plan your fields, watch conditions, record what matters, and make
            the next decision with confidence.
          </p>
          <div className="auth-highlights" aria-label="What you can do with Fieldwise">
            <span><strong>01</strong> Plan each field</span>
            <span><strong>02</strong> Follow the weather</span>
            <span><strong>03</strong> Learn as you grow</span>
          </div>
        </div>
        <div className="auth-footer">
          <Leaf size={16} /> Built around the rhythm of real farms.
        </div>
      </div>
      <div className="auth-panel">
        <button
          className="language"
          onClick={() => setLanguage(language === "en" ? "hi" : "en")}
        >
          {language === "en" ? "हिन्दी" : "English"}
        </button>
        <div className="auth-form-wrap">
          <div className="eyebrow">YOUR FIELD DESK AWAITS</div>
          <h2>{t(register ? "Create account" : "Welcome back.")}</h2>
          <p>
            {t(
              register
                ? "Create your free farm workspace."
                : "Sign in to your farm workspace.",
            )}
          </p>
          {health && !health.configured && (
            <div className="notice">
              Connect MongoDB in your environment settings, or enable local demo
              mode to begin.
            </div>
          )}
          {error && <ErrorBox message={error} />}
          <form onSubmit={submit}>
            {register && (
              <label>
                {t("Full name")}
                <input
                  required
                  autoComplete="name"
                  maxLength={80}
                  value={fields.name}
                  onChange={(e) =>
                    setFields({ ...fields, name: e.target.value })
                  }
                />
              </label>
            )}
            <label>
              {t("Email address")}
              <input
                type="email"
                required
                autoComplete="email"
                value={fields.email}
                onChange={(e) =>
                  setFields({ ...fields, email: e.target.value })
                }
              />
            </label>
            <label>
              {t("Password")}
              <input
                type="password"
                required
                minLength={register ? 8 : 1}
                maxLength={72}
                autoComplete={register ? "new-password" : "current-password"}
                value={fields.password}
                onChange={(e) =>
                  setFields({ ...fields, password: e.target.value })
                }
              />
              {register && <small>At least 8 characters.</small>}
            </label>
            <button className="button wide" disabled={busy}>
              {busy ? (
                <LoaderCircle className="spin" size={18} />
              ) : (
                t(register ? "Create account" : "Sign in")
              )}
              <ArrowRight size={18} />
            </button>
          </form>
          <p className="auth-switch">
            {t(register ? "Already have an account?" : "New to Fieldwise?")}{" "}
            <button
              className="text-btn"
              onClick={() => {
                setRegister(!register);
                setError("");
              }}
            >
              {t(register ? "Sign in" : "Create account")}
            </button>
          </p>
          {health?.demo && (
            <div className="demo-login">
              <Badge>{t("Local demo")}</Badge>
              <p>Explore with sample records saved on this computer.</p>
              <button
                className="button secondary small"
                onClick={() => {
                  setRegister(false);
                  setFields({
                    name: "",
                    email: "farmer@fieldwise.demo",
                    password: "FarmerDemo123!",
                  });
                }}
              >
                Use farmer demo
              </button>
              <button
                className="text-btn"
                onClick={() => {
                  setRegister(false);
                  setFields({
                    name: "",
                    email: "admin@fieldwise.demo",
                    password: "AdminDemo123!",
                  });
                }}
              >
                Use admin demo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
function WeatherCard({ farm, full = false }) {
  const { t } = useApp();
  const result = useData(farm ? `/weather?farmId=${farm._id}` : null);
  if (!farm)
    return (
      <div className="panel weather-card">
        <CloudSun size={32} />
        <h3>Your local forecast</h3>
        <p>Add your first farm to connect local weather.</p>
        <Link to="/farms" className="text-btn">
          {t("Add farm")} →
        </Link>
      </div>
    );
  const weather = result.data;
  return (
    <div className={`panel weather-card ${full ? "weather-full" : ""}`}>
      <div className="panel-title">
        <span>
          <MapPin size={15} /> {farm.location}
        </span>
        <CloudSun size={24} />
      </div>
      {result.loading ? (
        <Loading />
      ) : result.error ? (
        <ErrorBox message={result.error} retry={result.reload} />
      ) : (
        weather && (
          <>
            <div className="temperature">
              <strong>
                {Math.round(weather.current.temperature_2m)}
                <sup>°C</sup>
              </strong>
              <Sun size={48} strokeWidth={1.2} />
            </div>
            <p>
              {weather.current.weather_code < 3
                ? "Clear to partly cloudy"
                : weather.current.weather_code < 50
                  ? "Cloudy conditions"
                  : "Precipitation possible"}
            </p>
            <div className="weather-metrics">
              <span>
                <Droplets size={15} />
                {weather.current.relative_humidity_2m}% humidity
              </span>
              <span>
                <Wind size={15} />
                {weather.current.wind_speed_10m} km/h
              </span>
            </div>
            {full && (
              <div className="forecast">
                {weather.daily.time.map((day, i) => (
                  <div key={day}>
                    <span>
                      {new Date(`${day}T12:00:00`).toLocaleDateString("en-IN", {
                        weekday: "short",
                      })}
                    </span>
                    <CloudSun size={24} />
                    <strong>
                      {Math.round(weather.daily.temperature_2m_max[i])}° /{" "}
                      {Math.round(weather.daily.temperature_2m_min[i])}°
                    </strong>
                    <small>
                      <Droplets size={12} />
                      {weather.daily.precipitation_probability_max[i]}%
                    </small>
                  </div>
                ))}
              </div>
            )}
            <div className="weather-footer">
              <small>
                {weather.stale ? "Outdated forecast · " : ""}Updated{" "}
                {new Date(weather.fetchedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                ·{" "}
                <a
                  href="https://open-meteo.com/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Open-Meteo
                </a>
              </small>
              {!full && (
                <Link to="/weather">
                  {t("View forecast")} <ArrowRight size={14} />
                </Link>
              )}
            </div>
          </>
        )
      )}
    </div>
  );
}
function CropCard({ crop, farm, actions }) {
  return (
    <article className="crop-card">
      <div
        className={`crop-art crop-${crop.name.toLowerCase().includes("tomato") ? "tomato" : crop.name.toLowerCase().includes("wheat") ? "wheat" : "green"}`}
      >
        <Wheat size={50} strokeWidth={1} />
        <span>{crop.area} acres</span>
        <Badge>{crop.stage}</Badge>
      </div>
      <div className="crop-body">
        <h3>{crop.name}</h3>
        <p>
          {crop.variety || "Crop record"} · {farm || "Your farm"}
        </p>
        <div className="crop-dates">
          <span>
            Planted<strong>{dateLabel(crop.plantedAt)}</strong>
          </span>
          <span>
            Harvest<strong>{dateLabel(crop.harvestAt)}</strong>
          </span>
        </div>
        <div className="stage-track">
          {[
            "Planned",
            "Sowing",
            "Growing",
            "Flowering",
            "Harvest ready",
            "Harvested",
          ].map((stage, index, stages) => (
            <i
              key={stage}
              className={index <= stages.indexOf(crop.stage) ? "done" : ""}
            />
          ))}
        </div>
        {crop.notes && actions && <p className="record-notes">{crop.notes}</p>}
        {actions}
      </div>
    </article>
  );
}
function Dashboard() {
  const { user, t } = useApp();
  const result = useData("/dashboard");
  if (result.loading) return <Loading />;
  if (result.error)
    return <ErrorBox message={result.error} retry={result.reload} />;
  const data = result.data;
  const hour = new Date().getHours();
  return (
    <>
      <PageHeader
        eyebrow="TODAY ON YOUR FARM"
        title={`${t(hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening")}, ${user.name.split(" ")[0]}.`}
        description="Your season, records, and next steps in one clear view."
        action={
          <Link className="button" to="/activities">
            <Plus size={17} />
            {t("Log activity")}
          </Link>
        }
      />
      <div className="dashboard-overview">
        <section className="hero-banner">
          <div>
            <span className="hero-kicker">
              <span /> FIELD NOTES / SEASON OVERVIEW
            </span>
            <h2>
              Better records.
              <br />Stronger seasons.
            </h2>
            <p>Keep an eye on soil, crops, conditions, and work across every field.</p>
            <Link to="/soil">
              Review soil records <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="hero-decor" aria-hidden="true"><span>FW</span><i /><i /><i /></div>
        </section>
        <WeatherCard farm={data.farms[0]} />
      </div>
      <div className="stats-grid">
        {[
          [
            Map,
            "Total farmland",
            `${data.stats.area.toLocaleString()} acres`,
            `${data.farms.length} farm profiles`,
          ],
          [
            Wheat,
            "Active crops",
            data.stats.activeCrops,
            "Growing at your pace",
          ],
          [
            Package,
            "Open orders",
            data.stats.pendingOrders,
            "Resources for your farm",
          ],
          [
            MessagesSquare,
            "Expert requests",
            data.stats.consultations,
            "A little guidance goes far",
          ],
        ].map(([Icon, label, value, sub]) => (
          <div className="stat" key={label}>
            <div>
              <span>{t(label)}</span>
              <Icon size={19} />
            </div>
            <strong>{value}</strong>
            <small>{sub}</small>
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        <div>
          <div className="section-heading">
            <h2>
              {t("Your growing season")} <span>{data.crops.length}</span>
            </h2>
            <Link to="/crops">
              {t("View all")} <ArrowUpRight size={15} />
            </Link>
          </div>
          {data.crops.length ? (
            <div className="crop-grid">
              {data.crops.slice(0, 3).map((crop) => (
                <CropCard
                  key={crop._id}
                  crop={crop}
                  farm={data.farms.find((f) => f._id === crop.farmId)?.name}
                />
              ))}
            </div>
          ) : (
            <div className="panel">
              <Empty />
              <Link className="button" to="/farms">
                {t("Add farm")}
              </Link>
            </div>
          )}
          <div className="panel activity-panel">
            <div className="section-heading">
              <h2>{t("Recent activities")}</h2>
              <Link to="/activities">
                {t("View all")} <ArrowUpRight size={15} />
              </Link>
            </div>
            {!data.activities.length ? (
              <Empty />
            ) : (
              data.activities.map((activity) => (
                <div className="activity-row" key={activity._id}>
                  <span className="activity-icon">
                    <CalendarDays size={18} />
                  </span>
                  <div>
                    <strong>{activity.title}</strong>
                    <small>
                      {activity.type} ·{" "}
                      {data.farms.find((f) => f._id === activity.farmId)?.name}
                    </small>
                  </div>
                  <time>{dateLabel(activity.date)}</time>
                </div>
              ))
            )}
          </div>
        </div>
        <aside className="dashboard-aside">
          <div className="panel advisory-panel">
            <div className="section-heading">
              <h2>{t("Farm advisories")}</h2>
              <span className="mini-icon">
                <Leaf size={16} />
              </span>
            </div>
            {data.advisories.length ? (
              data.advisories.map((advisory) => (
                <div className="advisory-item" key={advisory._id}>
                  <Badge>{advisory.severity}</Badge>
                  <h3>{advisory.title}</h3>
                  <p>{advisory.body}</p>
                </div>
              ))
            ) : (
              <p>No advisories have been published yet.</p>
            )}
            <Link className="text-btn" to="/weather">
              See all advisories <ArrowRight size={15} />
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}
function Records({ type }) {
  const { t, notify } = useApp();
  const definition = definitions[type];
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [remove, setRemove] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const result = useData(
    `/${type}?page=${page}&q=${encodeURIComponent(search)}`,
  );
  const farms = useData(type !== "farms" ? "/farms?limit=100" : null);
  async function save(values) {
    await api(`/${type}${editing?._id ? `/${editing._id}` : ""}`, {
      method: editing?._id ? "PATCH" : "POST",
      body: values,
    });
    result.reload();
    if (type === "farms") farms.reload();
    notify("Record saved.");
  }
  async function confirmDelete() {
    setBusy(true);
    setError("");
    try {
      await api(`/${type}/${remove._id}`, { method: "DELETE" });
      setRemove(null);
      result.reload();
      notify("Record deleted.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const actions = (row) => (
    <div className="record-actions">
      <button className="text-btn" onClick={() => setEditing(row)}>
        <Pencil size={14} />
        {t("Edit")}
      </button>
      <button
        className="icon-btn danger"
        aria-label={`Delete ${row.name || row.title || "reading"}`}
        onClick={() => {
          setRemove(row);
          setError("");
        }}
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
  return (
    <>
      <PageHeader
        title={definition.title}
        description={definition.subtitle}
        action={
          <button className="button" onClick={() => setEditing({})}>
            <Plus size={17} />
            {t(definition.add)}
          </button>
        }
      />
      <div className="toolbar">
        <SearchBar
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
        />
        <span>{result.data?.total || 0} records</span>
      </div>
      {type === "soil" && (
        <div className="notice">
          Readings are recorded in mg/kg. pH describes acidity; nutrient needs
          depend on crop, soil and local laboratory guidance. These records do
          not replace a soil test or expert advice.
        </div>
      )}
      {result.loading ? (
        <Loading />
      ) : result.error ? (
        <ErrorBox message={result.error} retry={result.reload} />
      ) : !result.data.items.length ? (
        <div className="panel">
          <Empty />
        </div>
      ) : (
        <div
          className={
            type === "crops" ? "crop-grid records-grid" : "records-grid"
          }
        >
          {result.data.items.map((row) => {
            const farm = farms.data?.items.find(
              (f) => f._id === row.farmId,
            )?.name;
            return type === "crops" ? (
              <CropCard
                key={row._id}
                crop={row}
                farm={farm}
                actions={actions(row)}
              />
            ) : (
              <article className="panel record-card" key={row._id}>
                {type === "farms" ? (
                  <>
                    <div className="farm-illustration">
                      <FieldArt compact />
                      <span>
                        <MapPin size={18} />
                      </span>
                    </div>
                    <h2>{row.name}</h2>
                    <p>
                      <MapPin size={14} /> {row.location}
                    </p>
                    <div className="record-metrics">
                      <div>
                        <small>Land area</small>
                        <strong>{row.area} acres</strong>
                      </div>
                      <div>
                        <small>Soil type</small>
                        <strong>{row.soilType}</strong>
                      </div>
                    </div>
                    <small className="muted">
                      {row.latitude.toFixed(4)}, {row.longitude.toFixed(4)}
                    </small>
                  </>
                ) : type === "soil" ? (
                  <>
                    <div className="card-top">
                      <span className="activity-icon">
                        <FlaskConical size={21} />
                      </span>
                      <span>{dateLabel(row.testedAt)}</span>
                    </div>
                    <h2>{farm || "Soil reading"}</h2>
                    <div className="soil-reading">
                      <strong>
                        {row.ph}
                        <small>pH</small>
                      </strong>
                      <Badge>
                        {row.ph < 7
                          ? "Acidic"
                          : row.ph > 7
                            ? "Alkaline"
                            : "Neutral"}
                      </Badge>
                    </div>
                    <div className="ph-scale">
                      <i style={{ left: `${(row.ph / 14) * 100}%` }} />
                    </div>
                    <div className="record-metrics soil-metrics">
                      {[
                        ["N", row.nitrogen],
                        ["P", row.phosphorus],
                        ["K", row.potassium],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <small>{label} · mg/kg</small>
                          <strong>{value}</strong>
                        </div>
                      ))}
                    </div>
                    <p>
                      <Droplets size={15} /> Moisture: {row.moisture}%
                    </p>
                    <p className="record-notes">{row.notes}</p>
                  </>
                ) : (
                  <>
                    <div className="card-top">
                      <Badge>{row.type}</Badge>
                      <span>{dateLabel(row.date)}</span>
                    </div>
                    <h2>{row.title}</h2>
                    <p>{farm}</p>
                    <p className="record-notes">{row.notes}</p>
                  </>
                )}
                {actions(row)}
              </article>
            );
          })}
        </div>
      )}
      <Pagination data={result.data} page={page} setPage={setPage} />
      {editing && (
        <Modal
          title={t(editing._id ? "Edit" : definition.add)}
          onClose={() => setEditing(null)}
        >
          <RecordForm
            type={type}
            initial={editing}
            onClose={() => setEditing(null)}
            onSave={save}
          />
        </Modal>
      )}
      {remove && (
        <Modal title="Delete this record?" onClose={() => setRemove(null)}>
          <p>This permanently removes the selected record.</p>
          {error && <ErrorBox message={error} />}
          <div className="form-actions">
            <button
              className="button secondary"
              onClick={() => setRemove(null)}
            >
              {t("Cancel")}
            </button>
            <button
              className="button danger-bg"
              disabled={busy}
              onClick={confirmDelete}
            >
              {t("Delete")}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
function Weather() {
  const farms = useData("/farms?limit=100");
  const alerts = useData("/advisories?limit=100");
  const [selected, setSelected] = useState("");
  const farm =
    farms.data?.items.find((f) => f._id === selected) || farms.data?.items[0];
  return (
    <>
      <PageHeader
        title="Weather & alerts"
        description="Plan the days ahead with forecasts for your farm."
      />
      {farms.error && <ErrorBox message={farms.error} retry={farms.reload} />}
      <select
        className="farm-select"
        aria-label="Select farm"
        value={farm?._id || ""}
        onChange={(e) => setSelected(e.target.value)}
      >
        {farms.data?.items.map((f) => (
          <option key={f._id} value={f._id}>
            {f.name} · {f.location}
          </option>
        ))}
      </select>
      <WeatherCard farm={farm} full />
      <div className="section-heading">
        <h2>Regional advisories</h2>
        <small>Check the region and crop before applying advice.</small>
      </div>
      {alerts.error ? (
        <ErrorBox message={alerts.error} retry={alerts.reload} />
      ) : (
        <div className="records-grid">
          {alerts.data?.items.map((alert) => (
            <article className="panel record-card" key={alert._id}>
              <Badge>{alert.severity}</Badge>
              <h2>{alert.title}</h2>
              <p>{alert.body}</p>
              <div className="muted">
                {alert.region} · {alert.crop}
              </div>
            </article>
          ))}
        </div>
      )}
      {alerts.data && !alerts.data.items.length && (
        <Empty
          title="No advisories yet"
          text="Published advisories will appear here."
        />
      )}
    </>
  );
}
function Shop() {
  const { t, notify } = useApp();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const result = useData(
    `/products?page=${page}&q=${encodeURIComponent(search)}`,
  );
  const [cart, setCart] = useState([]);
  const [checkout, setCheckout] = useState(false);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const orderKey = useRef(crypto.randomUUID());
  function changeCart(next) {
    setCart(next);
    orderKey.current = crypto.randomUUID();
  }
  function add(product) {
    const exists = cart.find((item) => item.product._id === product._id);
    if ((exists?.quantity || 0) >= Math.min(product.stock, 100))
      return notify("Maximum available quantity reached.");
    changeCart(
      exists
        ? cart.map((item) =>
            item.product._id === product._id
              ? { ...item, quantity: item.quantity + 1 }
              : item,
          )
        : [...cart, { product, quantity: 1 }],
    );
    notify("Added to cart.");
  }
  async function order(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/orders", {
        method: "POST",
        body: {
          items: cart.map((item) => ({
            productId: item.product._id,
            quantity: item.quantity,
          })),
          address,
          phone,
          idempotencyKey: orderKey.current,
        },
      });
      setCheckout(false);
      changeCart([]);
      result.reload();
      notify("Order placed. Track it in My orders.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const icons = {
    Seeds: Wheat,
    Nutrition: Leaf,
    Tools: Tractor,
    Irrigation: Droplets,
  };
  return (
    <>
      <PageHeader
        title="Resource shop"
        description="Everyday essentials for the season ahead."
        action={
          <button
            className="button"
            onClick={() => {
              setCheckout(true);
              setError("");
            }}
          >
            <ShoppingBag size={17} />
            {t("Your cart")} (
            {cart.reduce((sum, item) => sum + item.quantity, 0)})
          </button>
        }
      />
      <div className="notice">
        Manual ordering only. No payment is collected online. Confirm
        availability and payment arrangements with the administrator.
      </div>
      <div className="toolbar">
        <SearchBar
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
        />
      </div>
      {result.loading ? (
        <Loading />
      ) : result.error ? (
        <ErrorBox message={result.error} retry={result.reload} />
      ) : (
        <div className="product-grid">
          {result.data.items.map((product) => {
            const Icon = icons[product.category] || Leaf;
            return (
              <article className="product-card" key={product._id}>
                <div
                  className={`product-art product-${product.category.toLowerCase()}`}
                >
                  <Icon size={70} strokeWidth={1} />
                  <span>{product.category}</span>
                </div>
                <div className="product-body">
                  <h2>{product.name}</h2>
                  <p>{product.description}</p>
                  <small>
                    {product.unit} · {product.stock} available
                  </small>
                  <div>
                    <strong>{money(product.price)}</strong>
                    <button
                      className="button small"
                      disabled={!product.stock}
                      onClick={() => add(product)}
                    >
                      {product.stock ? (
                        <>
                          <Plus size={15} />
                          {t("Add to cart")}
                        </>
                      ) : (
                        t("Out of stock")
                      )}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {result.data?.items.length === 0 && (
        <Empty
          title="No products found"
          text="The administrator can add resources to the catalog."
        />
      )}
      <Pagination data={result.data} page={page} setPage={setPage} />
      {checkout && (
        <Modal
          title={t("Your cart")}
          onClose={() => !busy && setCheckout(false)}
        >
          {!cart.length ? (
            <Empty
              title="Your cart is empty"
              text="Choose a resource to get started."
            />
          ) : (
            <form onSubmit={order}>
              {error && <ErrorBox message={error} />}
              <div className="cart-items">
                {cart.map((item) => (
                  <div className="cart-row" key={item.product._id}>
                    <div>
                      <strong>{item.product.name}</strong>
                      <small>
                        {money(item.product.price)} / {item.product.unit}
                      </small>
                    </div>
                    <input
                      aria-label={`Quantity for ${item.product.name}`}
                      type="number"
                      min="1"
                      max={Math.min(item.product.stock, 100)}
                      required
                      value={item.quantity}
                      onChange={(e) =>
                        changeCart(
                          cart.map((row) =>
                            row.product._id === item.product._id
                              ? { ...row, quantity: Number(e.target.value) }
                              : row,
                          ),
                        )
                      }
                    />
                    <button
                      className="icon-btn danger"
                      type="button"
                      aria-label={`Remove ${item.product.name}`}
                      onClick={() =>
                        changeCart(
                          cart.filter(
                            (row) => row.product._id !== item.product._id,
                          ),
                        )
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="cart-total">
                <span>{t("Total")}</span>
                <strong>
                  {money(
                    cart.reduce(
                      (sum, item) => sum + item.product.price * item.quantity,
                      0,
                    ),
                  )}
                </strong>
              </div>
              <label>
                {t("Delivery address")}
                <textarea
                  required
                  maxLength={1000}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </label>
              <label>
                {t("Phone number")}
                <input
                  required
                  type="tel"
                  pattern="[+0-9 ()\-]{8,20}"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </label>
              <p className="muted">
                Prices and stock are checked again when you place your order.
                Payment remains pending.
              </p>
              <button className="button wide" disabled={busy}>
                {busy ? "Placing order…" : t("Place order")}
                <ArrowRight size={17} />
              </button>
            </form>
          )}
        </Modal>
      )}
    </>
  );
}
function OrderList({ adminMode = false }) {
  const { notify } = useApp();
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const result = useData(`${adminMode ? "/admin" : ""}/orders?page=${page}`);
  async function update(row, status) {
    setBusy(row._id);
    setError("");
    try {
      await api(`/admin/orders/${row._id}`, {
        method: "PATCH",
        body: { status },
      });
      result.reload();
      notify("Order updated.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  }
  const transitions = {
    Placed: ["Confirmed", "Cancelled"],
    Confirmed: ["Shipped", "Cancelled"],
    Shipped: ["Delivered"],
    Delivered: [],
    Cancelled: [],
  };
  return (
    <>
      {!adminMode && (
        <PageHeader
          title="My orders"
          description="From your resource shelf to your farm."
        />
      )}
      {error && <ErrorBox message={error} />}{" "}
      {result.loading ? (
        <Loading />
      ) : result.error ? (
        <ErrorBox message={result.error} retry={result.reload} />
      ) : !result.data.items.length ? (
        <div className="panel">
          <Empty
            title="No orders yet"
            text="Orders from the resource shop will appear here."
          />
        </div>
      ) : (
        <div className="stack">
          {result.data.items.map((order) => (
            <article className="panel order-card" key={order._id}>
              <div className="card-top">
                <div>
                  <h2>Order #{order._id.slice(0, 8).toUpperCase()}</h2>
                  <small>
                    {dateLabel(order.createdAt)}
                    {adminMode && ` · ${order.customerName}`}
                  </small>
                </div>
                <Badge>{order.status}</Badge>
              </div>
              {order.items.map((item) => (
                <div className="order-item" key={item.productId}>
                  <span>
                    {item.name}
                    <small>
                      {item.quantity} × {money(item.price)}
                    </small>
                  </span>
                  <strong>{money(item.price * item.quantity)}</strong>
                </div>
              ))}
              <div className="order-bottom">
                <div>
                  <small>{order.paymentStatus}</small>
                  <p>{order.address}</p>
                  {adminMode && <p>{order.phone}</p>}
                </div>
                <strong>{money(order.total)}</strong>
              </div>
              {adminMode && (
                <div className="record-actions">
                  {transitions[order.status]?.map((status) => (
                    <button
                      className="button secondary small"
                      key={status}
                      disabled={busy === order._id}
                      onClick={() => update(order, status)}
                    >
                      {status === "Cancelled"
                        ? "Cancel order & restore stock"
                        : `Mark ${status.toLowerCase()}`}
                    </button>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
      <Pagination data={result.data} page={page} setPage={setPage} />
    </>
  );
}
function Consultations({ adminMode = false }) {
  const { t, notify } = useApp();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const result = useData(
    `${adminMode ? "/admin" : ""}/consultations?page=${page}`,
  );
  async function send(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(`/admin/consultations/${replyTo._id}/replies`, {
        method: "POST",
        body: { body: reply },
      });
      setReplyTo(null);
      setReply("");
      result.reload();
      notify("Reply sent.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {!adminMode && (
        <PageHeader
          title="Expert help"
          description="Share your observations. Get guidance from your farm support team."
          action={
            <button className="button" onClick={() => setEditing(true)}>
              <Plus size={17} />
              {t("Ask an expert")}
            </button>
          }
        />
      )}
      <div className="notice">
        Consultations are answered by the administrator or their appointed farm
        support team. This is an asynchronous request service.
      </div>
      {result.loading ? (
        <Loading />
      ) : result.error ? (
        <ErrorBox message={result.error} retry={result.reload} />
      ) : !result.data.items.length ? (
        <div className="panel">
          <Empty
            title="No consultations yet"
            text="Start a conversation about your crop, soil or irrigation."
          />
        </div>
      ) : (
        <div className="stack">
          {result.data.items.map((item) => (
            <article className="panel consultation-card" key={item._id}>
              <div className="card-top">
                <span className="category-label">
                  {item.category} · {dateLabel(item.createdAt)}
                </span>
                <Badge>{item.status}</Badge>
              </div>
              <h2>{item.subject}</h2>
              {adminMode && <small>From {item.author}</small>}
              <p className="pre-wrap">{item.message}</p>
              {item.replies.map((response, i) => (
                <div className="expert-reply" key={i}>
                  <span>
                    <ShieldCheck size={16} /> {response.author} ·{" "}
                    {dateLabel(response.createdAt)}
                  </span>
                  <p className="pre-wrap">{response.body}</p>
                </div>
              ))}
              {adminMode && (
                <button
                  className="button secondary small"
                  onClick={() => {
                    setReplyTo(item);
                    setError("");
                  }}
                >
                  {t("Reply")}
                </button>
              )}
            </article>
          ))}
        </div>
      )}
      <Pagination data={result.data} page={page} setPage={setPage} />
      {editing && (
        <Modal title={t("Ask an expert")} onClose={() => setEditing(false)}>
          <RecordForm
            type="consultations"
            onClose={() => setEditing(false)}
            onSave={async (values) => {
              await api("/consultations", { method: "POST", body: values });
              result.reload();
              notify("Consultation submitted.");
            }}
          />
        </Modal>
      )}
      {replyTo && (
        <Modal
          title={`Reply: ${replyTo.subject}`}
          onClose={() => setReplyTo(null)}
        >
          <form onSubmit={send}>
            {error && <ErrorBox message={error} />}
            <label>
              {t("Reply")}
              <textarea
                required
                rows={5}
                maxLength={4000}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
              />
            </label>
            <button className="button" disabled={busy}>
              {t("Send reply")}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
function Comments({ post }) {
  const { user, t, notify } = useApp();
  const result = useData(`/posts/${post._id}/comments?limit=100`);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(`/posts/${post._id}/comments`, {
        method: "POST",
        body: { body },
      });
      setBody("");
      result.reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(id) {
    try {
      await api(`/comments/${id}`, { method: "DELETE" });
      result.reload();
      notify("Comment deleted.");
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <div className="comments">
      {result.loading ? (
        <Loading />
      ) : result.error ? (
        <ErrorBox message={result.error} retry={result.reload} />
      ) : (
        result.data?.items.map((comment) => (
          <div className="comment" key={comment._id}>
            <div>
              <strong>{comment.author}</strong>
              <small>{dateLabel(comment.createdAt)}</small>
              {(user.id === comment.ownerId || user.role === "admin") && (
                <button
                  className="icon-btn"
                  aria-label="Delete comment"
                  onClick={() => remove(comment._id)}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
            <p className="pre-wrap">{comment.body}</p>
          </div>
        ))
      )}
      {error && <ErrorBox message={error} />}
      <form onSubmit={submit}>
        <label>
          {t("Comments")}
          <textarea
            required
            maxLength={4000}
            placeholder="Share a helpful response…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </label>
        <button className="button small" disabled={busy}>
          {t("Post comment")}
        </button>
      </form>
    </div>
  );
}
function Community({ adminMode = false }) {
  const { user, t, notify } = useApp();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [create, setCreate] = useState(false);
  const [expanded, setExpanded] = useState("");
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);
  const result = useData(
    `${adminMode ? "/admin" : ""}/posts?page=${page}&q=${encodeURIComponent(search)}`,
  );
  async function remove() {
    setBusy(true);
    try {
      await api(`/posts/${removing._id}`, { method: "DELETE" });
      result.reload();
      setRemoving(null);
      notify("Post removed from the community.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function report(post) {
    try {
      await api(`/posts/${post._id}/report`, { method: "POST", body: {} });
      notify("Report sent to the administrator.");
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <>
      {!adminMode && (
        <PageHeader
          title="Community"
          description="Good things grow when we learn together."
          action={
            <button className="button" onClick={() => setCreate(true)}>
              <Plus size={17} />
              {t("New discussion")}
            </button>
          }
        />
      )}
      <div className="toolbar">
        <SearchBar
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
        />
      </div>
      {error && <ErrorBox message={error} />}{" "}
      {result.loading ? (
        <Loading />
      ) : result.error ? (
        <ErrorBox message={result.error} retry={result.reload} />
      ) : !result.data.items.length ? (
        <div className="panel">
          <Empty
            title="Start the conversation"
            text="Share a question or an observation from your farm."
          />
        </div>
      ) : (
        <div className="stack community-stack">
          {result.data.items.map((post) => (
            <article className="panel post-card" key={post._id}>
              <div className="post-author">
                <div className="avatar">{post.author.slice(0, 1)}</div>
                <div>
                  <strong>{post.author}</strong>
                  <small>{dateLabel(post.createdAt)}</small>
                </div>
                <Badge>{post.category}</Badge>
              </div>
              <h2>{post.title}</h2>
              <p className="pre-wrap">{post.body}</p>
              {adminMode && (
                <p className="muted">
                  {post.reports.length} reports ·{" "}
                  {post.hidden ? "Hidden" : "Visible"}
                </p>
              )}
              <div className="record-actions">
                {!post.hidden && (
                  <button
                    className="text-btn"
                    onClick={() =>
                      setExpanded(expanded === post._id ? "" : post._id)
                    }
                  >
                    <MessagesSquare size={16} />
                    {t("Comments")}
                  </button>
                )}
                {!post.hidden && (
                  <button className="text-btn" onClick={() => report(post)}>
                    {t("Report")}
                  </button>
                )}
                {!post.hidden && (user.id === post.ownerId || adminMode) && (
                  <button
                    className="text-btn danger"
                    onClick={() => setRemoving(post)}
                  >
                    {t("Delete")}
                  </button>
                )}
              </div>
              {expanded === post._id && !post.hidden && (
                <Comments post={post} />
              )}
            </article>
          ))}
        </div>
      )}
      <Pagination data={result.data} page={page} setPage={setPage} />
      {create && (
        <Modal title={t("New discussion")} onClose={() => setCreate(false)}>
          <RecordForm
            type="posts"
            onClose={() => setCreate(false)}
            onSave={async (values) => {
              await api("/posts", { method: "POST", body: values });
              result.reload();
              notify("Discussion published.");
            }}
          />
        </Modal>
      )}
      {removing && (
        <Modal
          title="Remove this discussion?"
          onClose={() => setRemoving(null)}
        >
          <p>
            The post and its comments will no longer appear in the community.
          </p>
          <div className="form-actions">
            <button
              className="button secondary"
              onClick={() => setRemoving(null)}
            >
              {t("Cancel")}
            </button>
            <button
              className="button danger-bg"
              disabled={busy}
              onClick={remove}
            >
              {t("Delete")}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
function AdminCatalog({ type }) {
  const { t, notify } = useApp();
  const [page, setPage] = useState(1);
  const [edit, setEdit] = useState(null);
  const [remove, setRemove] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const result = useData(`/admin/${type}?page=${page}`);
  async function save(values) {
    await api(`/admin/${type}${edit?._id ? `/${edit._id}` : ""}`, {
      method: edit?._id ? "PATCH" : "POST",
      body: values,
    });
    result.reload();
    notify("Saved successfully.");
  }
  async function confirmRemove() {
    setBusy(true);
    setError("");
    try {
      await api(`/admin/${type}/${remove._id}`, { method: "DELETE" });
      result.reload();
      setRemove(null);
      notify("Removed successfully.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="toolbar">
        <h2>{t(type === "products" ? "Products" : "Advisories")}</h2>
        <button className="button" onClick={() => setEdit({})}>
          <Plus size={16} />
          {t(type === "products" ? "Add product" : "Publish advisory")}
        </button>
      </div>
      {result.loading ? (
        <Loading />
      ) : result.error ? (
        <ErrorBox message={result.error} retry={result.reload} />
      ) : !result.data.items.length ? (
        <Empty />
      ) : (
        <div className="stack">
          {result.data.items.map((row) => (
            <div className="panel admin-row" key={row._id}>
              <div>
                <h3>{row.name || row.title}</h3>
                <p>
                  {type === "products"
                    ? `${money(row.price)} · ${row.stock} in stock${row.archived ? " · Archived" : ""}`
                    : `${row.region} · ${row.severity}`}
                </p>
              </div>
              <div className="row-actions">
                <button
                  className="button secondary small"
                  onClick={() => setEdit(row)}
                >
                  {t("Edit")}
                </button>
                <button
                  className="icon-btn danger"
                  aria-label="Remove record"
                  onClick={() => {
                    setRemove(row);
                    setError("");
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Pagination data={result.data} page={page} setPage={setPage} />
      {edit && (
        <Modal
          title={t(
            edit._id
              ? "Edit"
              : type === "products"
                ? "Add product"
                : "Publish advisory",
          )}
          onClose={() => setEdit(null)}
        >
          <RecordForm
            type={type}
            initial={edit}
            onClose={() => setEdit(null)}
            onSave={save}
          />
        </Modal>
      )}
      {remove && (
        <Modal title="Remove this record?" onClose={() => setRemove(null)}>
          <p>
            {type === "products"
              ? "The product will be archived. Existing orders will be preserved."
              : "The advisory will be deleted."}
          </p>
          {error && <ErrorBox message={error} />}
          <div className="form-actions">
            <button
              className="button secondary"
              onClick={() => setRemove(null)}
            >
              {t("Cancel")}
            </button>
            <button
              className="button danger-bg"
              disabled={busy}
              onClick={confirmRemove}
            >
              {t("Remove")}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
function AdminUsers() {
  const { notify } = useApp();
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const result = useData(`/admin/users?page=${page}`);
  async function toggle(user) {
    setBusy(user._id);
    setError("");
    try {
      await api(`/admin/users/${user._id}`, {
        method: "PATCH",
        body: { disabled: !user.disabled },
      });
      result.reload();
      notify("Account updated.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  }
  return (
    <>
      {error && <ErrorBox message={error} />}{" "}
      {result.loading ? (
        <Loading />
      ) : result.error ? (
        <ErrorBox message={result.error} retry={result.reload} />
      ) : (
        <div className="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Access</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {result.data.items.map((user) => (
                <tr key={user._id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>
                    <Badge>{user.disabled ? "Disabled" : "Active"}</Badge>
                  </td>
                  <td>
                    {user.role !== "admin" && (
                      <button
                        className="button secondary small"
                        disabled={busy === user._id}
                        onClick={() => toggle(user)}
                      >
                        {user.disabled ? "Enable" : "Disable"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination data={result.data} page={page} setPage={setPage} />
    </>
  );
}
function Admin() {
  const { user, t } = useApp();
  const [tab, setTab] = useState("Users");
  if (user.role !== "admin") return <Navigate to="/" replace />;
  return (
    <>
      <PageHeader
        title="Administration"
        description="Care for your community and keep the platform running smoothly."
      />
      <div className="tabs">
        {[
          "Users",
          "Products",
          "Orders",
          "Consultations",
          "Posts",
          "Advisories",
        ].map((name) => (
          <button
            key={name}
            className={tab === name ? "active" : ""}
            onClick={() => setTab(name)}
          >
            {t(name)}
          </button>
        ))}
      </div>
      {tab === "Users" ? (
        <AdminUsers />
      ) : tab === "Products" ? (
        <AdminCatalog key="products" type="products" />
      ) : tab === "Orders" ? (
        <OrderList adminMode />
      ) : tab === "Consultations" ? (
        <Consultations adminMode />
      ) : tab === "Posts" ? (
        <Community adminMode />
      ) : (
        <AdminCatalog key="advisories" type="advisories" />
      )}
    </>
  );
}
function Account() {
  const { user, setUser, t, notify } = useApp();
  const [name, setName] = useState(user.name);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await api("/account", { method: "PATCH", body: { name } });
      setUser(result.user);
      notify("Profile updated.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader
        title="Account"
        description="The person behind the growing season."
      />
      <form className="panel account-form" onSubmit={save}>
        {error && <ErrorBox message={error} />}
        <label>
          {t("Your name")}
          <input
            required
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          {t("Registered email")}
          <input disabled value={user.email} />
        </label>
        <label>
          {t("Role")}
          <input disabled value={user.role} />
        </label>
        <button className="button" disabled={busy}>
          {t("Save changes")}
        </button>
      </form>
    </>
  );
}
function Notifications({ onClose }) {
  const { t } = useApp();
  const result = useData("/notifications?limit=100");
  const [error, setError] = useState("");
  async function read(id) {
    try {
      await api(`/notifications/${id}`, { method: "PATCH", body: {} });
      result.reload();
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <Modal title={t("Notifications")} onClose={onClose}>
      {error && <ErrorBox message={error} />}{" "}
      {result.loading ? (
        <Loading />
      ) : result.error ? (
        <ErrorBox message={result.error} retry={result.reload} />
      ) : !result.data.items.length ? (
        <Empty
          title="No notifications yet."
          text="Order updates and consultation replies will appear here."
        />
      ) : (
        result.data.items.map((item) => (
          <div
            className={`notification ${item.read ? "read" : ""}`}
            key={item._id}
          >
            <h3>{item.title}</h3>
            <p>{item.body}</p>
            <small>{dateLabel(item.createdAt)}</small>
            {!item.read && (
              <button className="text-btn" onClick={() => read(item._id)}>
                {t("Mark read")}
              </button>
            )}
          </div>
        ))
      )}
    </Modal>
  );
}
function Shell() {
  const { user, setUser, t, health, language, setLanguage, notify } = useApp();
  const [mobile, setMobile] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const location = useLocation();
  useEffect(() => {
    setMobile(false);
  }, [location.pathname]);
  async function logout() {
    setLoggingOut(true);
    try {
      await api("/auth/logout", { method: "POST", body: {} });
      setUser(null);
    } catch (e) {
      notify(e.message);
    } finally {
      setLoggingOut(false);
    }
  }
  return (
    <div className="app-layout">
      {mobile && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <Link to="/" className="brand">
          <span className="brand-icon">
            <Sprout />
          </span>
          field<span>wise</span>
          <span className="brand-dot">+</span>
        </Link>
        <p className="brand-tagline">A clearer way to grow.</p>
        <div className="nav-caption">FIELD OPERATIONS</div>
        <nav aria-label="Main navigation">
          {nav.map(([path, label, Icon], i) => (
            <React.Fragment key={path}>
              {i === 6 && (
                <div className="nav-caption nav-divider">MARKET & PEOPLE</div>
              )}
              <NavLink to={path} end={path === "/"}>
                <Icon size={18} />
                <span>{t(label)}</span>
              </NavLink>
            </React.Fragment>
          ))}
          {user.role === "admin" && (
            <NavLink to="/admin">
              <ShieldCheck size={18} />
              <span>{t("Administration")}</span>
            </NavLink>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <Sprout size={24} />
            <strong>Every field tells a story.</strong>
            <p>Keep yours in one place.</p>
          </div>
          <NavLink to="/account">
            <Settings size={17} />
            {t("Account")}
          </NavLink>
          <button onClick={logout} disabled={loggingOut}>
            <LogOut size={17} />
            {t("Sign out")}
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-btn mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu />
            </button>
            <span>
              Workspace <ChevronRight size={13} />{" "}
              <strong>
                {t(
                  nav.find((item) => item[0] === location.pathname)?.[1] ||
                    (location.pathname === "/admin"
                      ? "Administration"
                      : "Account"),
                )}
              </strong>
            </span>
          </div>
          <div className="topbar-actions">
            {health?.demo && (
              <span className="demo-indicator">{t("Local demo")}</span>
            )}
            <button
              className="language"
              onClick={() => setLanguage(language === "en" ? "hi" : "en")}
            >
              {language === "en" ? "हिन्दी" : "English"}
            </button>
            <button
              className="icon-btn notification-btn"
              aria-label={t("Notifications")}
              onClick={() => setNotifications(true)}
            >
              <Bell size={19} />
            </button>
            <Link className="profile-link" to="/account">
              <div className="avatar">{user.name.slice(0, 1)}</div>
              <div>
                <strong>{user.name}</strong>
                <small>
                  {user.role === "admin" ? "Administrator" : "Farmer"}
                </small>
              </div>
            </Link>
          </div>
        </header>
        <main id="main-content">
          {health?.demo && (
            <div className="demo-banner">
              Local demo · Sample farm and catalog records · Changes are saved
              on this computer · Weather uses a live provider
            </div>
          )}
          <Routes>
            <Route path="/" element={<Dashboard />} />
            {["farms", "crops", "soil", "activities"].map((type) => (
              <Route
                key={type}
                path={`/${type}`}
                element={<Records key={type} type={type} />}
              />
            ))}
            <Route path="/weather" element={<Weather />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/orders" element={<OrderList />} />
            <Route path="/consultations" element={<Consultations />} />
            <Route path="/community" element={<Community />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/account" element={<Account />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <footer className="page-footer">
            <span>
              <Sprout size={14} /> Fieldwise
            </span>
            <span>Make every season count.</span>
          </footer>
        </main>
      </div>
      {notifications && (
        <Notifications onClose={() => setNotifications(false)} />
      )}
    </div>
  );
}
class ErrorBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="fatal-error">
        <h1>Something went wrong.</h1>
        <p>Your saved records are safe. Reload the page to continue.</p>
        <button className="button" onClick={() => window.location.reload()}>
          Reload
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [health, setHealth] = useState(null);
  const [startupError, setStartupError] = useState("");
  const [language, setLanguage] = useState(
    () => localStorage.getItem("fieldwise_language") || "en",
  );
  const [toast, setToast] = useState("");
  const timeout = useRef();
  const t = (text) => (language === "hi" ? hindi[text] || text : text);
  function notify(message) {
    clearTimeout(timeout.current);
    setToast(message);
    timeout.current = setTimeout(() => setToast(""), 4500);
  }
  async function initialize() {
    setStartupError("");
    setReady(false);
    try {
      const status = await api("/health");
      setHealth(status);
      try {
        const result = await api("/auth/me");
        setUser(result.user);
      } catch (e) {
        if (e.status !== 401) throw e;
      }
    } catch (e) {
      setStartupError(e.message);
    } finally {
      setReady(true);
    }
  }
  useEffect(() => {
    initialize();
    return () => clearTimeout(timeout.current);
  }, []);
  useEffect(() => {
    localStorage.setItem("fieldwise_language", language);
    document.documentElement.lang = language;
  }, [language]);
  return (
    <ErrorBoundary>
      <Context.Provider
        value={{ user, setUser, health, t, language, setLanguage, notify }}
      >
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        {!ready ? (
          <Loading />
        ) : startupError ? (
          <div className="fatal-error">
            <h1>Unable to connect</h1>
            <ErrorBox message={startupError} retry={initialize} />
          </div>
        ) : user ? (
          <Shell />
        ) : (
          <Auth />
        )}
        {toast && (
          <div className="toast" role="status">
            <Check size={17} />
            {toast}
            <button
              aria-label="Dismiss notification"
              onClick={() => setToast("")}
            >
              <X size={14} />
            </button>
          </div>
        )}
      </Context.Provider>
    </ErrorBoundary>
  );
}
