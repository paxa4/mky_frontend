import { API_BASE } from "../../constants/index.js";
import {
  ARCHIV_ROUTES,
  DEYATELNOST_ROUTES,
  KONKURSY_ROUTES,
  METHODIKA_STATIC_PAGES,
  METHODIKA_SUBJECT_CARDS,
  NOKO_ROUTES,
} from "../../features/admin/articleTaxonomy.js";
import { contactInfo } from "../../pages/homePageData.js";
import { DOMU_ARTICLE_SECTIONS, DOMU_SECTIONS } from "../../pages/domUchitelya/domuSections.js";
import { HUB_HOME_CONFIGS } from "../../pages/hubs/hubHomeConfig.js";
import { staff, svedeniyaPage } from "../../pages/svedeniya/svedeniyaData.js";
import { SECTION_TREE, flattenSectionTree } from "../../pages/sections/sectionStructure.js";

let contactInfoRequest;

function contactRows(contact = {}) {
  return [
    ["ФИО", contact.person],
    ["Должность", contact.position],
    ["Адрес", contact.address],
    ["Телефон", contact.phone],
    ["Электронная почта", contact.email],
    ["График работы", contact.schedule],
  ]
    .filter(([, value]) => value)
    .map(([label, value]) => ({
      label,
      value,
      href: label === "Телефон"
        ? `tel:${String(value).replace(/[^\d+]/g, "")}`
        : label === "Электронная почта"
          ? `mailto:${value}`
          : null,
    }));
}

const defaultsByPath = new Map();
const director = staff.leaders[0];

function addLocation(location) {
  if (!location?.path) return;
  const existing = defaultsByPath.get(location.path);
  if (existing && !location.contacts?.length) return;
  defaultsByPath.set(location.path, {
    ...existing,
    path: location.path,
    title: location.title || "Контактная информация",
    description: location.description || "",
    contacts: (location.contacts || []).map((item) => ({ ...item })),
  });
}

addLocation({
  path: "/",
  title: "Контактная информация",
  description: "Свяжитесь с МКУ ИМЦРО или откройте адрес центра на карте.",
  contacts: [
    { label: "ФИО", value: director.name },
    { label: "Должность", value: director.position },
    { label: "Адрес", value: contactInfo.address },
    { label: "Телефон", value: contactInfo.phone, href: "tel:+73952201985" },
    { label: "Электронная почта", value: contactInfo.email, href: `mailto:${contactInfo.email}` },
    { label: "График работы", value: "Понедельник-пятница: 09:00-18:00" },
  ],
});

flattenSectionTree(SECTION_TREE).forEach((section) => {
  const root = SECTION_TREE.find((item) => item.path === section.rootPath);
  const contact = section.contact || root?.contact;
  addLocation({
    path: section.path,
    title: `Контакты: ${section.title}`,
    description: contact?.text,
    contacts: contactRows(contact),
  });
});

Object.entries(HUB_HOME_CONFIGS).forEach(([path, config]) => {
  if (!config?.contactBlock) return;
  addLocation({
    path,
    title: config.contactBlock.title,
    description: config.contactBlock.description,
    contacts: config.contactBlock.contacts,
  });
});

function addRouteLocations(routes) {
  routes.forEach((route) => addLocation({
    path: route.path,
    title: `Контакты: ${route.title}`,
    description: "",
    contacts: [],
  }));
}

METHODIKA_SUBJECT_CARDS.forEach((subject) => addLocation({
  path: `/metodika/${subject.slug}/`,
  title: `Контакты: ${subject.name}`,
  description: `Контактная информация предметного кабинета «${subject.name}».`,
  contacts: [],
}));
addRouteLocations(METHODIKA_STATIC_PAGES);
addRouteLocations(NOKO_ROUTES);
addRouteLocations(KONKURSY_ROUTES);
addRouteLocations(DEYATELNOST_ROUTES);
addRouteLocations(ARCHIV_ROUTES);

const commonSection = svedeniyaPage.sections.find((section) => section.anchor === "common");
const commonContacts = (commonSection?.blocks || [])
  .filter((block) => block.type === "contacts")
  .flatMap((block, groupIndex) => (block.items || []).flatMap((card, cardIndex) => (
    card.details || []
  ).map((item) => ({
    group: block.title || "Контакты",
    card: card.title,
    key: `common-${groupIndex}-${cardIndex}`,
    label: item.label || "Контакт",
    value: item.value || "",
    href: item.href || "",
  }))));

addLocation({
  path: "/sveden/common/",
  title: "Основные сведения: контактные карточки",
  description: "Контактная информация и режим работы организации и подразделений.",
  contacts: commonContacts,
});

const structureSection = svedeniyaPage.sections.find((section) => section.anchor === "struct");
const subdivisionBlock = structureSection?.blocks.find((block) => block.type === "subdivisions");
const subdivisionContacts = (subdivisionBlock?.items || []).flatMap((card, cardIndex) => (
  card.details || []
).map((item) => ({
  group: subdivisionBlock.title || "Структурные подразделения",
  card: card.title,
  key: `subdivision-${cardIndex}`,
  label: item.label || "Контакт",
  value: item.value || "",
  href: item.href || "",
})));

