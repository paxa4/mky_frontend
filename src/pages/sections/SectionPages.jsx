import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Footer from "../../components/Footer.jsx";
import { ImcroPage } from "../../components/imcro/ImcroPublicComponents.jsx";
import Header from "../../features/nav/Header.jsx";
import { articleMatchesPublicSection } from "../../features/admin/articlePlacements.js";
import { HubSectionPageLayout } from "../hubs/HubSectionPageLayout.jsx";
import {
  findSectionByPath,
  getSectionBreadcrumbItems,
} from "./sectionStructure.js";

function getSectionArticles(newsItems = [], node) {
  if (!Array.isArray(newsItems)) return [];
  return newsItems
    .filter((item) => item?.title && articleMatchesPublicSection(item, node))
    .slice(0, 12);
}

function getSectionDescription(node) {
  return node.description || "Официальные материалы, документы и навигация по подразделу МКУ ИМЦРО.";
}

function getSectionBreadcrumbs(node) {
  return getSectionBreadcrumbItems(node).map((item) => ({
    label: item.label,
    href: item.to || "",
  }));
}

export function SectionRoutePage({ node, newsItems = [], ...props }) {
  const navigate = useNavigate();
  const articles = getSectionArticles(newsItems, node);
  const parentNode = node.parentPath ? findSectionByPath(node.parentPath) : null;

  useEffect(() => {
    document.title = `${node.title} | МКУ ИМЦРО`;
  }, [node.title]);

  const handleOpenArticle = props.onOpenArticle || ((article) => {
    const slug = article?.slug || article?.id || article?.articleId;
    if (!slug || article.isFallback) return;
    navigate(`/article/${encodeURIComponent(slug)}`, { state: { article } });
    window.scrollTo({ top: 0 });
  });

  return (
    <ImcroPage className="hub-section-page">
      <Header
        currentUser={props.currentUser}
        onGoAuth={props.onGoAuth}
        onGoAdmin={props.onGoAdmin}
        onGoProfile={props.onGoProfile}
      />
      <main className="hub-section-main">
        <HubSectionPageLayout
          title={node.title}
          description={getSectionDescription(node)}
          breadcrumbs={getSectionBreadcrumbs(node)}
          childSections={node.children || []}
          articles={articles}
          parentHref={parentNode?.path || node.rootPath}
          parentTitle={parentNode?.title || node.rootTitle}
          onOpenArticle={handleOpenArticle}
          showArticleList={node.showArticleList !== false}
        />
      </main>
      <Footer />
    </ImcroPage>
  );
}
