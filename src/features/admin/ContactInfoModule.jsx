import { useEffect, useMemo, useRef, useState } from "react";
import { API_BASE } from "../../constants/index.js";
import { authHeaders } from "../../utils/authHeaders.js";
import { invalidateSiteContactInfo, mergeSiteContact, SITE_CONTACT_LOCATIONS } from "../contacts/siteContacts.js";

function cloneContact(location) {
  return {
    path: location.path,
    title: location.title,
    description: location.description || "",
    contacts: location.contacts.map((item) => ({
      label: item.label,
      value: item.value || "",
      href: item.href || "",
      ...(item.group ? { group: item.group } : {}),
      ...(item.card ? { card: item.card } : {}),
      ...(item.key ? { key: item.key } : {}),
    })),
  };
}

function contactGroups(contacts) {
  const groups = new Map();
  contacts.forEach((item, index) => {
    const groupTitle = item.group || "Контактные данные";
    const cardTitle = item.card || "Контактная карточка";
    const cardKey = item.key || `${groupTitle}:${cardTitle}`;
    if (!groups.has(groupTitle)) groups.set(groupTitle, { title: groupTitle, cards: new Map() });
    const group = groups.get(groupTitle);
    if (!group.cards.has(cardKey)) group.cards.set(cardKey, { key: cardKey, title: cardTitle, fields: [] });
    group.cards.get(cardKey).fields.push({ ...item, index });
  });
  return [...groups.values()].map((group) => ({ ...group, cards: [...group.cards.values()] }));
}

function contactCardIdentity(item) {
  return item.key || `${item.group || "Контактные данные"}:${item.card || "Контактная карточка"}`;
}

function apiErrorMessage(data, fallback) {
  const detail = data?.detail ?? data?.message ?? data?.error;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const issues = detail.map((issue) => {
      if (typeof issue === "string") return issue;
      const location = (issue?.loc || [])
        .filter((part) => !["body", "query", "path"].includes(part))
        .map((part) => typeof part === "number" ? `контакт ${part + 1}` : String(part))
        .join(", ");
      return [location, issue?.msg].filter(Boolean).join(": ");
    }).filter(Boolean);
    return issues.length ? `Проверьте данные: ${issues.join("; ")}` : fallback;
  }
  if (detail && typeof detail === "object") {
    const message = detail.message || detail.error || detail.msg;
    return typeof message === "string" ? message : fallback;
  }
  return fallback;
}

