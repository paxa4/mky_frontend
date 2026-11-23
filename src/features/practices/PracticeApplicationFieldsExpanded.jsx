import {
  PRACTICE_AUDIENCE_GROUPS,
  PRACTICE_ADMIN_LEVELS,
  PRACTICE_CHANGE_SCOPES,
  PRACTICE_EDUCATION_LEVELS,
  PRACTICE_IMPLEMENTATION_LEVELS,
  PRACTICE_LEVEL_DESCRIPTIONS,
  PRACTICE_LEVELS,
  PRACTICE_MUNICIPALITIES,
  PRACTICE_SUPPORT_OPTIONS,
  PRACTICE_TOPICS,
  PRACTICE_TYPES,
} from "./practiceTaxonomyExpanded.js";
import { EMPTY_PRACTICE_APPLICATION, derivePracticeFields, PRACTICE_DESCRIPTION_FIELDS } from "./practiceApplicationData.js";
import "./PracticeApplicationFieldsExpanded.css";

function Field({ label, hint, required = false, wide = false, children }) {
  return (
    <label className={`practice-application-field${wide ? " practice-application-field-wide" : ""}`}>
      <span>{label}{required ? " *" : ""}</span>
      {hint && <small>{hint}</small>}
      {children}
    </label>
  );
}

function TextField({ label, hint, value, onChange, required = false, wide = false, placeholder = "", type = "text", maxLength }) {
  return (
    <Field label={label} hint={hint} required={required} wide={wide}>
      <input type={type} required={required} maxLength={maxLength} value={value || ""} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </Field>
  );
}

function TextAreaField({ label, hint, value, onChange, required = false, wide = false, rows = 4, placeholder = "" }) {
  return (
    <Field label={label} hint={hint} required={required} wide={wide}>
      <textarea required={required} rows={rows} value={value || ""} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </Field>
  );
}

function SelectField({ label, hint, value, onChange, options, required = false, emptyLabel = "Выберите вариант" }) {
  return (
    <Field label={label} hint={hint} required={required}>
      <select required={required} value={value || ""} onChange={(event) => onChange(event.target.value)}>
        <option value="">{emptyLabel}</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </Field>
  );
}

