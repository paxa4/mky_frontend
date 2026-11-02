import {
  ARCHIV_SECTIONS,
  DEYATELNOST_SECTIONS,
  DOMU_SECTIONS,
  KONKURSY_SECTIONS,
  METHODIKA_SUBJECTS,
  ROOT_SECTIONS,
  methodikaSubjectSlug,
} from "./articleTaxonomy.js";
import {
  SECTION_TREE,
  findSectionByPath,
  getSectionBreadcrumbItems,
  normalizePath,
} from "../../pages/sections/sectionStructure.js";

const ROOT_LABELS = {
  home: "Новости",
  domu: "Дом учителя",
  methodika: "Методическое пространство",
  noko: "НОКО",
  konkursy: "Олимпиады и конкурсы",
  deyatelnost: "Деятельность",
  archiv: "Архив",
};

function uniqueKeys(keys = []) {
  return [...new Set((keys || []).filter(Boolean))];
}

function node(key, label, children = [], meta = {}) {
  return { key, label, children, ...meta };
}

function optionNodes(root, options, keyPrefix = root) {
  return options.map((item) => node(`${keyPrefix}:${item.value}`, item.label, [], {
    root,
    value: item.value,
  }));
}

function branchFromOptions(root, label, options, rootKey = `${root}:root`, keyPrefix = root) {
  return node(rootKey, label, optionNodes(root, options, keyPrefix), {
    root,
    value: "root",
    selectable: false,
  });
}

function publicPageNode(section) {
  const path = normalizePath(section.path);
  return node(`page:${path}`, section.title, (section.children || []).map(publicPageNode), {
    root: "page",
    value: path,
    path,
  });
}

function publicPageGroup(rootPath, label, { includeRoot = false } = {}) {
  const root = SECTION_TREE.find((section) => section.path === rootPath);
  if (!root?.children?.length) return null;
  return node(`page-group:${rootPath}`, label || root.title, (includeRoot ? [root] : root.children).map(publicPageNode), {
    selectable: false,
    root: "page",
    value: rootPath,
  });
}

function methodikaBranch(allowedSubjects = METHODIKA_SUBJECTS, methodikaOnly = false) {
  return node("methodika:root", ROOT_LABELS.methodika, [
    node("methodika_subjects:group", "Предметы", allowedSubjects.map((subject) => node(`methodika_subject:${subject}`, subject, [], {
      root: "methodika",
      value: subject,
      kind: "subject",
    })), { selectable: false }),
    ...(!methodikaOnly ? [publicPageGroup("/metodicheskoe-prostranstvo/", "Профильные страницы")] : []),
  ].filter(Boolean), { root: "methodika", value: "root", selectable: false });
}

const PAGE_GROUP_ROOTS = [
  ["/noko/", "НОКО"],
  ["/molodye-pedagogi/", "Молодые педагоги"],
  ["/kpk/", "Курсы повышения квалификации"],
  ["/nastavnichestvo/", "Наставничество"],
  ["/nsu-skip/", "НСУ и школьные инициативы"],
  ["/olimpiady-dlya-detey/", "Олимпиады для детей"],
  ["/konferencii-dlya-detey/", "Конференции для детей"],
  ["/obrazovatelnye-sobytiya/", "Образовательные события"],
  ["/poleznaya-informaciya/", "Полезная информация"],
  ["/innovacionnaya-deyatelnost/", "Инновационная деятельность"],
  ["/vospitatelnoe-prostranstvo/", "Воспитательное пространство"],
];