function newContactKey() {
  return `contact-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function ContactInfoModule({ canEdit }) {
  const [records, setRecords] = useState([]);
  const [selectedPath, setSelectedPath] = useState(SITE_CONTACT_LOCATIONS[0]?.path || "/");
  const [locationSearch, setLocationSearch] = useState("");
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [activeLocationIndex, setActiveLocationIndex] = useState(0);
  const locationPickerRef = useRef(null);
  const locationSearchRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const selectedLocation = useMemo(
    () => SITE_CONTACT_LOCATIONS.find((location) => location.path === selectedPath) || SITE_CONTACT_LOCATIONS[0],
    [selectedPath],
  );
  const locationOptions = useMemo(() => {
    const query = locationSearch.trim().toLocaleLowerCase("ru");
    return SITE_CONTACT_LOCATIONS.filter((location) => (
      !query || `${location.title} ${location.path}`.toLocaleLowerCase("ru").includes(query)
    ));
  }, [locationSearch]);
  const savedRecord = records.find((record) => record.path === selectedPath);
  const isSvedenCardEditor = ["/sveden/common/", "/sveden/struct/", "/sveden/employees/"].includes(selectedPath);
  const isSvedenEmployeesEditor = selectedPath === "/sveden/employees/";
  const canManageSvedenCards = selectedPath === "/sveden/common/";
  const canRenameSvedenCards = ["/sveden/common/", "/sveden/struct/"].includes(selectedPath);
  const [form, setForm] = useState(() => cloneContact(selectedLocation));
  const groups = useMemo(() => contactGroups(form.contacts), [form.contacts]);

  useEffect(() => {
    let active = true;
    fetch(`${API_BASE}/api/admin/contact-info/`, { headers: authHeaders() })
      .then(async (response) => {
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(apiErrorMessage(data, "Не удалось загрузить контакты."));
        }
        return response.json();
      })
      .then((items) => { if (active) setRecords(Array.isArray(items) ? items : []); })
      .catch((loadError) => { if (active) setError(loadError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!locationPickerOpen) return undefined;
    locationSearchRef.current?.focus();
    const closeOnOutsideClick = (event) => {
      if (!locationPickerRef.current?.contains(event.target)) setLocationPickerOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [locationPickerOpen]);

  useEffect(() => {
    setActiveLocationIndex((index) => Math.min(index, Math.max(locationOptions.length - 1, 0)));
  }, [locationOptions.length]);

  useEffect(() => {
    if (!selectedLocation) return;
    setForm(cloneContact(mergeSiteContact(selectedPath, selectedLocation, savedRecord ? [savedRecord] : [])));
    setError("");
    setMessage("");
  }, [savedRecord, selectedLocation]);

  function updateContact(index, key, value) {
    setForm((current) => ({
      ...current,
      contacts: current.contacts.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const updated = { ...item, [key]: value };
        if (key === "value" && item.label.trim().toLowerCase().includes("телефон")) {
          updated.href = value ? `tel:${value.replace(/[^\d+]/g, "")}` : "";
        } else if (key === "value" && (item.label.trim().toLowerCase().includes("почт") || item.label.trim().toLowerCase().includes("email"))) {
          updated.href = value ? `mailto:${value}` : "";
        }
        return updated;
      }),
    }));
  }

  function addContact() {
    setForm((current) => ({ ...current, contacts: [...current.contacts, { label: "", value: "", href: "" }] }));
  }

  function removeContact(index) {
    setForm((current) => ({ ...current, contacts: current.contacts.filter((_, itemIndex) => itemIndex !== index) }));
  }

  function updateGroupTitle(groupTitle, title) {
    setForm((current) => ({
      ...current,
      contacts: current.contacts.map((item) => (item.group || "Контактные данные") === groupTitle ? { ...item, group: title } : item),
    }));
  }

  function addGroup() {
    const title = `Новая группа ${groups.length + 1}`;
    setForm((current) => ({
      ...current,
      contacts: [...current.contacts, {
        group: title,
        card: "Новая карточка",
        key: newContactKey(),
        label: "Контакт",
        value: "",
        href: "",
      }],
    }));
  }

  function removeGroup(groupTitle) {
    setForm((current) => ({
      ...current,
      contacts: current.contacts.filter((item) => (item.group || "Контактные данные") !== groupTitle),
    }));
  }

  function updateCardTitle(groupTitle, cardKey, title) {
    setForm((current) => ({
      ...current,
      contacts: current.contacts.map((item) => item.group === groupTitle && contactCardIdentity(item) === cardKey ? { ...item, card: title } : item),
    }));
  }

  function addCard(groupTitle) {
    setForm((current) => ({
      ...current,
      contacts: [...current.contacts, {
        group: groupTitle,
        card: "Новая карточка",
        key: newContactKey(),
        label: "Контакт",
        value: "",
        href: "",
      }],
    }));
  }

  function removeCard(groupTitle, cardKey) {
    setForm((current) => ({
      ...current,
      contacts: current.contacts.filter((item) => !(item.group === groupTitle && contactCardIdentity(item) === cardKey)),
    }));
  }

  function addCardField(groupTitle, cardKey) {
    const card = groups.find((item) => item.title === groupTitle)?.cards.find((item) => item.key === cardKey);
    setForm((current) => ({
      ...current,
      contacts: [...current.contacts, {
        group: groupTitle,
        card: card?.title || "Новая карточка",
        key: cardKey,
        label: "Новый контакт",
        value: "",
        href: "",
      }],
    }));
  }

  function chooseLocation(location) {
    setSelectedPath(location.path);
    setLocationSearch("");
    setLocationPickerOpen(false);
    setActiveLocationIndex(0);
  }

  function handleLocationSearchKeyDown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      setLocationPickerOpen(false);
    } else if (event.key === "ArrowDown" && locationOptions.length) {
      event.preventDefault();
      setActiveLocationIndex((index) => Math.min(index + 1, locationOptions.length - 1));
    } else if (event.key === "ArrowUp" && locationOptions.length) {
      event.preventDefault();
      setActiveLocationIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && locationOptions[activeLocationIndex]) {
      event.preventDefault();
      chooseLocation(locationOptions[activeLocationIndex]);
    }
  }

  async function save(event) {
    event.preventDefault();
    if (isSvedenCardEditor && form.contacts.some((item) => (
      !item.group?.trim() || !item.card?.trim() || !item.key?.trim() || !item.label.trim()
    ))) {
      setError("Заполните названия группы, карточки и контактного поля.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    const payload = {
      ...form,
      contacts: form.contacts.filter((item) => item.label.trim() || item.value.trim()),
    };
    try {
      const response = await fetch(`${API_BASE}/api/admin/contact-info/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(apiErrorMessage(data, "Не удалось сохранить контакты."));
      setRecords((current) => [...current.filter((item) => item.path !== data.path), data]);
      setForm(cloneContact(data));
      invalidateSiteContactInfo();
      setMessage("Контактная информация сохранена.");
    } catch (saveError) {
      setError(saveError.message || "Не удалось сохранить контакты.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="site-contact-admin">
      <style>{`
        .site-contact-admin { display: grid; gap: 18px; color: #17232b; }
        .site-contact-admin-head { display: grid; gap: 6px; }
        .site-contact-admin-head h2 { margin: 0; color: #004f75; font-size: 24px; }
        .site-contact-admin-head p { margin: 0; color: #667783; line-height: 1.5; }
        .site-contact-admin-form { display: grid; gap: 18px; max-width: 980px; padding: 22px; border: 1px solid #d8e2e7; border-radius: 8px; background: #fff; }
        .site-contact-admin-form label { display: grid; gap: 7px; color: #40515a; font-size: 13px; font-weight: 800; }
        .site-contact-admin-form input, .site-contact-admin-form textarea, .site-contact-admin-form select { width: 100%; min-width: 0; min-height: 42px; padding: 9px 11px; border: 1px solid #c5d3d9; border-radius: 6px; color: #17232b; background: #fff; font: inherit; }
        .site-contact-admin-form textarea { resize: vertical; line-height: 1.5; }
        .site-contact-location { position: relative; max-width: 640px; }
        .site-contact-location-trigger { width: 100%; min-height: 54px; display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 8px 13px; border: 1px solid #b9cbd3; border-radius: 6px; color: #17232b; background: #fff; text-align: left; font: inherit; cursor: pointer; }
        .site-contact-location-trigger:hover, .site-contact-location-trigger[aria-expanded="true"] { border-color: #19789c; }
        .site-contact-location-trigger:focus-visible, .site-contact-location-option:focus-visible { outline: 3px solid rgba(25,120,156,.25); outline-offset: 2px; }
        .site-contact-location-current { min-width: 0; display: grid; gap: 2px; }
        .site-contact-location-current strong { overflow: hidden; color: #004f75; font-size: 14px; text-overflow: ellipsis; white-space: nowrap; }
        .site-contact-location-current small { color: #687b84; font-size: 12px; font-weight: 600; }
        .site-contact-location-chevron { flex: 0 0 auto; color: #52717d; font-size: 18px; transition: transform .15s ease; }
        .site-contact-location-trigger[aria-expanded="true"] .site-contact-location-chevron { transform: rotate(180deg); }
        .site-contact-location-popover { position: absolute; z-index: 30; top: calc(100% + 6px); left: 0; width: min(100%, 640px); padding: 10px; border: 1px solid #cbd8dd; border-radius: 8px; background: #fff; box-shadow: 0 12px 30px rgba(20,45,55,.18); }
        .site-contact-location-search { position: relative; display: block !important; margin-bottom: 8px; }
        .site-contact-location-search input { padding-left: 36px !important; }
        .site-contact-location-search-icon { position: absolute; z-index: 1; top: 50%; left: 12px; color: #6b7f87; font-size: 16px; transform: translateY(-50%); pointer-events: none; }
        .site-contact-location-results { display: grid; max-height: 300px; overflow: auto; overscroll-behavior: contain; }
        .site-contact-location-option { width: 100%; display: grid; gap: 3px; padding: 10px; border: 0; border-radius: 5px; background: #fff; color: #17232b; text-align: left; font: inherit; cursor: pointer; }
        .site-contact-location-option:hover, .site-contact-location-option.is-active { background: #eef6f8; }
        .site-contact-location-option.is-selected { box-shadow: inset 3px 0 #19789c; }
        .site-contact-location-option strong { color: #004f75; font-size: 13px; line-height: 1.35; }
        .site-contact-location-option small { color: #687b84; font-size: 11px; font-weight: 600; }
        .site-contact-location-empty { padding: 14px 10px; color: #687b84; font-size: 13px; line-height: 1.45; }
        .site-contact-location-count { padding: 7px 10px 2px; color: #71838b; font-size: 11px; }
        .site-contact-row { display: grid; grid-template-columns: minmax(150px, .8fr) minmax(180px, 1.2fr) minmax(180px, 1.1fr) 38px; align-items: end; gap: 10px; padding: 12px 0; border-bottom: 1px solid #e7edef; }
        .site-contact-row button { width: 38px; height: 38px; border: 1px solid #d3dfe4; border-radius: 6px; background: #fff; color: #8b2e2e; font-size: 20px; cursor: pointer; }
        .site-contact-row button:hover { background: #fff4f4; border-color: #e5baba; }
        .site-contact-card-groups { display: grid; gap: 16px; }
        .site-contact-card-group { display: grid; gap: 12px; padding: 16px; border: 1px solid #dce6e9; border-radius: 7px; background: #f8fbfc; }
        .site-contact-card-group-head, .site-contact-card-head { display: flex; align-items: end; gap: 10px; }
        .site-contact-card-group-head label, .site-contact-card-head label { flex: 1; }
        .site-contact-card-list { display: grid; gap: 12px; }
        .site-contact-card-item { display: grid; gap: 10px; padding: 14px; border: 1px solid #e0e8eb; border-radius: 6px; background: #fff; }
        .site-contact-card-group-head button, .site-contact-card-head button { flex: 0 0 auto; min-height: 38px; padding: 0 11px; border: 1px solid #d3dfe4; border-radius: 6px; background: #fff; color: #8b2e2e; font: inherit; font-size: 13px; font-weight: 750; cursor: pointer; }
        .site-contact-card-add { width: fit-content; min-height: 36px; padding: 0 11px; border: 1px solid #c5d3d9; border-radius: 6px; background: #fff; color: #004f75; font: inherit; font-size: 13px; font-weight: 800; cursor: pointer; }
        .site-contact-card-actions { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
        .site-contact-admin-actions { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
        .site-contact-admin-actions button { min-height: 40px; padding: 0 15px; border: 1px solid #19789c; border-radius: 6px; background: #19789c; color: white; font: inherit; font-weight: 800; cursor: pointer; }
        .site-contact-admin-actions button.secondary { border-color: #c5d3d9; background: #fff; color: #004f75; }
        .site-contact-admin-actions button:disabled { opacity: .6; cursor: wait; }
        .site-contact-admin-message { padding: 11px 13px; border-radius: 6px; font-weight: 750; }
        .site-contact-admin-message.error { color: #8e2020; background: #fff4f4; border: 1px solid #e7b7b7; }
        .site-contact-admin-message.success { color: #047857; background: #ecfdf5; border: 1px solid #a7f3d0; }
        @media (max-width: 760px) { .site-contact-admin-form { padding: 16px; } .site-contact-row { grid-template-columns: 1fr 1fr 38px; } .site-contact-row label:nth-child(3) { grid-column: 1 / 3; } .site-contact-row button { grid-column: 3; grid-row: 1; } }
        @media (max-width: 480px) { .site-contact-row { grid-template-columns: minmax(0, 1fr) 38px; } .site-contact-row label:nth-child(2), .site-contact-row label:nth-child(3) { grid-column: 1; } .site-contact-row button { grid-column: 2; grid-row: 1; } }
      `}</style>
      <div className="site-contact-admin-head">
        <h2>Контактная информация</h2>
        <p>Сохранённые данные появляются на соответствующих страницах. Для раздела «Сведения об образовательной организации» контакты редактируются по группам и карточкам.</p>
      </div>
      {!canEdit && <div className="site-contact-admin-message">У вас есть право просмотра без редактирования.</div>}
      {error && <div className="site-contact-admin-message error" role="alert">{error}</div>}
      {loading ? <p>Загрузка контактов...</p> : (
        <form className="site-contact-admin-form" onSubmit={save}>
          <div className="site-contact-location" ref={locationPickerRef}>
            <span style={{ display: "block", marginBottom: 7, color: "#40515a", fontSize: 13, fontWeight: 800 }}>Раздел сайта</span>
            <button
              className="site-contact-location-trigger"
              type="button"
              aria-haspopup="dialog"
              aria-expanded={locationPickerOpen}
              onClick={() => {
                setLocationSearch("");
                setActiveLocationIndex(Math.max(locationOptions.findIndex((item) => item.path === selectedPath), 0));
                setLocationPickerOpen((open) => !open);
              }}
            >
              <span className="site-contact-location-current">
                <strong>{selectedLocation?.title || "Выберите страницу"}</strong>
                <small>{selectedLocation?.path}</small>
              </span>
              <span className="site-contact-location-chevron" aria-hidden="true">⌄</span>
            </button>
            {locationPickerOpen && (
              <div className="site-contact-location-popover" role="dialog" aria-label="Выбор страницы сайта">
                <label className="site-contact-location-search">
                  <span className="site-contact-location-search-icon" aria-hidden="true">⌕</span>
                  <input
                    ref={locationSearchRef}
                    type="search"
                    value={locationSearch}
                    onChange={(event) => { setLocationSearch(event.target.value); setActiveLocationIndex(0); }}
                    onKeyDown={handleLocationSearchKeyDown}
                    placeholder="Найти страницу по названию или адресу"
                    aria-label="Найти страницу по названию или адресу"
                    aria-controls="site-contact-location-options"
                    aria-autocomplete="list"
                  />
                </label>
                <div className="site-contact-location-results" id="site-contact-location-options" aria-label="Найденные страницы">
                  {locationOptions.length ? locationOptions.map((location, index) => (
                    <button
                      className={`site-contact-location-option${index === activeLocationIndex ? " is-active" : ""}${location.path === selectedPath ? " is-selected" : ""}`}
                      type="button"
                      aria-current={location.path === selectedPath ? "true" : undefined}
                      key={location.path}
                      onMouseEnter={() => setActiveLocationIndex(index)}
                      onClick={() => chooseLocation(location)}
                    >
                      <strong>{location.title}</strong>
                      <small>{location.path}</small>
                    </button>
                  )) : (
                    <div className="site-contact-location-empty">Страниц по этому запросу не найдено. Попробуйте ввести часть названия или адреса.</div>
                  )}
                </div>
                <div className="site-contact-location-count">Найдено: {locationOptions.length}</div>
              </div>
            )}
          </div>
          {!isSvedenCardEditor && <>
            <label>Заголовок блока
              <input value={form.title} maxLength={200} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required disabled={!canEdit} />
            </label>
            <label>Описание
              <textarea rows="3" maxLength={1000} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} disabled={!canEdit} />
            </label>
          </>}
          {isSvedenCardEditor ? (
            <div className="site-contact-card-groups">
              <strong>Группы и карточки страницы</strong>
              {groups.map((group) => (
                <section className="site-contact-card-group" key={group.title}>
                  <div className="site-contact-card-group-head">
                    {canManageSvedenCards ? (
                      <label>Название группы<input value={group.title} maxLength={200} onChange={(event) => updateGroupTitle(group.title, event.target.value)} required disabled={!canEdit} /></label>
                    ) : <strong>{group.title}</strong>}
                    {canEdit && canManageSvedenCards && groups.length > 1 && <button type="button" onClick={() => removeGroup(group.title)}>Удалить группу</button>}
                  </div>
                  <div className="site-contact-card-list">
                    {group.cards.map((card) => (
                      <article className="site-contact-card-item" key={card.key}>
                        <div className="site-contact-card-head">
                          {canRenameSvedenCards ? (
                            <label>Название карточки<input value={card.title} maxLength={200} onChange={(event) => updateCardTitle(group.title, card.key, event.target.value)} required disabled={!canEdit} /></label>
                          ) : <strong>{card.title}</strong>}
                          {canEdit && canManageSvedenCards && group.cards.length > 1 && <button type="button" onClick={() => removeCard(group.title, card.key)}>Удалить карточку</button>}
                        </div>
                        {card.fields.map((item) => (
                          <div className="site-contact-row" key={`${selectedPath}-${item.index}`}>
                            <label>Подпись<input value={item.label} maxLength={100} onChange={(event) => updateContact(item.index, "label", event.target.value)} placeholder="ФИО, должность, телефон" required disabled={!canEdit} /></label>
                            <label>Значение<input value={item.value} maxLength={1000} onChange={(event) => updateContact(item.index, "value", event.target.value)} placeholder="Ф.И.О., телефон, email" required={isSvedenEmployeesEditor && ["фио", "должность"].includes(item.label.trim().toLowerCase())} disabled={!canEdit} /></label>
                            <label>Ссылка<input value={item.href || ""} maxLength={1000} onChange={(event) => updateContact(item.index, "href", event.target.value)} placeholder="tel:, mailto: или https://" disabled={!canEdit} /></label>
                            {canEdit && card.fields.length > 1 && (!isSvedenEmployeesEditor || !["фио", "должность"].includes(item.label.trim().toLowerCase())) && <button type="button" aria-label={`Удалить поле ${item.label || item.index + 1}`} title="Удалить поле" onClick={() => removeContact(item.index)}>×</button>}
                          </div>
                        ))}
                        {canEdit && <button className="site-contact-card-add" type="button" onClick={() => addCardField(group.title, card.key)}>Добавить поле</button>}
                      </article>
                    ))}
                  </div>
                  {canEdit && canManageSvedenCards && <button className="site-contact-card-add" type="button" onClick={() => addCard(group.title)}>Добавить карточку в группу</button>}
                </section>
              ))}
              {canEdit && canManageSvedenCards && <button className="site-contact-card-add" type="button" onClick={addGroup}>Добавить группу</button>}
            </div>
          ) : (
            <div>
              <strong>Контактные данные</strong>
              {form.contacts.map((item, index) => (
                <div className="site-contact-row" key={`${selectedPath}-${index}`}>
                  <label>Подпись<input value={item.label} maxLength={100} onChange={(event) => updateContact(index, "label", event.target.value)} placeholder="ФИО, должность, телефон" disabled={!canEdit} /></label>
                  <label>Значение<input value={item.value} maxLength={1000} onChange={(event) => updateContact(index, "value", event.target.value)} placeholder="Ф.И.О., телефон, email" disabled={!canEdit} /></label>
                  <label>Ссылка<input value={item.href || ""} maxLength={1000} onChange={(event) => updateContact(index, "href", event.target.value)} placeholder="tel:, mailto: или https://" disabled={!canEdit} /></label>
                  {canEdit && <button type="button" aria-label={`Удалить контакт ${item.label || index + 1}`} title="Удалить контакт" onClick={() => removeContact(index)}>×</button>}
                </div>
              ))}
            </div>
          )}
          <div className="site-contact-admin-actions">
            {canEdit && !isSvedenCardEditor && <button className="secondary" type="button" onClick={addContact}>Добавить контакт</button>}
            {canEdit && <button type="submit" disabled={saving}>{saving ? "Сохранение..." : "Сохранить изменения"}</button>}
          </div>
          {message && <div className="site-contact-admin-message success" role="status">{message}</div>}
        </form>
      )}
    </section>
  );
}
