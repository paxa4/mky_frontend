import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import Breadcrumbs from "../components/Breadcrumbs.jsx";
import Footer from "../components/Footer.jsx";
import Header from "../features/nav/Header.jsx";
import { PUBLIC_MENU_SEARCH_INDEX } from "../features/nav/MegaMenu.jsx";
import { API_BASE } from "../constants/index.js";

const PAGE_SIZE = 20;
const SEARCH_TYPES = [
  { id: "all", label: "Все результаты" },
  { id: "page", label: "Разделы" },
  { id: "article", label: "Статьи и материалы" },
  { id: "practice", label: "Практики" },
];
const RESULT_TYPE_LABELS = { page: "Раздел", article: "Материал", practice: "Практика" };

function normalizeSearchText(value) {
  return String(value || "")
    .toLocaleLowerCase("ru-RU")
    .replaceAll("ё", "е")
    .replace(/[-_/]+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreMenuPage(query, page) {
  const needle = normalizeSearchText(query);
  const haystack = normalizeSearchText(`${page.label} ${page.path} ${page.section || ""} ${page.description || ""}`);
  if (!needle || !haystack) return 0;
  if (haystack.includes(needle)) return 0.9;
  const words = needle.split(" ");
  const matches = words.filter((word) => haystack.includes(word)).length;
  return matches ? 0.5 * (matches / words.length) : 0;
}

function pageSearchResults(query) {
  return PUBLIC_MENU_SEARCH_INDEX.map((page) => ({
    ...page,
    title: page.label,
    url: page.path,
    score: scoreMenuPage(query, page),
  })).filter((page) => page.score > 0);
}

function mergeResults(items) {
  const unique = new Map();
  items.forEach((item) => {
    if (!item?.url || !item?.title) return;
    const key = `${item.type}:${item.url}`;
    const current = unique.get(key);
    if (!current || Number(item.score || 0) > Number(current.score || 0)) unique.set(key, item);
  });
  return [...unique.values()].sort((left, right) =>
    Number(right.score || 0) - Number(left.score || 0)
    || String(left.title).localeCompare(String(right.title), "ru"),
  );
}

export default function SearchPage({ currentUser, onGoAuth, onGoAdmin, onGoProfile }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const activeType = SEARCH_TYPES.some((item) => item.id === searchParams.get("type"))
    ? searchParams.get("type")
    : "all";
  const offset = Math.max(0, Number.parseInt(searchParams.get("offset") || "0", 10) || 0);
  const [input, setInput] = useState(query);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [inputFocused, setInputFocused] = useState(false);
  const showSuggestions = inputFocused && input.trim().length >= 2;

  useEffect(() => setInput(query), [query]);

  useEffect(() => {
    document.title = query
      ? `Поиск: ${query} | МКУ развития образования города Иркутска`
      : "Поиск по сайту | МКУ развития образования города Иркутска";
  }, [query]);

  useEffect(() => {
    const value = input.trim();
    if (!inputFocused || value.length < 2) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      setActiveSuggestionIndex(-1);
      return undefined;
    }

    const localPages = pageSearchResults(value);
    setSuggestions(localPages.slice(0, 6));
    setSuggestionsLoading(true);
    setActiveSuggestionIndex(-1);

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: value, type: "all", limit: "8" });
        const response = await fetch(`${API_BASE}/api/search/?${params}`, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (!controller.signal.aborted) {
          setSuggestions(mergeResults([
            ...localPages,
            ...(Array.isArray(data.results) ? data.results : []),
          ]).slice(0, 6));
        }
      } catch (reason) {
        if (reason.name !== "AbortError" && !controller.signal.aborted) {
          setSuggestions(mergeResults(localPages).slice(0, 6));
        }
      } finally {
        if (!controller.signal.aborted) setSuggestionsLoading(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [input, inputFocused]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setError("");
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    const types = activeType === "all" ? ["page", "article", "practice"] : [activeType];
    setLoading(true);
    setError("");

    Promise.allSettled(types.map(async (type) => {
      const params = new URLSearchParams({ q: query.trim(), type, limit: "100" });
      const response = await fetch(`${API_BASE}/api/search/?${params}`, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return Array.isArray(data.results) ? data.results : [];
    }))
      .then((settled) => {
        const successful = settled.filter((item) => item.status === "fulfilled");
        if (!successful.length) throw new Error("search failed");
        const remote = successful.flatMap((item) => item.value);
        const localPages = activeType === "all" || activeType === "page" ? pageSearchResults(query) : [];
        const typedResults = activeType === "all"
          ? [...localPages, ...remote]
          : activeType === "page"
            ? [...localPages, ...remote]
            : remote;
        setResults(mergeResults(typedResults));
      })
      .catch((reason) => {
        if (controller.signal.aborted || reason.name === "AbortError") return;
        setResults(activeType === "all" || activeType === "page" ? mergeResults(pageSearchResults(query)) : []);
        setError("Не удалось связаться с поиском материалов. Проверьте подключение и повторите запрос.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [activeType, query]);

  const pageResults = useMemo(() => results.slice(offset, offset + PAGE_SIZE), [offset, results]);
  const pageCount = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  function submitSearch(event) {
    event.preventDefault();
    const value = input.trim();
    setSearchParams(value ? { q: value, type: activeType } : {});
  }

  function chooseSuggestion(item) {
    navigate(item.url);
    setInputFocused(false);
    setActiveSuggestionIndex(-1);
  }

  function handleInputKeyDown(event) {
    if (!showSuggestions || !suggestions.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestionIndex((current) => (current + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestionIndex((current) => (current <= 0 ? suggestions.length - 1 : current - 1));
    } else if (event.key === "Enter" && activeSuggestionIndex >= 0) {
      event.preventDefault();
      chooseSuggestion(suggestions[activeSuggestionIndex]);
    }
  }

  function changeType(type) {
    setSearchParams(query ? { q: query, type } : { type });
  }

  function changePage(nextOffset) {
    setSearchParams({ q: query, type: activeType, offset: String(nextOffset) });
  }

  return (
    <div className="site-search-page">
      <style>{`
        .site-search-page { min-height: 100vh; display: flex; flex-direction: column; color: var(--imcro-color-text, #182c3d); background: var(--imcro-color-bg, #f1f6f8); font-family: Manrope, system-ui, sans-serif; }
        .site-search-main { flex: 1; width: min(1120px, calc(100% - 32px)); margin: 0 auto; padding: 28px 0 64px; }
        .site-search-page .app-breadcrumbs { color: rgba(255, 255, 255, 0.82); font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 14px; font-weight: 850; letter-spacing: 0; line-height: normal; }
        .site-search-page .app-breadcrumbs a { color: var(--imcro-color-surface, #fff); }
        .site-search-page .app-breadcrumbs a:hover { color: var(--imcro-color-surface, #fff); text-decoration: underline; text-underline-offset: 4px; }
        .site-search-page .app-breadcrumbs [aria-current="page"] { color: rgba(255, 255, 255, 0.72); }
        .site-search-page .app-breadcrumbs-separator { color: rgba(255, 255, 255, 0.58); }
        .site-search-main h1 { margin: 26px 0 20px; color: #fff; font-size: 34px; line-height: 1.2; }
        .site-search-form { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; }
        .site-search-input { min-width: 0; height: 52px; padding: 0 16px; border: 1px solid #b9cfda; border-radius: 8px; background: #fff; color: #182c3d; font: inherit; font-size: 16px; }
        .site-search-submit, .site-search-page-button { min-height: 44px; border: 1px solid #1f6483; border-radius: 8px; padding: 0 18px; background: #1f6483; color: #fff; font: inherit; font-weight: 750; cursor: pointer; }
        .site-search-submit { min-height: 52px; }
        .site-search-submit:hover, .site-search-page-button:hover:not(:disabled) { background: #174b68; }
        .site-search-suggestions { position: absolute; z-index: 5; top: calc(100% + 8px); left: 0; right: 120px; max-height: min(60vh, 420px); overflow-y: auto; padding: 7px; border: 1px solid #c7d8e0; border-radius: 8px; background: #fff; box-shadow: 0 14px 34px rgba(20, 50, 70, 0.2); }
        .site-search-suggestion, .site-search-all { width: 100%; min-width: 0; display: grid; gap: 3px; padding: 10px 12px; border: 0; border-radius: 6px; background: transparent; color: #1f5073; text-align: left; cursor: pointer; }
        .site-search-suggestion:hover, .site-search-suggestion.is-active, .site-search-all:hover { background: #eaf3f6; }
        .site-search-suggestion-title { overflow: hidden; color: #173c56; font-size: 14px; font-weight: 750; line-height: 1.35; text-overflow: ellipsis; white-space: nowrap; }
        .site-search-suggestion-meta, .site-search-suggestions-state { color: #60798a; font-size: 12px; line-height: 1.35; }
        .site-search-suggestions-state { padding: 10px 12px; }
        .site-search-all { margin-top: 4px; border-top: 1px solid #dbe6eb; border-radius: 0; font-size: 13px; font-weight: 750; }
        .site-search-tabs { display: flex; flex-wrap: wrap; gap: 8px; margin: 18px 0 10px; }
        .site-search-tab { min-height: 38px; border: 1px solid #c7d8e0; border-radius: 999px; padding: 0 14px; background: #fff; color: #31546a; font: inherit; font-weight: 700; cursor: pointer; }
        .site-search-tab[aria-pressed="true"] { border-color: #1f6483; background: #e2f1f5; color: #174b68; }
        .site-search-summary { min-height: 26px; margin: 12px 0; color: #fff; font-size: 14px; font-weight: 650; }
        .site-search-list { overflow: hidden; border: 1px solid #d3e0e6; border-radius: 8px; padding: 0 20px; background: var(--imcro-color-surface, #fff); color: #182c3d; }
        .site-search-result { display: grid; grid-template-columns: 140px minmax(0, 1fr); gap: 4px 18px; padding: 18px 4px; border-bottom: 1px solid #d3e0e6; }
        .site-search-result:last-child { border-bottom: 0; }
        .site-search-kind { grid-row: span 2; color: #547184; font-size: 13px; font-weight: 750; }
        .site-search-result a { width: fit-content; color: #1f5073; font-size: 18px; font-weight: 800; text-decoration: none; }
        .site-search-result a:hover { text-decoration: underline; }
        .site-search-result p { margin: 0; color: #415a6b; line-height: 1.55; }
        .site-search-section { color: #718492; font-size: 13px; }
        .site-search-state { padding: 22px 4px; color: #fff; }
        .site-search-error { color: #ffe1dc; }
        .site-search-pagination { display: flex; align-items: center; justify-content: center; gap: 14px; margin-top: 22px; color: #fff; }
        .site-search-page-button:disabled { border-color: #c9d7de; background: #e6edf0; color: #788b96; cursor: default; }
        @media (max-width: 620px) {
          .site-search-main { width: min(100% - 24px, 1120px); padding-top: 20px; }
          .site-search-main h1 { margin-top: 20px; font-size: 28px; }
          .site-search-form { grid-template-columns: 1fr; }
          .site-search-suggestions { right: 0; }
          .site-search-submit { width: 100%; }
          .site-search-list { padding: 0 12px; }
          .site-search-result { grid-template-columns: 1fr; gap: 6px; }
          .site-search-kind { grid-row: auto; }
          .site-search-result a { font-size: 17px; }
        }
      `}</style>
      <Header currentUser={currentUser} onGoAuth={onGoAuth} onGoAdmin={onGoAdmin} onGoProfile={onGoProfile} />
      <main className="site-search-main">
        <Breadcrumbs items={[{ label: "Главная", to: "/" }, { label: "Поиск" }]} />
        <h1>Поиск по сайту</h1>
        <form className="site-search-form" role="search" onSubmit={submitSearch}>
          <input
            className="site-search-input"
            type="search"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            onKeyDown={handleInputKeyDown}
            placeholder="Введите название, тему или ключевые слова"
            aria-label="Поиск по страницам и материалам сайта"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showSuggestions}
            aria-controls="site-search-suggestions"
            aria-activedescendant={activeSuggestionIndex >= 0 ? `site-search-option-${activeSuggestionIndex}` : undefined}
          />
          <button className="site-search-submit" type="submit">Найти</button>
          {showSuggestions && (
            <div className="site-search-suggestions" id="site-search-suggestions" role="listbox" aria-label="Варианты поиска">
              {suggestions.map((item, index) => (
                <button
                  id={`site-search-option-${index}`}
                  key={`${item.type}:${item.url}`}
                  className={`site-search-suggestion${index === activeSuggestionIndex ? " is-active" : ""}`}
                  type="button"
                  role="option"
                  aria-selected={index === activeSuggestionIndex}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => chooseSuggestion(item)}
                >
                  <span className="site-search-suggestion-title">{item.title}</span>
                  <span className="site-search-suggestion-meta">
                    {[RESULT_TYPE_LABELS[item.type] || "Раздел", item.section].filter(Boolean).join(" · ")}
                  </span>
                </button>
              ))}
              {suggestionsLoading && <div className="site-search-suggestions-state" role="status">Ищем материалы…</div>}
              {!suggestionsLoading && !suggestions.length && <div className="site-search-suggestions-state">Совпадений пока нет</div>}
              <button className="site-search-all" type="submit" onMouseDown={(event) => event.preventDefault()}>
                Все результаты по запросу «{input.trim()}»
              </button>
            </div>
          )}
        </form>
        <div className="site-search-tabs" role="group" aria-label="Тип результатов">
          {SEARCH_TYPES.map((type) => (
            <button
              className="site-search-tab"
              type="button"
              key={type.id}
              aria-pressed={activeType === type.id}
              onClick={() => changeType(type.id)}
            >
              {type.label}
            </button>
          ))}
        </div>
        <div className="site-search-summary" aria-live="polite">
          {query ? `Запрос: «${query}»${!loading ? ` · найдено: ${results.length}` : ""}` : "Введите запрос, чтобы найти страницу или материал."}
        </div>
        {loading && <div className="site-search-state" role="status">Ищем по сайту…</div>}
        {!loading && error && <div className="site-search-state site-search-error" role="alert">{error}</div>}
        {!loading && query && !results.length && !error && <div className="site-search-state">По запросу ничего не найдено. Попробуйте другие ключевые слова.</div>}
        {!loading && pageResults.length > 0 && (
          <div className="site-search-list">
            {pageResults.map((item) => (
              <article className="site-search-result" key={`${item.type}:${item.url}`}>
                <span className="site-search-kind">{RESULT_TYPE_LABELS[item.type] || "Раздел"}</span>
                <Link to={item.url} state={{ from: `${location.pathname}${location.search}` }}>{item.title}</Link>
                <p>{item.description || ""}</p>
                {item.section && <span className="site-search-section">{item.section}</span>}
              </article>
            ))}
          </div>
        )}
        {!loading && results.length > PAGE_SIZE && (
          <nav className="site-search-pagination" aria-label="Страницы результатов поиска">
            <button className="site-search-page-button" type="button" disabled={offset === 0} onClick={() => changePage(Math.max(0, offset - PAGE_SIZE))}>Назад</button>
            <span>Страница {currentPage} из {pageCount}</span>
            <button className="site-search-page-button" type="button" disabled={offset + PAGE_SIZE >= results.length} onClick={() => changePage(offset + PAGE_SIZE)}>Далее</button>
          </nav>
        )}
      </main>
      <Footer />
    </div>
  );
}
