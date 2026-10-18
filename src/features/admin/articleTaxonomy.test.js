import test from "node:test";
import assert from "node:assert/strict";

import {
  resolveArticleLocation,
  resolveArticleSectionLabel,
} from "./articleTaxonomy.js";

test("resolves human labels from stored section keys when old records have key-only metadata", () => {
  const article = {
    sections: [{ key: "noko:gia-9", label: "noko:gia-9", path: "noko:gia-9" }],
  };

  assert.equal(resolveArticleSectionLabel(article), "ГИА-9");
  assert.deepEqual(resolveArticleLocation(article), {
    parentLabel: "НОКО",
    parentPath: "/noko/",
    sectionLabel: "ГИА-9",
    sectionPath: "/noko/gia-9/",
  });
});

test("resolves canonical profile section keys to public locations", () => {
  const article = {
    sections: [{
      key: "page:/metodicheskoe-prostranstvo/metodicheskie-materialy/",
      label: "page:/metodicheskoe-prostranstvo/metodicheskie-materialy/",
      path: "page:/metodicheskoe-prostranstvo/metodicheskie-materialy/",
    }],
  };

  assert.equal(resolveArticleSectionLabel(article), "Методические материалы");
  assert.deepEqual(resolveArticleLocation(article), {
    parentLabel: "Методическое пространство",
    parentPath: "/metodicheskoe-prostranstvo/",
    sectionLabel: "Методические материалы",
    sectionPath: "/metodicheskoe-prostranstvo/metodicheskie-materialy/",
  });
});

test("maps legacy methodika sections to the real public materials page", () => {
  const article = {
    sections: [{ key: "methodika_section:rekomendacii", label: "Рекомендации", path: "Рекомендации" }],
  };

  assert.deepEqual(resolveArticleLocation(article), {
    parentLabel: "Методическое пространство",
    parentPath: "/metodicheskoe-prostranstvo/",
    sectionLabel: "Методические материалы",
    sectionPath: "/metodicheskoe-prostranstvo/metodicheskie-materialy/",
  });
});

test("prefers a concrete public page over a parent methodika section", () => {
  const article = {
    sections: [
      { key: "methodika:root", label: "Методическое пространство", path: "Методическое пространство" },
      {
        key: "page:/metodicheskoe-prostranstvo/metodicheskie-materialy/",
        label: "Методические материалы",
        path: "Методическое пространство / Профильные страницы / Методические материалы",
      },
    ],
  };

  assert.deepEqual(resolveArticleLocation(article), {
    parentLabel: "Методическое пространство",
    parentPath: "/metodicheskoe-prostranstvo/",
    sectionLabel: "Методические материалы",
    sectionPath: "/metodicheskoe-prostranstvo/metodicheskie-materialy/",
  });
});

test("prefers a concrete legacy section over unrelated root sections", () => {
  const article = {
    sections: [
      { key: "domu:root", label: "Дом учителя", path: "Дом учителя" },
      { key: "noko:root", label: "НОКО", path: "НОКО" },
      { key: "noko:gia-11", label: "ГИА-11", path: "НОКО / ГИА-11" },
      { key: "events", label: "Мероприятия", path: "Мероприятия" },
      { key: "domu:master-klassy", label: "Мастер-классы", path: "Дом учителя / Мастер-классы" },
    ],
  };

  assert.deepEqual(resolveArticleLocation(article), {
    parentLabel: "НОКО",
    parentPath: "/noko/",
    sectionLabel: "ГИА-11",
    sectionPath: "/noko/gia-11/",
  });
});
