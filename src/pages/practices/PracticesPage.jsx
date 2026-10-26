import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Header from "../../features/nav/Header.jsx";
import Footer from "../../components/Footer.jsx";
import Breadcrumbs from "../../components/Breadcrumbs.jsx";
import { API_BASE } from "../../constants/index.js";
import { authHeaders } from "../../utils/authHeaders.js";
import { PRACTICE_LEVELS, PRACTICE_TOPICS } from "../../features/practices/practiceTaxonomy.js";

const EMPTY_FILTERS = { q: "", topic: "", level: "", organization: "" };

function PracticeShell({ currentUser, onGoAuth, onGoAdmin, onGoProfile, children }) {
  return (
    <div className="practices-page">
      <style>{PRACTICES_CSS}</style>
      <Header currentUser={currentUser} onGoAuth={onGoAuth} onGoAdmin={onGoAdmin} onGoProfile={onGoProfile} />
      <main className="practices-main">{children}</main>
      <Footer />
    </div>
  );
}

function PracticeLayout({ currentUser, onGoAuth, onGoAdmin, onGoProfile, children, current }) {
  return (
    <PracticeShell currentUser={currentUser} onGoAuth={onGoAuth} onGoAdmin={onGoAdmin} onGoProfile={onGoProfile}>
      <div className="practices-container">
        <Breadcrumbs items={[{ label: "Главная", to: "/" }, { label: "Каталог практик", to: "/praktiki/" }, ...(current ? [{ label: current }] : [])]} />
        {children}
      </div>
    </PracticeShell>
  );
}

function formatPracticeDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

function PracticeCard({ practice }) {
  return (
    <article className="practice-card">
      <div className="practice-card-topline">
        <span className="practice-chip">{practice.level}</span>
        {practice.topic && <span className="practice-topic">{practice.topic}</span>}
      </div>
      <h2 title={practice.title}>{practice.title}</h2>
      <p className="practice-card-summary">{practice.summary || "Описание практики доступно на странице материала."}</p>
      <dl className="practice-card-meta">
        <div><dt>Организация</dt><dd>{practice.organization}</dd></div>
        {practice.municipality && <div><dt>Муниципалитет</dt><dd>{practice.municipality}</dd></div>}
      </dl>
      <div className="practice-card-footer">
        <span>{formatPracticeDate(practice.published_at)}</span>
        <Link className="practice-action" to={`/praktiki/${encodeURIComponent(practice.slug || practice.id)}/`}>Подробнее</Link>
      </div>
    </article>
  );
}

