import { useCallback, useEffect, useState } from "react";
import { API_BASE } from "../../constants/index.js";
import { authHeaders } from "../../utils/authHeaders.js";

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("ru-RU");
}

async function errorText(response) {
  const data = await response.json().catch(() => null);
  return data?.detail || "Не удалось загрузить журнал действий";
}

export default function AuditLogModule() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(API_BASE + "/audit-log/?limit=100", { headers: authHeaders() });
      if (!response.ok) throw new Error(await errorText(response));
      setRows(await response.json());
    } catch (err) {
      setError(err.message || "Не удалось загрузить журнал действий");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="admin-data-module">
      <style>{`
        .admin-data-module { display: grid; gap: 16px; }
        .admin-data-card { background: #fff; border: 1px solid #cdd8df; border-radius: 12px; overflow: hidden; }
        .admin-data-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 18px 20px; border-bottom: 1px solid #e5ebef; }
        .admin-data-head h2 { margin: 0; font-size: 18px; }
        .admin-data-button { border: 1px solid #19789c; border-radius: 8px; padding: 9px 13px; background: #fff; color: #004f75; font-weight: 800; cursor: pointer; }
        .admin-data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .admin-data-table th, .admin-data-table td { padding: 12px 16px; border-bottom: 1px solid #e5ebef; text-align: left; vertical-align: top; }
        .admin-data-table th { color: #667783; font-size: 11px; text-transform: uppercase; }
        .admin-data-empty, .admin-data-error { padding: 20px; color: #667783; font-weight: 700; }
        .admin-data-error { color: #a33a2b; }
        @media (max-width: 760px) { .admin-data-table { display: block; overflow-x: auto; } }
      `}</style>
      <div className="admin-data-card">
        <div className="admin-data-head">
          <h2>История действий сотрудников</h2>
          <button type="button" className="admin-data-button" onClick={load} disabled={loading}>
            {loading ? "Загрузка..." : "Обновить"}
          </button>
        </div>
        {error && <div className="admin-data-error">{error}</div>}
        {!error && !loading && !rows.length && <div className="admin-data-empty">Записей пока нет.</div>}
        {!error && rows.length > 0 && (
          <table className="admin-data-table">
            <thead>
              <tr><th>Дата</th><th>Пользователь</th><th>Действие</th><th>Раздел</th><th>Детали</th></tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{formatDate(row.created_at)}</td>
                  <td>{row.user_name || row.user_email || "Система"}</td>
                  <td>{row.action}</td>
                  <td>{row.entity_type}{row.entity_id ? " #" + row.entity_id : ""}</td>
                  <td>{row.details?.title || row.details?.role || row.details?.email || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
