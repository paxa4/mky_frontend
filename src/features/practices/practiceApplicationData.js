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

export const PRACTICE_DESCRIPTION_FIELDS = [
  ["Актуальность", "relevance"],
  ["Проблема", "problems"],
  ["Цель", "goal"],
  ["Задачи", "tasks"],
  ["Основная идея", "core_idea"],
  ["Средства реализации", "implementation_methods"],
  ["Способы измерения результатов", "result_measurement"],
  ["Трудности реализации", "difficulties"],
  ["Практические рекомендации", "recommendations"],
];

export function derivePracticeFields(applicationData = {}) {
  const data = { ...EMPTY_PRACTICE_APPLICATION, ...applicationData };
  const description = PRACTICE_DESCRIPTION_FIELDS
    .filter(([, key]) => String(data[key] || "").trim())
    .map(([label, key]) => `${label}:\n${String(data[key]).trim()}`)
    .join("\n\n");
  const results = [data.quantitative_results, data.qualitative_results]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join("\n\n");

  return {
    summary: String(data.relevance || "").trim().slice(0, 1200),
    description,
    results,
    target_audience: Array.isArray(data.audience_groups) ? data.audience_groups.join(", ") : "",
  };
}
