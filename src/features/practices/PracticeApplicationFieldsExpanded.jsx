import {
  PRACTICE_AUDIENCE_GROUPS,
  PRACTICE_ADMIN_LEVELS,
  PRACTICE_CHANGE_SCOPES,
  PRACTICE_EDUCATION_LEVELS,
  PRACTICE_IMPLEMENTATION_LEVELS,
  PRACTICE_LEVEL_DESCRIPTIONS,
  PRACTICE_SUPPORT_OPTIONS,
  PRACTICE_TOPICS,
  PRACTICE_TYPES,
} from "./practiceTaxonomyExpanded.js";
import "./PracticeApplicationFieldsExpanded.css";

export const EMPTY_PRACTICE_APPLICATION = {
  short_organization: "",
  postal_code: "",
  street: "",
  house_number: "",
  building: "",
  organization_url: "",
  curator_name: "",
  curator_position: "",
  curator_work_phone: "",
  curator_email: "",
  curator_mobile: "",
  implementers: "",
  keywords: "",
  education_levels: [],
  audience_groups: [],
  change_scopes: [],
  relevance: "",
  problems: "",
  goal: "",
  tasks: "",
  core_idea: "",
  implementation_methods: "",
  quantitative_results: "",
  qualitative_results: "",
  result_measurement: "",
  difficulties: "",
  recommendations: "",
  support_options: [],
  confirmation_documents: "",
  scientific_guidance: "",
  publications: "",
  pedagogical_developments: "",
  video_materials: "",
  is_repeat_application: false,
  previous_year: "",
  previous_direction: "",
  previous_title: "",
  previous_level: "",
  changes_since_previous: "",
  low_performance_school: null,
  has_tochka_rosta: null,
  digital_resources: "",
};

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
        {options.map((option) => (
          <label className="practice-application-option" key={option}>
            <input
              type="checkbox"
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
  const updateApplication = (key, value) => update("application_data", { ...data, [key]: value });

  return (
    <div className="practice-application">
      <section className="practice-application-section">
        <h2>Организация и место реализации</h2>
        <p>Укажите территорию и адрес образовательной организации, где реализуется практика. Точку реализации отметьте отдельно на карте ниже.</p>
        <div className="practice-application-grid">
          <TextField label="Территория реализации (муниципальный округ)" value={practice.municipality} onChange={(value) => update("municipality", value)} required={required} />
          <TextField label="Полное наименование образовательной организации по уставу" value={practice.organization} onChange={(value) => update("organization", value)} required={required} />
          <TextField label="Краткое наименование образовательной организации по уставу" value={data.short_organization} onChange={(value) => updateApplication("short_organization", value)} required={required} />
          <TextField label="Почтовый индекс" hint="Например: 663705" value={data.postal_code} onChange={(value) => updateApplication("postal_code", value)} required={required} />
          <TextField label="Улица" hint="Введите название без слов «ул.», «проспект», «переулок» и подобных сокращений." value={data.street} onChange={(value) => updateApplication("street", value)} required={required} />
          <TextField label="Номер дома" value={data.house_number} onChange={(value) => updateApplication("house_number", value)} required={required} />
          <TextField label="Строение или корпус" value={data.building} onChange={(value) => updateApplication("building", value)} />
          <TextField label="Период реализации практики" hint="Например: сентябрь 2025 — май 2026." value={practice.implementation_period} onChange={(value) => update("implementation_period", value)} />
          <TextField label="Ссылка на материалы на сайте организации" hint="Вставьте полный адрес страницы, начиная с https://" type="url" value={data.organization_url} onChange={(value) => updateApplication("organization_url", value)} required={required} wide />
        </div>
      </section>

      <section className="practice-application-section">
        <h2>Вид, направление и масштаб</h2>
        <p>Территориальный уровень показывает масштаб реализации. Уровень становления практика получает по итогам экспертизы.</p>
        <div className="practice-application-grid">
          <SelectField label="Тип практики" value={practice.practice_type} onChange={(value) => update("practice_type", value)} options={PRACTICE_TYPES} required={required} />
          <SelectField label="Направление практики" value={practice.topic} onChange={(value) => update("topic", value)} options={topicOptions} required={required} />
          <SelectField label="Территориальный уровень реализации" hint="Выберите один вариант: уровень организации, муниципалитета, региона или страны." value={practice.implementation_level} onChange={(value) => update("implementation_level", value)} options={PRACTICE_IMPLEMENTATION_LEVELS} required={required} />
          {isAdmin ? (
            <SelectField label="Уровень становления практики" hint={PRACTICE_LEVEL_DESCRIPTIONS[practice.level] || "Уровень присваивается по итогам экспертизы."} value={practice.level} onChange={(value) => update("level", value)} options={PRACTICE_ADMIN_LEVELS} />
          ) : (
            <div className="practice-application-note"><strong>Уровень становления практики</strong><span>Будет определён экспертами по итогам экспертизы.</span></div>
          )}
          <TextField label="Ключевые слова" hint="Перечислите через запятую." value={data.keywords} onChange={(value) => updateApplication("keywords", value)} required={required} wide />
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
          <TextField label="Ф.И.О. ответственного лица" value={data.curator_name} onChange={(value) => updateApplication("curator_name", value)} required={required} />
          <TextField label="Должность ответственного лица" value={data.curator_position} onChange={(value) => updateApplication("curator_position", value)} required={required} />
          <TextField label="Рабочий телефон с кодом" hint="Например: 8 (3952) 00-00-00." value={data.curator_work_phone} onChange={(value) => updateApplication("curator_work_phone", value)} required={required} />
          <TextField label="Электронная почта ответственного лица" hint="Несколько адресов разделите точкой с запятой." value={data.curator_email} onChange={(value) => updateApplication("curator_email", value)} required={required} />
          <TextField label="Мобильный телефон" hint="Укажите, если удобно связаться по мобильному." value={data.curator_mobile} onChange={(value) => updateApplication("curator_mobile", value)} />
          <TextField label="Ф.И.О. автора или авторов практики" value={practice.author_name} onChange={(value) => update("author_name", value)} required={required} />
          <TextAreaField label="Ф.И.О. реализаторов практики" hint="Перечислите участников команды, реализующей практику." value={data.implementers} onChange={(value) => updateApplication("implementers", value)} required={required} wide rows={3} />
        </div>
      </section>

      <section className="practice-application-section">
        <h2>Описание практики</h2>
        <p>Опишите, какую проблему решает практика, как она устроена, какие результаты даёт и как их можно проверить.</p>
        <div className="practice-application-grid">
          <TextAreaField label="Актуальность темы" value={data.relevance} onChange={(value) => updateApplication("relevance", value)} required={required} wide />
          <TextAreaField label="Проблема, на решение которой направлена практика" value={data.problems} onChange={(value) => updateApplication("problems", value)} required={required} wide />
          <TextAreaField label="Цель практики" value={data.goal} onChange={(value) => updateApplication("goal", value)} required={required} />
          <TextAreaField label="Задачи практики" value={data.tasks} onChange={(value) => updateApplication("tasks", value)} required={required} />
          <TextAreaField label="Основная идея, суть или базовый принцип" value={data.core_idea} onChange={(value) => updateApplication("core_idea", value)} required={required} wide />
          <TextAreaField label="Средства реализации: технологии, методы и формы работы" value={data.implementation_methods} onChange={(value) => updateApplication("implementation_methods", value)} required={required} wide />
          <TextAreaField label="Количественные результаты" hint="Укажите измеримые показатели и их значения." value={data.quantitative_results} onChange={(value) => updateApplication("quantitative_results", value)} required={required} />
          <TextAreaField label="Качественные результаты" hint="Опишите изменения в знаниях, навыках или организации работы, в том числе отзывы участников." value={data.qualitative_results} onChange={(value) => updateApplication("qualitative_results", value)} required={required} />
          <TextAreaField label="Как измерялись результаты" value={data.result_measurement} onChange={(value) => updateApplication("result_measurement", value)} required={required} wide />
          <TextAreaField label="Трудности при реализации" value={data.difficulties} onChange={(value) => updateApplication("difficulties", value)} required={required} wide />
          <TextAreaField label="Практические рекомендации заинтересовавшимся коллегам" value={data.recommendations} onChange={(value) => updateApplication("recommendations", value)} required={required} wide />
        </div>
        <MultiChoice label="Какое сопровождение готова обеспечить команда" hint="Можно выбрать несколько вариантов." options={PRACTICE_SUPPORT_OPTIONS} value={data.support_options} onChange={(value) => updateApplication("support_options", value)} />
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
        <label className="practice-application-option practice-application-repeat">
          <input type="checkbox" checked={Boolean(data.is_repeat_application)} onChange={(event) => updateApplication("is_repeat_application", event.target.checked)} />
          <span>Практика заявлялась ранее и получила уровень становления</span>
        </label>
        {data.is_repeat_application && (
          <div className="practice-application-grid">
            <TextField label="Год предыдущей заявки" value={data.previous_year} onChange={(value) => updateApplication("previous_year", value)} placeholder="Например: 2025" />
            <TextField label="Предыдущее направление" value={data.previous_direction} onChange={(value) => updateApplication("previous_direction", value)} />
            <TextField label="Предыдущее название практики" value={data.previous_title} onChange={(value) => updateApplication("previous_title", value)} />
            <SelectField label="Ранее присвоенный уровень становления" value={data.previous_level} onChange={(value) => updateApplication("previous_level", value)} options={PRACTICE_LEVELS} />
            <TextAreaField label="Что изменилось в практике с момента предыдущей экспертизы" hint="Например: цель, участники, масштаб, способы реализации или результаты." value={data.changes_since_previous} onChange={(value) => updateApplication("changes_since_previous", value)} wide />
          </div>
        )}
        <div className="practice-application-grid">
          <YesNoField label="Организация имеет низкие результаты обучения или работает в неблагоприятных социальных условиях" value={data.low_performance_school} onChange={(value) => updateApplication("low_performance_school", value)} />
          <YesNoField label="В организации есть центр образования «Точка роста»" value={data.has_tochka_rosta} onChange={(value) => updateApplication("has_tochka_rosta", value)} />
          <TextAreaField label="Использованные федеральные и региональные цифровые сервисы и ресурсы" value={data.digital_resources} onChange={(value) => updateApplication("digital_resources", value)} wide />
        </div>
      </section>
    </div>
  );
}