export function buildArticleSectionTree({ allowedSubjects = METHODIKA_SUBJECTS, isDomuMode = false, methodikaOnly = false } = {}) {
  const tree = [
    node("home", ROOT_LABELS.home, [], { root: "home", value: "home" }),
    branchFromOptions("domu", ROOT_LABELS.domu, DOMU_SECTIONS),
    methodikaBranch(allowedSubjects, methodikaOnly),
    branchFromOptions("konkursy", ROOT_LABELS.konkursy, KONKURSY_SECTIONS),
    branchFromOptions("deyatelnost", ROOT_LABELS.deyatelnost, DEYATELNOST_SECTIONS),
    branchFromOptions("archiv", ROOT_LABELS.archiv, ARCHIV_SECTIONS),
    node("profile-pages:root", "Другие профильные разделы", PAGE_GROUP_ROOTS.flatMap(([path, label]) => {
      const group = publicPageGroup(path, label, { includeRoot: path === "/obrazovatelnye-sobytiya/" });
      return group ? [group] : [];
    }).concat([node("page:/bezopasnost/", "Безопасность", [], {
      root: "page",
      value: "/bezopasnost/",
      path: "/bezopasnost/",
    })]), { selectable: false, root: "page", value: "profile" }),
  ];
  return isDomuMode ? tree.filter((item) => item.key === "domu:root") : tree;
}

export function flattenArticleSections(nodes = [], ancestors = []) {
  return nodes.flatMap((item) => {
    const pathParts = [...ancestors, item.label].filter(Boolean);
    const publicSection = item.path ? findSectionByPath(item.path) : null;
    const pathLabel = publicSection
      ? getSectionBreadcrumbItems(publicSection).slice(1).map((crumb) => crumb.label).join(" / ")
      : item.root === "page" && item.path
        ? item.label
        : pathParts.join(" / ");
    const current = {
      ...item,
      pathLabel,
      searchText: `${pathLabel} ${pathParts.join(" ")}`.toLowerCase(),
    };
    const children = item.children?.length ? flattenArticleSections(item.children, pathParts) : [];
    return item.selectable === false ? children : [current, ...children];
  });
}

function treeMatchesQuery(item, query, ancestors = []) {
  const pathParts = [...ancestors, item.label].filter(Boolean);
  const searchText = `${pathParts.join(" ")} ${item.key}`.toLowerCase();
  return searchText.includes(String(query || "").trim().toLowerCase());
}

export function filterArticleSectionTree(nodes = [], query = "", ancestors = []) {
  const normalized = String(query || "").trim();
  if (!normalized) return nodes;

  return nodes
    .map((item) => {
      const itemMatches = treeMatchesQuery(item, normalized, ancestors);
      const nextAncestors = [...ancestors, item.label].filter(Boolean);
      const children = filterArticleSectionTree(item.children || [], normalized, nextAncestors);
      if (!itemMatches && !children.length) return null;
      return {
        ...item,
        children: itemMatches ? (item.children || []) : children,
      };
    })
    .filter(Boolean);
}

function descendantKeys(item = {}) {
  return (item.children || []).flatMap((child) => [child.key, ...descendantKeys(child)]);
}

export function getSectionNodeSelectionState(item = {}, selectedKeys = []) {
  const selected = new Set(selectedKeys);
  const checked = selected.has(item.key);
  const childSelected = descendantKeys(item).some((key) => selected.has(key));
  return {
    checked,
    indeterminate: !checked && childSelected,
  };
}

export function searchArticleSections(flatSections = [], query = "") {
  const normalized = String(query || "").trim().toLowerCase();
  if (!normalized) return flatSections;
  return flatSections.filter((section) => section.searchText.includes(normalized) || section.key.toLowerCase().includes(normalized));
}

export function getSectionLookup(options = {}) {
  return new Map(flattenArticleSections(buildArticleSectionTree(options)).map((section) => [section.key, section]));
}