function MultiChoice({ label, hint, options, value = [], onChange, required = false }) {
  const selected = Array.isArray(value) ? value : [];
  return (
    <fieldset className="practice-application-options">
      <legend>{label}{required ? " *" : ""}</legend>
      {hint && <p>{hint}</p>}
      <div>
        {options.map((option, index) => (
          <label className="practice-application-option" key={option}>
            <input
              type="checkbox"
              required={required && selected.length === 0 && index === 0}
              checked={selected.includes(option)}
              onChange={(event) => onChange(event.target.checked
                ? [...selected, option]
                : selected.filter((item) => item !== option))}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function YesNoField({ label, value, onChange }) {
  return (
    <Field label={label} hint="Выберите ответ, если он применим к вашей организации.">
      <select value={value === true ? "yes" : value === false ? "no" : ""} onChange={(event) => onChange(event.target.value === "yes" ? true : event.target.value === "no" ? false : null)}>
        <option value="">Не указано</option>
        <option value="yes">Да</option>
        <option value="no">Нет</option>
      </select>
    </Field>
  );
}

export default function PracticeApplicationFields({ practice, update, isAdmin = false, required = false }) {
  const data = { ...EMPTY_PRACTICE_APPLICATION, ...(practice.application_data || {}) };
  const topicOptions = isAdmin && practice.topic && !PRACTICE_TOPICS.includes(practice.topic)
    ? [practice.topic, ...PRACTICE_TOPICS]
    : PRACTICE_TOPICS;
  const municipalityOptions = isAdmin && practice.municipality && !PRACTICE_MUNICIPALITIES.includes(practice.municipality)
    ? [practice.municipality, ...PRACTICE_MUNICIPALITIES]
    : PRACTICE_MUNICIPALITIES;
  const updateApplication = (key, value) => {
    const next = { ...data, [key]: value };
    update("application_data", (current) => ({
      ...EMPTY_PRACTICE_APPLICATION,
      ...(current || {}),
      [key]: value,
    }));
    const legacy = derivePracticeFields(next);
    if (legacy.summary) update("summary", legacy.summary);
    if (legacy.description || PRACTICE_DESCRIPTION_FIELDS.some(([, field]) => field === key)) update("description", legacy.description);
    if (legacy.results || ["quantitative_results", "qualitative_results"].includes(key)) update("results", legacy.results);
    if (key === "audience_groups") update("target_audience", legacy.target_audience);
  };

  return (
    <div className="practice-application">
      <section className="practice-application-section">
        <h2>Название практики</h2>
        <div className="practice-application-grid">
          <TextField label="Название практики" hint="Укажите полное название практики." value={practice.title} onChange={(value) => update("title", value)} required={required || isAdmin} wide />
        </div>
      </section>

      <section className="practice-application-section">
        <h2>Организация и место реализации</h2>
        <p>Укажите территорию и адрес образовательной организации, где реализуется практика. Точку реализации отметьте отдельно на карте ниже.</p>
        <div className="practice-application-grid">
          <SelectField label="Территория реализации (муниципальный округ)" hint="Выберите муниципальный округ, на территории которого реализуется практика." value={practice.municipality} onChange={(value) => update("municipality", value)} options={municipalityOptions} required={required} />
          <TextField label="Полное наименование образовательной организации по уставу" hint="Введите полное название так, как оно указано в уставе организации." value={practice.organization} onChange={(value) => update("organization", value)} required={required || isAdmin} />
          <TextField label="Краткое наименование образовательной организации по уставу" hint="Введите сокращённое название, указанное в уставе организации." value={data.short_organization} onChange={(value) => updateApplication("short_organization", value)} required={required} />
          <TextField label="Почтовый индекс" hint="Например: 663705" value={data.postal_code} onChange={(value) => updateApplication("postal_code", value)} required={required} />
          <TextField label="Улица" hint="Введите название без слов «ул.», «проспект», «переулок» и подобных сокращений." value={data.street} onChange={(value) => updateApplication("street", value)} required={required} />
          <TextField label="Номер дома" hint="Укажите номер дома по адресу организации." value={data.house_number} onChange={(value) => updateApplication("house_number", value)} required={required} />
          <TextField label="Строение или корпус" hint="Укажите номер строения или корпуса, если он есть." value={data.building} onChange={(value) => updateApplication("building", value)} />
          <TextField label="Период реализации практики" hint="Укажите период, в который практика проводится." value={practice.implementation_period} onChange={(value) => update("implementation_period", value)} />
          <TextField label="Ссылка на материалы на сайте организации" hint="Укажите страницу с материалами практики на сайте образовательной организации. Используйте полный адрес, начиная с https://" type="url" value={data.organization_url} onChange={(value) => updateApplication("organization_url", value)} required={required} wide />
        </div>
      </section>

      <section className="practice-application-section">
        <h2>Тип, направление и охват</h2>
        <p>Муниципальный округ и адрес показывают, где проводится практика. Охват показывает наибольший уровень её применения, а масштаб изменений — какие части образовательного процесса она затрагивает. Уровень становления назначает эксперт.</p>
        <div className="practice-application-grid">
          <SelectField label="Тип практики" hint="Выберите один тип: педагогическая, методическая или управленческая практика." value={practice.practice_type} onChange={(value) => update("practice_type", value)} options={PRACTICE_TYPES} required={required} />
          <SelectField label="Направление практики" hint="Выберите одно основное направление, которому соответствует практика." value={practice.topic} onChange={(value) => update("topic", value)} options={topicOptions} required={required || isAdmin} />
          <SelectField label="Уровень распространения практики" hint="Выберите наибольший охват: одна организация, муниципалитет, регион или страна. Это не адрес и не название муниципального округа." value={practice.implementation_level} onChange={(value) => update("implementation_level", value)} options={PRACTICE_IMPLEMENTATION_LEVELS} required={required} />
          {isAdmin ? (
            <SelectField label="Уровень становления практики" hint={PRACTICE_LEVEL_DESCRIPTIONS[practice.level] || "Уровень присваивается по итогам экспертизы."} value={practice.level} onChange={(value) => update("level", value)} options={PRACTICE_ADMIN_LEVELS} />
          ) : (
            <div className="practice-application-note"><strong>Уровень становления практики</strong><span>Будет определён экспертами по итогам экспертизы.</span></div>
          )}
          <TextField label="Ключевые слова" hint="Укажите слова и короткие словосочетания, характеризующие практику; разделяйте их запятыми." value={data.keywords} onChange={(value) => updateApplication("keywords", value)} required={required} wide />
        </div>
        <MultiChoice label="Уровень образования" hint="Можно выбрать несколько вариантов." options={PRACTICE_EDUCATION_LEVELS} value={data.education_levels} onChange={(value) => updateApplication("education_levels", value)} required={required} />
        <MultiChoice label="Группы участников образовательной деятельности" hint="Отметьте все группы, на которые направлена практика." options={PRACTICE_AUDIENCE_GROUPS} value={data.audience_groups} onChange={(value) => {
          updateApplication("audience_groups", value);
          update("target_audience", value.join(", "));
        }} required={required} />
        <MultiChoice label="Масштаб изменений" hint="Отметьте уровни, на которых практика меняет образовательный процесс." options={PRACTICE_CHANGE_SCOPES} value={data.change_scopes} onChange={(value) => updateApplication("change_scopes", value)} required={required} />
      </section>

      <section className="practice-application-section">
        <h2>Ответственные и авторы</h2>
        <p>Контакты ответственного лица нужны редакции для связи по заявке. Телефоны и адреса почты не показываются посетителям сайта.</p>
        <div className="practice-application-grid">
          <TextField label="Ф.И.О. ответственного лица" hint="Укажите фамилию, имя и отчество куратора практики." value={data.curator_name} onChange={(value) => updateApplication("curator_name", value)} required={required} />
          <TextField label="Должность ответственного лица" hint="Укажите должность куратора практики." value={data.curator_position} onChange={(value) => updateApplication("curator_position", value)} required={required} />
          <TextField label="Рабочий телефон с кодом" hint="Например: 8 (3952) 00-00-00." value={data.curator_work_phone} onChange={(value) => updateApplication("curator_work_phone", value)} required={required} />
          <TextField label="Электронная почта ответственного лица" hint="Несколько адресов разделите точкой с запятой." value={data.curator_email} onChange={(value) => updateApplication("curator_email", value)} required={required} />
          <TextField label="Мобильный телефон" hint="Укажите, если удобно связаться по мобильному." value={data.curator_mobile} onChange={(value) => updateApplication("curator_mobile", value)} />
          <TextField label="Ф.И.О. автора или авторов практики" hint="Перечислите авторов практики." value={practice.author_name} onChange={(value) => update("author_name", value)} required={required || isAdmin} />
          <TextAreaField label="Ф.И.О. реализаторов практики" hint="Перечислите участников команды, реализующей практику." value={data.implementers} onChange={(value) => updateApplication("implementers", value)} required={required} wide rows={3} />
        </div>
      </section>

      <section className="practice-application-section">
        <h2>Описание практики</h2>
        <p>Опишите, какую проблему решает практика, как она устроена, какие результаты даёт и как их можно проверить.</p>
        <div className="practice-application-grid">
          <TextAreaField label="Актуальность темы" hint="Объясните, почему практика важна и какую потребность системы образования она отвечает." value={data.relevance} onChange={(value) => updateApplication("relevance", value)} required={required} wide />
          <TextAreaField label="Проблема, на решение которой направлена практика" hint="Опишите проблему, которую выявили и на решение которой направили практику." value={data.problems} onChange={(value) => updateApplication("problems", value)} required={required} wide />
          <TextAreaField label="Цель практики" hint="Сформулируйте ожидаемый результат, ради которого проводится практика." value={data.goal} onChange={(value) => updateApplication("goal", value)} required={required} />
          <TextAreaField label="Задачи практики" hint="Перечислите конкретные шаги, необходимые для достижения цели." value={data.tasks} onChange={(value) => updateApplication("tasks", value)} required={required} />
          <TextAreaField label="Основная идея, суть или базовый принцип" hint="Опишите главную идею или принцип, на котором построена практика." value={data.core_idea} onChange={(value) => updateApplication("core_idea", value)} required={required} wide />
          <TextAreaField label="Средства реализации: технологии, методы и формы работы" hint="Укажите применяемые технологии, методы и формы организации работы." value={data.implementation_methods} onChange={(value) => updateApplication("implementation_methods", value)} required={required} wide />
          <TextAreaField label="Количественные результаты" hint="Укажите измеримые показатели и их значения." value={data.quantitative_results} onChange={(value) => updateApplication("quantitative_results", value)} required={required} />
          <TextAreaField label="Качественные результаты" hint="Опишите изменения в знаниях, навыках или организации работы, в том числе отзывы участников." value={data.qualitative_results} onChange={(value) => updateApplication("qualitative_results", value)} required={required} />
          <TextAreaField label="Как измерялись результаты" hint="Опишите показатели и инструменты, которыми оценивали результаты практики." value={data.result_measurement} onChange={(value) => updateApplication("result_measurement", value)} required={required} wide />
          <TextAreaField label="Трудности при реализации" hint="Укажите возникшие затруднения и условия, которые осложняли реализацию." value={data.difficulties} onChange={(value) => updateApplication("difficulties", value)} required={required} wide />
          <TextAreaField label="Практические рекомендации заинтересовавшимся коллегам" hint="Опишите, что коллегам важно учесть при применении или тиражировании практики." value={data.recommendations} onChange={(value) => updateApplication("recommendations", value)} required={required} wide />
        </div>
        <MultiChoice label="Какое сопровождение готова обеспечить команда практики" hint="Можно выбрать несколько вариантов." options={PRACTICE_SUPPORT_OPTIONS} value={data.support_options} onChange={(value) => updateApplication("support_options", value)} />
      </section>

      <section className="practice-application-section">
        <h2>Подтверждения и дополнительные материалы</h2>
        <div className="practice-application-grid">
          <TextAreaField label="Рекомендательные письма, экспертные заключения и сертификаты" hint="Перечислите документы и добавьте ссылки на них, если они есть." value={data.confirmation_documents} onChange={(value) => updateApplication("confirmation_documents", value)} />
          <TextAreaField label="Научное руководство, кураторство или сопровождение" hint="Укажите организацию или Ф.И.О., звание и должность специалиста." value={data.scientific_guidance} onChange={(value) => updateApplication("scientific_guidance", value)} />
          <TextAreaField label="Публикации по теме практики" hint="Добавьте ссылки на источники. Если публикаций нет, напишите «Нет»." value={data.publications} onChange={(value) => updateApplication("publications", value)} />
          <TextAreaField label="Педагогические разработки и материалы" hint="Добавьте названия или ссылки, по одной на строку." value={data.pedagogical_developments} onChange={(value) => updateApplication("pedagogical_developments", value)} />
          <TextAreaField label="Видеоматериалы о практике" hint="Добавьте ссылки, если видео есть." value={data.video_materials} onChange={(value) => updateApplication("video_materials", value)} />
          <TextAreaField label="Файлы и ссылки, прикладываемые к заявке" hint="Укажите по одной ссылке на строку." value={practice.materials} onChange={(value) => update("materials", value)} />
        </div>
      </section>

      <section className="practice-application-section">
        <h2>Дополнительная информация</h2>
        <h3>Для повторно заявленных практик</h3>
        <p>Заполните эти поля, если практика ранее была включена в МОП (2025 или 2026 год) и ей уже присвоили уровень. В остальных случаях оставьте их пустыми.</p>
        <div className="practice-application-grid">
          <TextField label="Год участия в МОП" hint="Укажите 2025 или 2026 год." value={data.previous_year} onChange={(value) => updateApplication("previous_year", value)} placeholder="2025 или 2026" />
          <TextField label="Направление МОП" hint="Укажите направление, в которое практика была включена." value={data.previous_direction} onChange={(value) => updateApplication("previous_direction", value)} />
          <TextField label="Название практики в МОП" hint="Укажите название практики, под которым она была включена в МОП." value={data.previous_title} onChange={(value) => updateApplication("previous_title", value)} />
          <SelectField label="Ранее присвоенный уровень становления" hint="Выберите уровень, установленный по итогам предыдущей экспертизы." value={data.previous_level} onChange={(value) => updateApplication("previous_level", value)} options={PRACTICE_LEVELS} />
          <TextAreaField label="Изменения после участия в МОП и присвоения уровня" hint="Опишите новые аспекты или цель, изменения категорий участников, масштаба, средств реализации и результатов." value={data.changes_since_previous} onChange={(value) => updateApplication("changes_since_previous", value)} wide />
        </div>
        <div className="practice-application-grid">
          <YesNoField label="Организация имеет низкие результаты обучения или работает в неблагоприятных социальных условиях" value={data.low_performance_school} onChange={(value) => updateApplication("low_performance_school", value)} />
          <YesNoField label="В организации есть центр образования «Точка роста»" value={data.has_tochka_rosta} onChange={(value) => updateApplication("has_tochka_rosta", value)} />
          <TextAreaField label="Использованные федеральные и региональные цифровые сервисы и ресурсы" hint="Перечислите цифровые сервисы и ресурсы, которые использовались при реализации практики, в том числе рекомендации Министерства просвещения Российской Федерации." value={data.digital_resources} onChange={(value) => updateApplication("digital_resources", value)} wide />
        </div>
      </section>
    </div>
  );
}

export function PracticeApplicationDetails({ practice }) {
  const data = { ...EMPTY_PRACTICE_APPLICATION, ...(practice?.application_data || {}) };
  const address = [data.postal_code, data.street, data.house_number && `д. ${data.house_number}`, data.building && `корп. ${data.building}`]
    .filter(Boolean)
    .join(", ");
  const sections = [
    {
      title: "Организация и масштаб",
      fields: [
        ["Краткое наименование организации", data.short_organization],
        ["Адрес организации", address],
        ["Тип практики", practice?.practice_type],
        ["Уровень распространения практики", practice?.implementation_level],
        ["Уровни образования", data.education_levels],
        ["Группы участников", data.audience_groups],
        ["Масштаб изменений", data.change_scopes],
        ["Ключевые слова", data.keywords],
        ["Материалы на сайте организации", data.organization_url],
      ],
    },
    {
      title: "Ответственные и авторы",
      fields: [
        ["Ответственное лицо", [data.curator_name, data.curator_position].filter(Boolean).join(" · ")],
        ["Авторы", practice?.author_name],
        ["Реализаторы практики", data.implementers],
      ],
    },
    {
      title: "Описание практики",
      fields: [
        ["Актуальность темы", data.relevance],
        ["Проблема", data.problems],
        ["Цель", data.goal],
        ["Задачи", data.tasks],
        ["Основная идея или принцип", data.core_idea],
        ["Технологии, методы и формы работы", data.implementation_methods],
        ["Количественные результаты", data.quantitative_results],
        ["Качественные результаты", data.qualitative_results],
        ["Измерение результатов", data.result_measurement],
        ["Трудности реализации", data.difficulties],
        ["Рекомендации коллегам", data.recommendations],
      ],
    },
    {
      title: "Сопровождение и дополнительные материалы",
      fields: [
        ["Сопровождение, которое готова обеспечить команда", data.support_options],
        ["Подтверждающие документы", data.confirmation_documents],
        ["Научное руководство или сопровождение", data.scientific_guidance],
        ["Публикации", data.publications],
        ["Педагогические разработки", data.pedagogical_developments],
        ["Видеоматериалы", data.video_materials],
        ["Цифровые сервисы и ресурсы", data.digital_resources],
        ["Низкие результаты обучения или неблагоприятные социальные условия", data.low_performance_school === true ? "Да" : data.low_performance_school === false ? "Нет" : ""],
        ["Центр образования «Точка роста»", data.has_tochka_rosta === true ? "Да" : data.has_tochka_rosta === false ? "Нет" : ""],
      ],
    },
  ];

  const hasPreviousApplication = data.is_repeat_application || [
    data.previous_year,
    data.previous_direction,
    data.previous_title,
    data.previous_level,
    data.changes_since_previous,
  ].some((value) => String(value || "").trim());

  if (hasPreviousApplication) {
    sections[3].fields.push(
      ["Предыдущая заявка в МОП", [data.previous_year, data.previous_direction, data.previous_title, data.previous_level].filter(Boolean).join(" · ")],
      ["Изменения после участия в МОП", data.changes_since_previous],
    );
  }

  const hasDetails = sections.some((section) => section.fields.some(([, value]) => Array.isArray(value) ? value.length > 0 : Boolean(value)));
  if (!hasDetails) return null;

  return sections.map((section) => {
    const fields = section.fields
      .map(([label, value]) => [label, Array.isArray(value) ? value.join(", ") : value])
      .filter(([, value]) => Boolean(value));
    if (!fields.length) return null;
    return (
      <section className="practice-detail-section" key={section.title}>
        <h2>{section.title}</h2>
        <dl className="practice-application-detail-list">
          {fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
        </dl>
      </section>
    );
  });
}
