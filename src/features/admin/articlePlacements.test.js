import test from "node:test";
import assert from "node:assert/strict";

import {
  applyArticleSectionSelection,
  articleMatchesPublicSection,
  buildArticleSectionTree,
  filterArticleSectionTree,
  flattenArticleSections,
  getArticleSectionSelection,
  publicPathFromArticleSectionKey,
  sectionChipsFromKeys,
} from "./articlePlacements.js";
import { findSectionByPath } from "../../pages/sections/sectionStructure.js";

test("builds a searchable tree with full section paths", () => {
  const flat = flattenArticleSections(buildArticleSectionTree());
  const nokoGia = flat.find((section) => section.key === "page:/noko/gia-9/");

  assert.equal(nokoGia.path, "/noko/gia-9/");
  assert.equal(nokoGia.label, "ГИА 9 класс");
  assert.ok(flat.some((section) => section.key === "page:/noko/gia-9/normativnye-dokumenty/"));
  assert.ok(flat.some((section) => section.key === "page:/obrazovatelnye-sobytiya/"));
  assert.ok(flat.some((section) => section.key === "page:/bezopasnost/"));
  assert.ok(!flat.some((section) => section.key === "noko:gia-9"));
  assert.ok(!flat.some((section) => section.key === "events"));
});

test("maps every generic profile placement to a real public page", () => {
  const flat = flattenArticleSections(buildArticleSectionTree());
  const genericPages = flat.filter((section) => section.key.startsWith("page:"));

  assert.ok(genericPages.length > 0);
  for (const section of genericPages) {
    assert.equal(publicPathFromArticleSectionKey(section.key), section.path);
    if (section.path !== "/bezopasnost/") {
      assert.ok(findSectionByPath(section.path), `${section.path} exists in the public section tree`);
    }
  }
});

test("uses canonical public paths for profile sections", () => {
  const flat = flattenArticleSections(buildArticleSectionTree());
  const methodical = flat.find((section) => section.key === "page:/metodicheskoe-prostranstvo/metodicheskie-materialy/");

  assert.equal(methodical.label, "Методические материалы");

  const next = applyArticleSectionSelection({}, [methodical.key]);
  assert.equal(next.sections[0].root, "page");
  assert.equal(next.sections[0].value, "/metodicheskoe-prostranstvo/metodicheskie-materialy/");
});

test("derives selected sections from legacy article fields", () => {
  const selection = getArticleSectionSelection({
    noko_section: "gia-9",
    duplicate_to_events: true,
  });

  assert.deepEqual(selection, ["page:/noko/gia-9/", "page:/obrazovatelnye-sobytiya/"]);
});

test("preserves legacy placements alongside stored section keys", () => {
  assert.deepEqual(getArticleSectionSelection({
    sections: [{ key: "page:/noko/gia-9/" }],
    noko_section: "gia-9",
    duplicate_to_events: true,
  }), ["page:/noko/gia-9/", "page:/obrazovatelnye-sobytiya/"]);
});

test("applies multiple selected sections without duplicating keys", () => {
  const next = applyArticleSectionSelection(
    { title: "Материал", publishing_scope: "imcro_only" },
    ["page:/noko/gia-9/", "page:/noko/gia-11/", "page:/noko/gia-9/", "events"],
  );

  assert.deepEqual(next.sections.map((section) => section.key), [
    "page:/noko/gia-9/",
    "page:/noko/gia-11/",
    "page:/obrazovatelnye-sobytiya/",
  ]);
  assert.equal(next.noko_section, "");
  assert.equal(next.duplicate_to_events, false);
  assert.equal(next.duplicate_to_main, false);
});

test("uses both publication scopes for mixed Dom teacher and IMCRO placement", () => {
  const next = applyArticleSectionSelection(
    { publishing_scope: "imcro_only" },
    ["domu:master-klassy", "page:/noko/gia-9/"],
  );

  assert.equal(next.publishing_scope, "both");
  assert.equal(next.dom_uchitelya_section, "master-klassy");
  assert.equal(next.noko_section, "");
});

test("returns compact chips with full paths and overflow count", () => {
  const chips = sectionChipsFromKeys(["noko:gia-9", "noko:gia-11", "events", "home"], 2);

  assert.deepEqual(chips.visible.map((chip) => chip.label), ["НОКО / ГИА 9 класс", "НОКО / ГИА 11 (12) класс"]);
  assert.equal(chips.hiddenCount, 2);
});

test("marks parent branches as indeterminate when only a child is selected", () => {
  const tree = buildArticleSectionTree();
  const nokoRoot = tree.find((section) => section.key === "noko:root");

  assert.equal(nokoRoot, undefined);
});

test("filters section tree by query while preserving parent context", () => {
  const filtered = filterArticleSectionTree(buildArticleSectionTree(), "ГИА 9");

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].key, "profile-pages:root");
  assert.deepEqual(filtered[0].children.map((child) => child.label), ["НОКО"]);
  assert.equal(filtered[0].children[0].children[0].key, "page:/noko/gia-9/");
});

test("matches an article in every selected public section", () => {
  const nodes = flattenArticleSections(buildArticleSectionTree());
  const article = {
    sectionPath: "/noko/gia-9/",
    parentPath: "/noko/",
    sections: [
      { key: "page:/noko/gia-9/" },
      { key: "page:/obrazovatelnye-sobytiya/konferencii-rao/" },
    ],
  };

  assert.equal(articleMatchesPublicSection(article, nodes.find((node) => node.path === "/noko/gia-9/")), true);
  assert.equal(articleMatchesPublicSection(article, nodes.find((node) => node.path === "/obrazovatelnye-sobytiya/konferencii-rao/")), true);
});

test("keeps legacy event placements visible in the events section", () => {
  assert.equal(articleMatchesPublicSection({ duplicate_to_events: true }, {
    path: "/obrazovatelnye-sobytiya/",
    level: 1,
  }), true);
});

test("matches multi-placement methodika and legacy contest sections on their public pages", () => {
  const article = {
    sections: [
      { key: "methodika_subject:Астрономия" },
      { key: "konkursy:students" },
      { key: "page:/bezopasnost/" },
    ],
  };

  assert.equal(articleMatchesPublicSection(article, { path: "/metodika/astronomiya/" }), true);
  assert.equal(articleMatchesPublicSection(article, { path: "/konkursy/", level: 1 }), true);
  assert.equal(articleMatchesPublicSection(article, { path: "/bezopasnost/" }), true);
});

test("hides non-publishable profile branches from methodists", () => {
  const flat = flattenArticleSections(buildArticleSectionTree({ methodikaOnly: true }));
  assert.ok(flat.some((section) => section.key.startsWith("methodika_subject:")));
  assert.ok(!flat.some((section) => section.key.startsWith("page:/metodicheskoe-prostranstvo/")));
});
