// src/components/common/SEOHead.jsx
import { useEffect } from "react";

const SEOHead = ({
  title,
  description,
  keywords,
  ogTitle,
  ogDescription,
  ogImage,
  canonical,
  schema,
}) => {
  useEffect(() => {
    const siteName = "DerivX";
    const fullTitle = title ? `${title} | ${siteName}` : siteName;

    // Title
    document.title = fullTitle;

    const setMeta = (name, content, prop = false) => {
      if (!content) return;
      const attr = prop ? "property" : "name";
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    const setLink = (rel, href) => {
      if (!href) return;
      let el = document.querySelector(`link[rel="${rel}"]`);
      if (!el) {
        el = document.createElement("link");
        el.setAttribute("rel", rel);
        document.head.appendChild(el);
      }
      el.setAttribute("href", href);
    };

    setMeta("description", description);
    setMeta("keywords", keywords);

    // Open Graph
    setMeta("og:title",       ogTitle || fullTitle, true);
    setMeta("og:description", ogDescription || description, true);
    setMeta("og:image",       ogImage, true);
    setMeta("og:type",        "website", true);
    setMeta("og:site_name",   siteName, true);

    // Twitter
    setMeta("twitter:card",        "summary_large_image");
    setMeta("twitter:title",       ogTitle || fullTitle);
    setMeta("twitter:description", ogDescription || description);
    setMeta("twitter:image",       ogImage);

    // Canonical
    setLink("canonical", canonical || window.location.href);

    // JSON-LD schema
    const schemaId = "derivx-schema-ld";
    let schemaEl = document.getElementById(schemaId);
    if (schema) {
      if (!schemaEl) {
        schemaEl = document.createElement("script");
        schemaEl.id = schemaId;
        schemaEl.type = "application/ld+json";
        document.head.appendChild(schemaEl);
      }
      schemaEl.textContent = JSON.stringify(schema);
    } else if (schemaEl) {
      schemaEl.remove();
    }
  }, [title, description, keywords, ogTitle, ogDescription, ogImage, canonical, schema]);

  return null;
};

export default SEOHead;