addLocation({
  path: "/sveden/struct/",
  title: "Структурные подразделения: контактные карточки",
  description: "Контактные данные структурных подразделений организации.",
  contacts: subdivisionContacts,
});

const employeeSection = svedeniyaPage.sections.find((section) => section.anchor === "employees");
const employeeContacts = (employeeSection?.blocks || [])
  .filter((block) => block.type === "staff")
  .flatMap((block) => (block.items || []).flatMap((person, index) => {
    const key = `${block.variant === "leaders" ? "leader" : "teacher"}-${index}`;
    const values = [
      ["ФИО", person.name],
      ["Должность", person.position],
      ["Телефон", person.phone],
      ["Электронная почта", person.email],
      ["Кабинет", person.office],
      ["Подразделение", person.department],
      ["Направление", person.direction],
    ];
    return values
      .filter(([, value]) => value)
      .map(([label, value]) => ({
        group: block.title || "Сотрудники",
        card: person.name,
        key,
        label,
        value,
        href: label === "Телефон"
          ? `tel:${String(value).replace(/[^\d+]/g, "")}`
          : label === "Электронная почта" ? `mailto:${value}` : "",
      }));
  }));

addLocation({
  path: "/sveden/employees/",
  title: "Руководство и педагогический состав",
  description: "Контактные данные руководителей и педагогических работников.",
  contacts: employeeContacts,
});

addLocation({
  path: "/dom-uchitelya/",
  title: "Контакты Дома учителя",
  contacts: [
    { label: "Адрес", value: "ул. Литвинова, 14" },
    { label: "Телефон", value: "+7 (3952) 48-12-56", href: "tel:+73952481256" },
    { label: "Режим работы", value: "Пн-Пт: 9:00-17:00" },
  ],
});

addLocation({
  path: "/dom-uchitelya/kontaktnaya-informaciya/",
  title: "Контактная информация Дома учителя",
  description: "Контактная информация подразделения.",
  contacts: [
    { label: "Адрес", value: "ул. Литвинова, 14" },
    { label: "Телефон", value: "+7 (3952) 48-12-56", href: "tel:+73952481256" },
    { label: "Режим работы", value: "Пн-Пт: 9:00-17:00" },
  ],
});

addRouteLocations(DOMU_SECTIONS);
addRouteLocations(DOMU_ARTICLE_SECTIONS);

addLocation({
  path: "/tpmpk/kontakty/",
  title: "Контакты ТПМПК",
  description: "Адрес, телефон и режим работы комиссии.",
  contacts: [
    { label: "Адрес", value: "г. Иркутск, ул. Лыткина, 75А" },
    { label: "Телефон", value: "+7 (3952) 48-12-56", href: "tel:+73952481256" },
    { label: "График работы", value: "Понедельник - пятница, 09:00 - 17:00" },
    { label: "Приём", value: "По предварительной записи через сайт или оператора." },
  ],
});

addLocation({
  path: "/bezopasnost/",
  title: "Контакты по вопросам безопасности",
  description: "Ответственный специалист и контакты по тематике раздела.",
  contacts: [],
});

export const SITE_CONTACT_LOCATIONS = [...defaultsByPath.values()]
  .sort((left, right) => left.title.localeCompare(right.title, "ru"));

export function getDefaultSiteContact(path) {
  return defaultsByPath.get(path) || null;
}

export function getSiteContactInfo() {
  if (!contactInfoRequest) {
    contactInfoRequest = fetch(`${API_BASE}/api/contact-info/`)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .catch((error) => {
        contactInfoRequest = null;
        throw error;
      });
  }
  return contactInfoRequest;
}

export function invalidateSiteContactInfo() {
  contactInfoRequest = null;
}

export function mergeSiteContact(path, fallback, records) {
  const saved = records.find((item) => item.path === path);
  if (!saved) return fallback;
  if (!fallback?.contacts?.length || saved.contacts.some((item) => item.group || item.card || item.key)) {
    return { ...fallback, ...saved };
  }

  const unusedSavedIndexes = new Set(saved.contacts.map((_, index) => index));
  const contacts = fallback.contacts.map((item) => {
    const matchingIndex = [...unusedSavedIndexes].find((index) => (
      saved.contacts[index].label.trim().toLocaleLowerCase("ru") === item.label.trim().toLocaleLowerCase("ru")
    ));
    if (matchingIndex === undefined) return item;
    unusedSavedIndexes.delete(matchingIndex);
    const previous = saved.contacts[matchingIndex];
    return { ...item, value: previous.value, href: previous.href || item.href };
  });
  const leftovers = [...unusedSavedIndexes].map((index) => saved.contacts[index]);
  if (leftovers.length) {
    contacts.push(...leftovers.map((item, index) => ({
      ...item,
      group: "Дополнительные контактные данные",
      card: saved.title || "Контактная карточка",
      key: `legacy-${index}`,
    })));
  }

  return { ...fallback, ...saved, contacts };
}