export function publicPathFromArticleSectionKey(key) {
  const value = String(key || "");
  if (value.startsWith("page:")) return normalizePath(value.slice("page:".length));
  if (value === "events") return "/obrazovatelnye-sobytiya/";
  if (value.startsWith("methodika_subject:")) {
    return `/metodika/${methodikaSubjectSlug(value.slice("methodika_subject:".length))}/`;
  }
  if (value.startsWith("methodika_section:")) {
    const section = value.slice("methodika_section:".length);
    return ["methodicheskiy-sovet", "rekomendacii"].includes(section)
      ? "/metodicheskoe-prostranstvo/metodicheskie-materialy/"
      : null;
  }
  for (const [prefix, root] of [
    ["domu:", "/dom-uchitelya/"],
    ["noko:", "/noko/"],
    ["konkursy:", "/konkursy/"],
    ["deyatelnost:", "/deyatelnost/"],
    ["archiv:", "/archiv/"],
  ]) {
    if (!value.startsWith(prefix)) continue;
    const section = value.slice(prefix.length);
    return section && section !== "root" ? normalizePath(`${root}${section}`) : root;
  }
  return null;
}

export function articleMatchesPublicSection(article = {}, section = {}) {
  const targetPath = normalizePath(section.path);
  if (!targetPath || targetPath === "/") return false;
  const paths = new Set();
  const addPathAndParent = (path) => {
    if (!path) return;
    let node = findSectionByPath(path);
    paths.add(normalizePath(path));
    while (node?.parentPath) {
      paths.add(node.parentPath);
      node = findSectionByPath(node.parentPath);
    }
  };

  addPathAndParent(article.sectionPath);
  addPathAndParent(article.parentPath);
  if (article.duplicate_to_events) addPathAndParent("/obrazovatelnye-sobytiya/");
  for (const entry of article.sections || []) {
    const key = typeof entry === "string" ? entry : entry?.key;
    addPathAndParent(publicPathFromArticleSectionKey(key));
  }

  return paths.has(targetPath) || [...paths].some((path) => (
    section.level === 1 && path.startsWith(targetPath)
  ));
}

function canonicalizeSectionKey(key) {
  if (["domu:root", "methodika:root", "noko:root", "konkursy:root", "deyatelnost:root", "archiv:root"].includes(key)) {
    return null;
  }
  if (key === "events") return "page:/obrazovatelnye-sobytiya/";
  if (key.startsWith("noko:") && key !== "noko:root") {
    return `page:${publicPathFromArticleSectionKey(key)}`;
  }
  if (key.startsWith("methodika_section:")) {
    const path = publicPathFromArticleSectionKey(key);
    return path ? `page:${path}` : key;
  }
  return key;
}

function legacyKeysFromArticle(article = {}, includeDefaultNews = true) {
  const keys = [];
  if (article.duplicate_to_main) keys.push("home");
  if (article.dom_uchitelya_section) keys.push(`domu:${article.dom_uchitelya_section}`);
  if (article.methodika_subject) keys.push(`methodika_subject:${article.methodika_subject}`);
  if (article.hub_kind === "methodika" && article.hub_path) keys.push(`methodika_section:${article.hub_path}`);
  if (article.noko_section) keys.push(`noko:${article.noko_section}`);
  if (article.hub_kind && article.hub_kind !== "methodika" && article.hub_kind !== "events" && article.hub_path) keys.push(`${article.hub_kind}:${article.hub_path}`);
  if (article.hub_kind && article.hub_kind !== "methodika" && article.hub_kind !== "events" && !article.hub_path) keys.push(`${article.hub_kind}:root`);
  if (article.duplicate_to_events) keys.push("events");
  if (includeDefaultNews && !keys.length && !article.hub_kind) keys.push("home");
  return keys;
}

export function getArticleSectionSelection(article = {}) {
  const storedKeys = Array.isArray(article.sections)
    ? article.sections
      .map((section) => typeof section === "string" ? section : section?.key)
      .filter(Boolean)
    : [];
  return uniqueKeys([...storedKeys, ...legacyKeysFromArticle(article, !storedKeys.length)]
    .map(canonicalizeSectionKey)
    .filter(Boolean));
}

function primarySection(keys) {
  return keys.find((key) => !["events", "home"].includes(key)) || keys.find((key) => key === "home") || keys[0] || "home";
}

