export const DOMU_ARTICLE_SECTIONS = [
  {
    value: "master-klassy",
    path: "/dom-uchitelya/master-klassy/",
    title: "Мастер-классы",
    text: "Практические занятия, открытые уроки и материалы городских мастер-классов.",
    icon: "presentation",
  },
  {
    value: "molodye-pedagogi",
    path: "/dom-uchitelya/molodye-pedagogi/",
    title: "Клуб молодых педагогов",
    text: "Встречи, инициативы и материалы для профессионального развития молодых педагогов.",
    icon: "people",
  },
  {
    value: "nastavnichestvo",
    path: "/dom-uchitelya/nastavnichestvo/",
    title: "Наставничество",
    text: "Материалы и события программы наставничества для педагогов.",
    icon: "people",
  },
  {
    value: "klub-pedagogov",
    path: "/dom-uchitelya/klub-pedagogov/",
    title: "Клуб педагогов",
    text: "Профессиональные встречи, обсуждения и обмен педагогическими практиками.",
    icon: "people",
  },
  {
    value: "pedagogicheskaya-gostinaya",
    path: "/dom-uchitelya/pedagogicheskaya-gostinaya/",
    title: "Педагогическая гостиная",
    text: "Лекции, дискуссии и материалы открытых встреч педагогического сообщества.",
    icon: "people",
  },
  {
    value: "konkursy",
    path: "/dom-uchitelya/konkursy/",
    title: "Конкурсы",
    text: "Положения, анонсы и результаты конкурсов для педагогов.",
    icon: "trophy",
  },
  {
    value: "itogi",
    path: "/dom-uchitelya/itogi/",
    title: "Итоги и результаты",
    text: "Итоги мероприятий, конкурсов и проектов Дома учителя.",
    icon: "certificate",
  },
  {
    value: "fotogalereya",
    path: "/dom-uchitelya/fotogalereya/",
    title: "Фотогалерея",
    text: "Фотоматериалы и публикации о событиях Дома учителя.",
    icon: "image",
  },
  {
    value: "programma",
    path: "/dom-uchitelya/programma/",
    title: "Программа мероприятий",
    text: "Планы, расписания и материалы предстоящих мероприятий.",
    icon: "calendar",
  },
];

export const DOMU_SECTIONS = [
  {
    path: "/dom-uchitelya/o-strukturnom-podrazdelenii/",
    title: "О структурном подразделении",
    text: "Сведения о задачах, формате работы и городских педагогических инициативах Дома учителя.",
    icon: "people",
  },
  {
    path: "/dom-uchitelya/meropriyatiya/",
    title: "Мероприятия",
    text: "Анонсы встреч, семинаров, мастер-классов и городских событий для педагогов.",
    icon: "calendar",
  },
  {
    path: "/dom-uchitelya/kontaktnaya-informaciya/",
    title: "Контактная информация",
    text: "Адрес, телефон, режим работы и информация для связи со специалистами подразделения.",
    icon: "clipboard",
  },
  ...DOMU_ARTICLE_SECTIONS,
];

export const DOMU_LEGACY_REDIRECTS = [
  { from: "/dom-uchitelya/o-dome/", to: "/dom-uchitelya/o-strukturnom-podrazdelenii/" },
];