function FilterForm({ filters, onChange, onSubmit, onReset }) {
  const isDirty = Object.values(filters).some(Boolean);
  return (
    <form className="practice-filters" onSubmit={onSubmit}>
      <label className="practice-filter-search">
        <span>Поиск</span>
        <input value={filters.q} onChange={(event) => onChange("q", event.target.value)} placeholder="Название, организация, автор" />
      </label>
      <label>
        <span>Направление</span>
        <select value={filters.topic} onChange={(event) => onChange("topic", event.target.value)}>
          <option value="">Все направления</option>
          {PRACTICE_TOPICS.map((topic) => <option key={topic} value={topic}>{topic}</option>)}
        </select>
      </label>
      <label>
        <span>Уровень</span>
        <select value={filters.level} onChange={(event) => onChange("level", event.target.value)}>
          <option value="">Все уровни</option>
          {PRACTICE_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
        </select>
      </label>
      <label>
        <span>Организация</span>
        <input value={filters.organization} onChange={(event) => onChange("organization", event.target.value)} placeholder="Например, школа" />
      </label>
      <div className="practice-filter-actions">
        <button className="practice-primary-button" type="submit">Найти</button>
        {isDirty && <button className="practice-secondary-button" type="button" onClick={onReset}>Сбросить</button>}
      </div>
    </form>
  );
}

export default function PracticesPage(props) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPractices = useCallback(async (activeFilters) => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ limit: "100" });
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (value.trim()) params.set(key, value.trim());
    });
    try {
      const response = await fetch(`${API_BASE}/api/practices/?${params.toString()}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setItems(Array.isArray(data.items) ? data.items : []);
      setTotal(Number(data.total || 0));
    } catch {
      setItems([]);
      setTotal(0);
      setError("Не удалось загрузить каталог практик.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadPractices(EMPTY_FILTERS); }, [loadPractices]);

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function submitFilters(event) {
    event.preventDefault();
    void loadPractices(filters);
  }

  function resetFilters() {
    setFilters(EMPTY_FILTERS);
    void loadPractices(EMPTY_FILTERS);
  }

  return (
    <PracticeLayout {...props}>
      <section className="practices-hero">
        <div>
          <span className="practices-eyebrow">Обмен опытом и тиражирование решений</span>
          <h1>Каталог образовательных практик</h1>
          <p>Открытая коллекция инновационных и развивающих практик образовательных организаций региона.</p>
        </div>
        <Link className="practice-primary-button practice-submit-link" to="/praktiki/podat/">Подать практику</Link>
      </section>

      <section className="practices-toolbar" aria-label="Фильтры каталога">
        <FilterForm filters={filters} onChange={updateFilter} onSubmit={submitFilters} onReset={resetFilters} />
      </section>

      <section className="practices-results">
        <div className="practices-results-head">
          <div><h2>Опубликованные практики</h2><span>{total} материалов</span></div>
        </div>
        {loading && <div className="practice-message">Загрузка каталога...</div>}
        {!loading && error && <div className="practice-message practice-message-error">{error}</div>}
        {!loading && !error && !items.length && <div className="practice-message">По выбранным параметрам практики не найдены.</div>}
        {!loading && !error && items.length > 0 && <div className="practice-grid">{items.map((item) => <PracticeCard key={item.id} practice={item} />)}</div>}
      </section>
    </PracticeLayout>
  );
}

export function PracticeDetailPage(props) {
  const { slug } = useParams();
  const [practice, setPractice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`${API_BASE}/api/practices/${encodeURIComponent(slug)}`)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => { if (!cancelled) setPractice(data); })
      .catch(() => { if (!cancelled) setError("Практика не найдена или ещё не опубликована."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slug]);

  return (
    <PracticeLayout {...props} current={practice?.title}>
      {loading && <div className="practice-message">Загрузка практики...</div>}
      {!loading && error && <div className="practice-message practice-message-error">{error}</div>}
      {!loading && practice && (
        <article className="practice-detail">
          <div className="practice-detail-topline"><span className="practice-chip">{practice.level}</span><span className="practice-topic">{practice.topic}</span></div>
          <h1>{practice.title}</h1>
          <p className="practice-detail-lead">{practice.summary}</p>
          <div className="practice-detail-grid">
            <div className="practice-detail-main">
              <DetailBlock title="Описание практики" value={practice.description} />
              <DetailBlock title="Результаты" value={practice.results} />
              {Array.isArray(practice.materials) && practice.materials.length > 0 && (
                <section className="practice-detail-section"><h2>Материалы</h2><ul className="practice-material-list">{practice.materials.map((material, index) => <li key={`${material.url || material.title || "material"}-${index}`}><a href={material.url} target="_blank" rel="noreferrer">{material.title || material.url}</a></li>)}</ul></section>
              )}
            </div>
            <aside className="practice-detail-aside">
              <InfoRow label="Организация" value={practice.organization} />
              <InfoRow label="Муниципалитет" value={practice.municipality} />
              <InfoRow label="Автор практики" value={practice.author_name} />
              <InfoRow label="Целевая аудитория" value={practice.target_audience} />
              <InfoRow label="Период реализации" value={practice.implementation_period} />
            </aside>
          </div>
        </article>
      )}
    </PracticeLayout>
  );
}

function DetailBlock({ title, value }) {
  if (!value) return null;
  return <section className="practice-detail-section"><h2>{title}</h2><p>{value}</p></section>;
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return <div className="practice-info-row"><dt>{label}</dt><dd>{value}</dd></div>;
}

export function PracticeSubmitPage(props) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: "", summary: "", description: "", topic: "", level: "Начальный", organization: "", municipality: "", author_name: "", author_email: "", target_audience: "", implementation_period: "", results: "", cover_image_url: "", materials: "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function update(key, value) { setForm((current) => ({ ...current, [key]: value })); }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    const materials = form.materials.split("\n").map((item) => item.trim()).filter(Boolean).map((url) => ({ title: url.split("/").pop() || url, url }));
    try {
      const response = await fetch(`${API_BASE}/api/practices/submit/`, { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify({ ...form, author_email: form.author_email || null, materials }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(Array.isArray(data.detail) ? data.detail.map((item) => item.msg).join("; ") : data.detail || "Не удалось отправить практику.");
      setMessage("Заявка принята. После экспертизы практика появится в каталоге.");
      setTimeout(() => navigate("/praktiki/"), 1200);
    } catch (submitError) {
      setError(submitError.message || "Не удалось отправить практику.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PracticeLayout {...props} current="Подать практику">
      <section className="practice-form-panel">
        <div className="practice-form-heading"><span className="practices-eyebrow">Открытый приём заявок</span><h1>Подать образовательную практику</h1><p>Заполните форму. Материал будет сохранён со статусом «На экспертизе» и станет виден в каталоге после публикации редактором.</p></div>
        <form className="practice-form" onSubmit={submit}>
          <label><span>Название практики *</span><input required value={form.title} onChange={(event) => update("title", event.target.value)} /></label>
          <label><span>Краткое описание *</span><textarea required rows="3" value={form.summary} onChange={(event) => update("summary", event.target.value)} /></label>
          <div className="practice-form-grid">
            <label><span>Направление *</span><select required value={form.topic} onChange={(event) => update("topic", event.target.value)}><option value="">Выберите направление</option>{PRACTICE_TOPICS.map((topic) => <option key={topic} value={topic}>{topic}</option>)}</select></label>
            <label><span>Уровень</span><select value={form.level} onChange={(event) => update("level", event.target.value)}>{PRACTICE_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}</select></label>
            <label><span>Образовательная организация *</span><input required value={form.organization} onChange={(event) => update("organization", event.target.value)} /></label>
            <label><span>Муниципалитет</span><input value={form.municipality} onChange={(event) => update("municipality", event.target.value)} /></label>
            <label><span>Автор практики *</span><input required value={form.author_name} onChange={(event) => update("author_name", event.target.value)} /></label>
            <label><span>Email автора</span><input type="email" value={form.author_email} onChange={(event) => update("author_email", event.target.value)} /></label>
            <label><span>Целевая аудитория</span><input value={form.target_audience} onChange={(event) => update("target_audience", event.target.value)} /></label>
            <label><span>Период реализации</span><input value={form.implementation_period} onChange={(event) => update("implementation_period", event.target.value)} /></label>
          </div>
          <label><span>Описание практики *</span><textarea required rows="8" value={form.description} onChange={(event) => update("description", event.target.value)} /></label>
          <label><span>Результаты</span><textarea rows="5" value={form.results} onChange={(event) => update("results", event.target.value)} /></label>
          <label><span>Ссылки на материалы</span><textarea rows="3" placeholder="По одной ссылке в строке" value={form.materials} onChange={(event) => update("materials", event.target.value)} /></label>
          {message && <div className="practice-form-success" role="status">{message}</div>}
          {error && <div className="practice-message-error" role="alert">{error}</div>}
          <div className="practice-form-actions"><Link className="practice-secondary-button" to="/praktiki/">Отмена</Link><button className="practice-primary-button" disabled={saving} type="submit">{saving ? "Отправка..." : "Отправить на экспертизу"}</button></div>
        </form>
      </section>
    </PracticeLayout>
  );
}

const PRACTICES_CSS = `
  .practices-page { min-height: 100vh; display: flex; flex-direction: column; background: var(--imcro-color-bg); color: var(--imcro-color-text); font-family: Manrope, system-ui, sans-serif; }
  .practices-main { flex: 1; padding-top: 94px; }
  .practices-container { width: min(var(--imcro-container-max, 1280px), calc(100% - 32px)); margin: 0 auto; padding: 24px 0 72px; }
  .practices-page .app-breadcrumbs { color: rgba(255,255,255,.82); font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 14px; font-weight: 850; line-height: normal; }
  .practices-page .app-breadcrumbs a { color: var(--imcro-color-surface); }
  .practices-page .app-breadcrumbs a:hover { color: var(--imcro-color-surface); text-decoration: underline; text-underline-offset: 4px; }
  .practices-page .app-breadcrumbs [aria-current="page"] { color: rgba(255,255,255,.72); }
  .practices-page .app-breadcrumbs-separator { color: rgba(255,255,255,.58); }
  .practices-hero { display: flex; align-items: end; justify-content: space-between; gap: 24px; padding: 32px; border-radius: 8px; background: #1f5073; color: #fff; }
  .practices-eyebrow { display: inline-flex; padding: 7px 10px; border-radius: 999px; background: rgba(255,255,255,.16); color: inherit; font-size: 12px; font-weight: 900; letter-spacing: .04em; text-transform: uppercase; }
  .practices-hero h1, .practice-form-heading h1 { max-width: 780px; margin: 16px 0 12px; font-size: clamp(34px, 5vw, 64px); line-height: 1.02; }
  .practices-hero p, .practice-form-heading p { max-width: 720px; margin: 0; color: rgba(255,255,255,.84); font-size: 16px; line-height: 1.6; font-weight: 650; }
  .practice-submit-link { flex: 0 0 auto; white-space: nowrap; }
  .practice-primary-button, .practice-secondary-button, .practice-action { min-height: 42px; padding: 0 16px; border: 1px solid #1f5073; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; font: inherit; font-size: 14px; font-weight: 850; text-decoration: none; cursor: pointer; }
  .practice-primary-button { background: #fff; color: #1f5073; }
  .practice-primary-button:hover { background: #e8f2f6; }
  .practice-secondary-button { border-color: #b8cbd5; background: #fff; color: #1f5073; }
  .practice-secondary-button:hover { border-color: #1f5073; }
  .practices-toolbar { margin: 20px 0 38px; padding: 20px; border: 1px solid var(--imcro-color-border); border-radius: 8px; background: var(--imcro-color-surface); box-shadow: var(--imcro-shadow-card); }
  .practice-filters { display: grid; grid-template-columns: minmax(220px, 1.6fr) repeat(3, minmax(150px, 1fr)) auto; gap: 12px; align-items: end; }
  .practice-filters label, .practice-form label { display: grid; gap: 7px; color: var(--imcro-color-text-muted); font-size: 12px; font-weight: 850; }
  .practice-filters input, .practice-filters select, .practice-form input, .practice-form select, .practice-form textarea { width: 100%; min-height: 42px; border: 1px solid #b8cbd5; border-radius: 6px; padding: 9px 11px; background: #fff; color: var(--imcro-color-text); font: inherit; font-size: 14px; }
  .practice-form textarea { resize: vertical; line-height: 1.5; }
  .practice-filter-actions { display: flex; gap: 8px; }
  .practice-filter-actions .practice-primary-button { background: #1f5073; color: #fff; }
  .practice-filter-actions .practice-secondary-button { min-height: 42px; }
  .practices-results-head { display: flex; justify-content: space-between; align-items: end; margin-bottom: 16px; }
  .practices-results-head h2 { margin: 0; color: #fff; font-size: clamp(26px, 4vw, 40px); }
  .practices-results-head span { color: rgba(255,255,255,.82); font-weight: 750; }
  .practice-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr)); gap: 16px; }
  .practice-card { height: 360px; min-height: 360px; display: flex; flex-direction: column; gap: 14px; overflow: hidden; padding: 22px; border: 1px solid var(--imcro-color-border); border-radius: 8px; background: #fff; box-shadow: var(--imcro-shadow-card); }
  .practice-card-topline, .practice-detail-topline { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .practice-chip, .practice-topic { display: inline-flex; align-items: center; min-height: 28px; padding: 0 10px; border-radius: 999px; font-size: 12px; font-weight: 850; }
  .practice-chip { background: #e6f2f5; color: #1f5073; }
  .practice-topic { background: #f0f3f5; color: #50636d; }
  .practice-card h2 { min-height: 52px; margin: 0; overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; font-size: 22px; line-height: 1.18; }
  .practice-card-summary { min-height: 86px; margin: 0; overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 4; color: var(--imcro-color-text-muted); line-height: 1.55; font-weight: 650; }
  .practice-card-meta { max-height: 72px; margin: auto 0 0; display: grid; gap: 8px; overflow: hidden; }
  .practice-card-meta div { display: grid; gap: 2px; }
  .practice-card-meta dt, .practice-info-row dt { color: var(--imcro-color-text-muted); font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: .03em; }
  .practice-card-meta dd, .practice-info-row dd { margin: 0; overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; font-size: 14px; font-weight: 750; }
  .practice-card-footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; color: var(--imcro-color-text-muted); font-size: 12px; font-weight: 700; }
  .practice-action { min-height: 36px; background: #1f5073; color: #fff; }
  .practice-message { padding: 24px; border: 1px solid var(--imcro-color-border); border-radius: 8px; background: #fff; color: var(--imcro-color-text-muted); font-weight: 750; }
  .practice-message-error, .practice-form-success { padding: 13px 15px; border-radius: 6px; font-weight: 750; }
  .practice-message-error { border: 1px solid #e7b7b7; background: #fff5f5; color: #8e2020; }
  .practice-form-success { border: 1px solid #b5dac0; background: #f1fbf3; color: #1d6b36; }
  .practice-detail, .practice-form-panel { padding: 30px; border: 1px solid var(--imcro-color-border); border-radius: 8px; background: #fff; box-shadow: var(--imcro-shadow-card); }
  .practice-detail h1 { max-width: 900px; margin: 18px 0 12px; font-size: clamp(32px, 5vw, 62px); line-height: 1.04; }
  .practice-detail-lead { max-width: 880px; margin: 0 0 28px; color: var(--imcro-color-text-muted); font-size: 18px; line-height: 1.6; font-weight: 650; }
  .practice-detail-grid { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 34px; }
  .practice-detail-main { display: grid; gap: 26px; }
  .practice-detail-section h2 { margin: 0 0 10px; color: #1f5073; font-size: 24px; }
  .practice-detail-section p { margin: 0; white-space: pre-line; line-height: 1.7; font-weight: 600; }
  .practice-detail-aside { align-self: start; display: grid; gap: 16px; padding: 20px; border-left: 3px solid #dcebf0; background: #f7fafb; }
  .practice-info-row { display: grid; gap: 4px; }
  .practice-material-list { display: grid; gap: 9px; margin: 0; padding-left: 19px; }
  .practice-material-list a { color: #1f5073; font-weight: 750; }
  .practice-form-heading { padding: 28px; border-radius: 8px; background: #1f5073; color: #fff; }
  .practice-form { display: grid; gap: 18px; padding-top: 24px; }
  .practice-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
  .practice-form-actions { display: flex; justify-content: flex-end; gap: 10px; }
  .practice-form-actions .practice-primary-button { background: #1f5073; color: #fff; }
  .practice-form-actions .practice-primary-button:disabled { opacity: .6; cursor: wait; }
  @media (max-width: 960px) { .practice-filters { grid-template-columns: repeat(2, minmax(0, 1fr)); } .practice-filter-search { grid-column: span 2; } .practice-filter-actions { grid-column: span 2; } }
  @media (max-width: 720px) { .practices-container { width: min(100% - 24px, var(--imcro-container-max, 1280px)); } .practices-hero { align-items: stretch; flex-direction: column; padding: 22px; } .practice-submit-link { width: fit-content; } .practice-filters, .practice-form-grid, .practice-detail-grid { grid-template-columns: 1fr; } .practice-filter-search, .practice-filter-actions { grid-column: auto; } .practice-detail, .practice-form-panel { padding: 20px; } .practice-detail-aside { border-left: 0; border-top: 3px solid #dcebf0; } }
`;