function legacyFieldsFromKeys(keys) {
  const primary = primarySection(keys);
  const next = {
    duplicate_to_main: keys.includes("home"),
    duplicate_to_events: keys.includes("events"),
    methodika_subject: "",
    dom_uchitelya_section: "",
    noko_section: "",
    hub_kind: "",
    hub_path: "",
  };

  const domuKey = keys.find((key) => key.startsWith("domu:") && key !== "domu:root");
  const nokoKey = keys.find((key) => key.startsWith("noko:") && key !== "noko:root");
  if (domuKey) next.dom_uchitelya_section = domuKey.replace("domu:", "");
  if (nokoKey) next.noko_section = nokoKey.replace("noko:", "");

  if (primary.startsWith("domu:") && primary !== "domu:root") next.dom_uchitelya_section = primary.replace("domu:", "");
  if (primary.startsWith("methodika_subject:")) next.methodika_subject = primary.replace("methodika_subject:", "");
  if (primary.startsWith("methodika_section:")) {
    next.hub_kind = "methodika";
    next.hub_path = primary.replace("methodika_section:", "");
  }
  if (primary.startsWith("noko:") && primary !== "noko:root") next.noko_section = primary.replace("noko:", "");
  ["konkursy", "deyatelnost", "archiv"].forEach((hub) => {
    if (primary.startsWith(`${hub}:`)) {
      next.hub_kind = hub;
      next.hub_path = primary.endsWith(":root") ? "" : primary.replace(`${hub}:`, "");
    }
  });
  if (primary === "events") next.hub_kind = "events";
  return next;
}

function scopeFromKeys(keys, currentScope = "imcro_only", allowedScopes = ["imcro_only", "dom_uchitelya_only", "both"]) {
  const hasDomu = keys.some((key) => key.startsWith("domu:"));
  const hasNonDomu = keys.some((key) => !key.startsWith("domu:"));
  const preferred = hasDomu
    ? (hasNonDomu ? "both" : "dom_uchitelya_only")
    : currentScope || "imcro_only";
  if (allowedScopes.includes(preferred)) return preferred;
  return allowedScopes[0] || "imcro_only";
}

export function applyArticleSectionSelection(form = {}, keys = [], options = {}) {
  const selectedKeys = uniqueKeys(keys.map(canonicalizeSectionKey).filter(Boolean));
  const lookup = getSectionLookup(options);
  const sections = selectedKeys.map((key) => {
    const section = lookup.get(key);
    return {
      key,
      label: section?.label || key,
      path: section?.pathLabel || section?.label || key,
      root: section?.root || key.split(":")[0],
      value: section?.value || key,
    };
  });

  return {
    ...form,
    ...legacyFieldsFromKeys(selectedKeys),
    publishing_scope: scopeFromKeys(selectedKeys, form.publishing_scope, options.allowedScopes),
    sections,
  };
}

export function sectionChipsFromKeys(keys = [], maxVisible = 3, options = {}) {
  const lookup = getSectionLookup(options);
  const chips = uniqueKeys(keys.map(canonicalizeSectionKey).filter(Boolean)).map((key) => ({
    key,
    label: lookup.get(key)?.pathLabel || key,
  }));
  return {
    visible: chips.slice(0, maxVisible),
    hiddenCount: Math.max(0, chips.length - maxVisible),
    all: chips,
  };
}

export function isHomeSectionSelected(article = {}) {
  return getArticleSectionSelection(article).includes("home");
}

export function sectionKeysForArticle(article = {}) {
  return getArticleSectionSelection(article);
}

export function rootLabelForSectionKey(key) {
  if (!key) return ROOT_SECTIONS[0]?.label || ROOT_LABELS.home;
  if (key === "home") return ROOT_LABELS.home;
  if (key.startsWith("methodika_subject:") || key.startsWith("methodika_section:")) return ROOT_LABELS.methodika;
  return ROOT_LABELS[key.split(":")[0]] || ROOT_LABELS.home;
}
