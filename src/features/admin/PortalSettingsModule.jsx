import { useCallback, useEffect, useState } from "react";
import { API_BASE } from "../../constants/index.js";
import { authHeaders } from "../../utils/authHeaders.js";

const EMPTY_SETTINGS = {
  portal_name: "",
  contact_email: "",
  contact_phone: "",
  contact_address: "",
  footer_text: "",
};

async function readError(response, fallback) {
  const data = await response.json().catch(() => null);
  return data?.detail || fallback;
}

export default function PortalSettingsModule() {
  const [settings, setSettings] = useState(EMPTY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(API_BASE + "/portal/settings", { headers: authHeaders() });
      if (!response.ok) throw new Error(await readError(response, "Не удалось загрузить настройки портала"));
      setSettings({ ...EMPTY_SETTINGS, ...(await response.json()) });
    } catch (err) {
      setError(err.message || "Не удалось загрузить настройки портала");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function update(field, value) {
    setSettings((current) => ({ ...current, [field]: value }));
    setMessage("");
    setError("");
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(API_BASE + "/portal/settings", {
        method: "PUT",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(settings),
      });
      if (!response.ok) throw new Error(await readError(response, "Не удалось сохранить настройки"));
      setSettings({ ...EMPTY_SETTINGS, ...(await response.json()) });
      setMessage("Настройки сохранены");
    } catch (err) {
      setError(err.message || "Не удалось сохранить настройки");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="portal-settings-module">
      <style>{`
        .portal-settings-module { max-width: 820px; }
        .portal-settings-card { display: grid; gap: 18px; padding: 24px; background: #fff; border: 1px solid #cdd8df; border-radius: 12px; }
        .portal-settings-card h2 { margin: 0; font-size: 20px; }
        .portal-settings-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
        .portal-settings-field { display: grid; gap: 7px; font-weight: 800; color: #334650; }
        .portal-settings-field.full { grid-column: 1 / -1; }
        .portal-settings-field input, .portal-settings-field textarea { width: 100%; border: 1px solid #cdd8df; border-radius: 8px; padding: 11px 12px; font: inherit; color: #17232b; }
        .portal-settings-field textarea { min-height: 92px; resize: vertical; }
        .portal-settings-actions { display: flex; align-items: center; gap: 12px; }
        .portal-settings-button { border: 0; border-radius: 8px; padding: 11px 16px; background: #19789c; color: #fff; font-weight: 800; cursor: pointer; }
        .portal-settings-message { color: #23713e; font-weight: 800; }
        .portal-settings-error { color: #a33a2b; font-weight: 800; }
        @media (max-width: 680px) { .portal-settings-grid { grid-template-columns: 1fr; } .portal-settings-field.full { grid-column: auto; } }
      `}</style>
      <form className="portal-settings-card" onSubmit={save}>
        <h2>Основные параметры портала</h2>
        {loading ? <div>Загрузка настроек...</div> : (
          <>
            <div className="portal-settings-grid">
              <label className="portal-settings-field full">Название портала<input value={settings.portal_name} onChange={(event) => update("portal_name", event.target.value)} required maxLength={200} /></label>
              <label className="portal-settings-field">Email для контактов<input type="email" value={settings.contact_email || ""} onChange={(event) => update("contact_email", event.target.value)} maxLength={255} /></label>
              <label className="portal-settings-field">Телефон<input value={settings.contact_phone || ""} onChange={(event) => update("contact_phone", event.target.value)} maxLength={100} /></label>
              <label className="portal-settings-field full">Адрес<input value={settings.contact_address || ""} onChange={(event) => update("contact_address", event.target.value)} maxLength={500} /></label>
              <label className="portal-settings-field full">Текст в подвале<textarea value={settings.footer_text || ""} onChange={(event) => update("footer_text", event.target.value)} maxLength={500} /></label>
            </div>
            <div className="portal-settings-actions">
              <button className="portal-settings-button" type="submit" disabled={saving}>{saving ? "Сохранение..." : "Сохранить настройки"}</button>
              {message && <span className="portal-settings-message">{message}</span>}
              {error && <span className="portal-settings-error">{error}</span>}
            </div>
          </>
        )}
      </form>
    </section>
  );
}
