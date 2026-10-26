import { useCallback, useEffect, useMemo, useState } from "react";
import { API_BASE } from "../../constants/index.js";
import { authHeaders, getStoredAccessToken } from "../../utils/authHeaders.js";
import { PRACTICE_LEVELS, PRACTICE_STATUS_LABELS, PRACTICE_TOPICS } from "../practices/practiceTaxonomy.js";

const EMPTY_PRACTICE = { title: "", slug: "", summary: "", description: "", topic: "", level: "Начальный", organization: "", municipality: "", author_name: "", author_email: "", target_audience: "", implementation_period: "", results: "", materials: "", cover_image_url: "", status: "draft" };

function normalizePractice(practice) {
  const materials = Array.isArray(practice?.materials) ? practice.materials.map((item) => item?.url || item?.title || "").filter(Boolean).join("\n") : "";
  return { ...EMPTY_PRACTICE, ...practice, materials };
}

function materialPayload(value) {
  return String(value || "").split("\n").map((item) => item.trim()).filter(Boolean).map((url) => ({ title: url.split("/").pop() || url, url }));
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("ru-RU");
}

export default function PracticesModule() {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const token = getStoredAccessToken();
  const headers = useMemo(() => authHeaders({ "Content-Type": "application/json" }), []);

  const loadPractices = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/api/admin/practices/?status=${encodeURIComponent(statusFilter)}`, { headers: authHeaders() });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch {
      setError("Не удалось загрузить практики. Проверьте авторизацию и доступ к API.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { void loadPractices(); }, [loadPractices]);

  async function savePractice(event) {
    event.preventDefault();
    if (!token || !editing) return;
    setSaving(true);
    setError("");
    const payload = { ...editing, materials: materialPayload(editing.materials), author_email: editing.author_email || null, slug: editing.slug || null, cover_image_url: editing.cover_image_url || null };
    const isNew = editing.id === "new";
    try {
      const response = await fetch(`${API_BASE}/api/admin/practices/${isNew ? "" : `${editing.id}`}`, { method: isNew ? "POST" : "PATCH", headers, body: JSON.stringify(payload) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(Array.isArray(data.detail) ? data.detail.map((item) => item.msg).join("; ") : data.detail || "Не удалось сохранить практику.");
      setEditing(null);
      await loadPractices();
    } catch (saveError) {
      setError(saveError.message || "Не удалось сохранить практику.");
    } finally {
      setSaving(false);
    }
  }

  async function removePractice(practice) {
    if (!token || !window.confirm(`Удалить практику «${practice.title}»?`)) return;
    const response = await fetch(`${API_BASE}/api/admin/practices/${practice.id}`, { method: "DELETE", headers: authHeaders() });
    if (!response.ok) { setError("Не удалось удалить практику."); return; }
    await loadPractices();
  }

  function startNew() { setEditing({ ...EMPTY_PRACTICE, id: "new" }); setError(""); }
  function startEdit(practice) { setEditing(normalizePractice(practice)); setError(""); }

  if (editing) {
    return <PracticeEditor practice={editing} setPractice={setEditing} onSubmit={savePractice} onCancel={() => setEditing(null)} saving={saving} error={error} />;
  }

  return (
    <section className="admin-practices-module">
      <style>{ADMIN_PRACTICES_CSS}</style>
      <div className="practice-admin-toolbar"><div><h2>Каталог практик</h2><p>Заявки, материалы и публикация региональных образовательных практик.</p></div><button className="practice-admin-primary" type="button" onClick={startNew}>Добавить практику</button></div>
      {error && <div className="practice-admin-error" role="alert">{error}</div>}
      <div className="practice-admin-filters"><label>Статус<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">Все статусы</option>{Object.entries(PRACTICE_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
      {loading && <div className="practice-admin-empty">Загрузка практик...</div>}
      {!loading && !items.length && <div className="practice-admin-empty">Практик по выбранному фильтру нет.</div>}
      {!loading && items.length > 0 && <div className="practice-admin-table-wrap"><table className="practice-admin-table"><thead><tr><th>Практика</th><th>Направление</th><th>Организация</th><th>Статус</th><th>Обновлена</th><th>Действия</th></tr></thead><tbody>{items.map((practice) => <tr key={practice.id}><td><strong>{practice.title}</strong><span>{practice.author_name}</span></td><td>{practice.topic}</td><td>{practice.organization}</td><td><span className={`practice-admin-status ${practice.status}`}>{PRACTICE_STATUS_LABELS[practice.status] || practice.status}</span></td><td>{formatDate(practice.updated_at)}</td><td><div className="practice-admin-actions"><button type="button" onClick={() => startEdit(practice)}>Изменить</button>{practice.status !== "published" && <button type="button" onClick={() => startEdit({ ...normalizePractice(practice), status: "published" })}>Опубликовать</button>}<button className="danger" type="button" onClick={() => removePractice(practice)}>Удалить</button></div></td></tr>)}</tbody></table></div>}
    </section>
  );
}

function PracticeEditor({ practice, setPractice, onSubmit, onCancel, saving, error }) {
  function update(key, value) { setPractice((current) => ({ ...current, [key]: value })); }
  return (
    <section className="admin-practices-module">
      <style>{ADMIN_PRACTICES_CSS}</style>
      <div className="practice-admin-toolbar"><div><h2>{practice.id === "new" ? "Новая практика" : "Редактирование практики"}</h2><p>Заполните карточку и выберите статус публикации.</p></div></div>
      {error && <div className="practice-admin-error" role="alert">{error}</div>}
      <form className="practice-admin-form" onSubmit={onSubmit}>
        <label>Название *<input required value={practice.title} onChange={(event) => update("title", event.target.value)} /></label>
        <label>Краткое описание *<textarea required rows="3" value={practice.summary} onChange={(event) => update("summary", event.target.value)} /></label>
        <div className="practice-admin-form-grid"><label>Направление *<select required value={practice.topic} onChange={(event) => update("topic", event.target.value)}><option value="">Выберите направление</option>{PRACTICE_TOPICS.map((topic) => <option key={topic} value={topic}>{topic}</option>)}</select></label><label>Уровень<select value={practice.level} onChange={(event) => update("level", event.target.value)}>{PRACTICE_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}</select></label><label>Статус<select value={practice.status} onChange={(event) => update("status", event.target.value)}>{Object.entries(PRACTICE_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Организация *<input required value={practice.organization} onChange={(event) => update("organization", event.target.value)} /></label><label>Муниципалитет<input value={practice.municipality || ""} onChange={(event) => update("municipality", event.target.value)} /></label><label>Автор *<input required value={practice.author_name} onChange={(event) => update("author_name", event.target.value)} /></label><label>Email автора<input type="email" value={practice.author_email || ""} onChange={(event) => update("author_email", event.target.value)} /></label><label>Период реализации<input value={practice.implementation_period || ""} onChange={(event) => update("implementation_period", event.target.value)} /></label><label>Целевая аудитория<input value={practice.target_audience || ""} onChange={(event) => update("target_audience", event.target.value)} /></label></div>
        <label>Описание практики *<textarea required rows="9" value={practice.description} onChange={(event) => update("description", event.target.value)} /></label>
        <label>Результаты<textarea rows="5" value={practice.results || ""} onChange={(event) => update("results", event.target.value)} /></label>
        <label>Ссылки на материалы<textarea rows="4" placeholder="По одной ссылке в строке" value={practice.materials} onChange={(event) => update("materials", event.target.value)} /></label>
        <label>Ссылка на обложку<input type="url" value={practice.cover_image_url || ""} onChange={(event) => update("cover_image_url", event.target.value)} /></label>
        <div className="practice-admin-form-actions"><button className="practice-admin-secondary" type="button" onClick={onCancel}>Отмена</button><button className="practice-admin-primary" disabled={saving} type="submit">{saving ? "Сохранение..." : "Сохранить"}</button></div>
      </form>
    </section>
  );
}

const ADMIN_PRACTICES_CSS = `
  .admin-practices-module { display: grid; gap: 18px; }
  .practice-admin-toolbar { display: flex; align-items: end; justify-content: space-between; gap: 18px; flex-wrap: wrap; }
  .practice-admin-toolbar h2 { margin: 0; color: #004f75; font-size: 26px; }
  .practice-admin-toolbar p { margin: 6px 0 0; color: #667783; font-weight: 650; }
  .practice-admin-primary, .practice-admin-secondary, .practice-admin-actions button { min-height: 38px; padding: 0 13px; border: 1px solid #19789c; border-radius: 8px; background: #19789c; color: #fff; font: inherit; font-size: 13px; font-weight: 850; cursor: pointer; }
  .practice-admin-primary:hover { background: #004f75; }
  .practice-admin-secondary { border-color: #cdd8df; background: #fff; color: #004f75; }
  .practice-admin-error { padding: 12px 14px; border: 1px solid #e7b7b7; border-radius: 8px; background: #fff5f5; color: #8e2020; font-weight: 750; }
  .practice-admin-filters { display: flex; gap: 12px; padding: 16px; border: 1px solid #e5ebef; border-radius: 12px; background: #fff; }
  .practice-admin-filters label, .practice-admin-form label { display: grid; gap: 6px; color: #667783; font-size: 12px; font-weight: 850; }
  .practice-admin-filters select, .practice-admin-form input, .practice-admin-form select, .practice-admin-form textarea { min-height: 40px; min-width: 190px; border: 1px solid #cdd8df; border-radius: 7px; padding: 8px 10px; background: #fff; color: #17232b; font: inherit; font-size: 14px; }
  .practice-admin-form textarea { resize: vertical; line-height: 1.5; }
  .practice-admin-empty { padding: 22px; border: 1px solid #e5ebef; border-radius: 12px; background: #fff; color: #667783; font-weight: 700; }
  .practice-admin-table-wrap { overflow-x: auto; border: 1px solid #e5ebef; border-radius: 12px; background: #fff; }
  .practice-admin-table { width: 100%; border-collapse: collapse; min-width: 940px; }
  .practice-admin-table th, .practice-admin-table td { padding: 13px 14px; border-bottom: 1px solid #e5ebef; text-align: left; vertical-align: top; font-size: 13px; }
  .practice-admin-table th { color: #667783; background: #f8fafb; font-size: 11px; text-transform: uppercase; letter-spacing: .03em; }
  .practice-admin-table tr:last-child td { border-bottom: 0; }
  .practice-admin-table td strong, .practice-admin-table td span { display: block; }
  .practice-admin-table td span { margin-top: 4px; color: #667783; font-size: 12px; }
  .practice-admin-status { width: fit-content; padding: 5px 8px; border-radius: 999px; background: #edf3f5; color: #355463 !important; font-weight: 850; }
  .practice-admin-status.published { background: #e6f4e9; color: #21723b !important; }
  .practice-admin-status.pending { background: #fff5df; color: #8a5a05 !important; }
  .practice-admin-status.archive { background: #f1f1f1; color: #666 !important; }
  .practice-admin-actions { display: flex; gap: 7px; flex-wrap: wrap; }
  .practice-admin-actions button { min-height: 32px; padding: 0 9px; background: #fff; color: #19789c; }
  .practice-admin-actions button.danger { border-color: #d8a0a0; color: #a52b2b; }
  .practice-admin-form { display: grid; gap: 16px; max-width: 1040px; padding: 22px; border: 1px solid #e5ebef; border-radius: 12px; background: #fff; }
  .practice-admin-form-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
  .practice-admin-form-actions { display: flex; justify-content: flex-end; gap: 10px; }
  .practice-admin-form .practice-admin-primary:disabled { opacity: .6; cursor: wait; }
  @media (max-width: 820px) { .practice-admin-form-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (max-width: 560px) { .practice-admin-form-grid { grid-template-columns: 1fr; } .practice-admin-form { padding: 16px; } }
`;

