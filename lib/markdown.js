/**
 * @file lib/markdown.js
 * @description Safe Markdown loader, parser, and HTML sanitizer for static pages and guides.
 */

import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

const ALLOWED_TAGS = [
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'p',
  'a',
  'ul',
  'ol',
  'li',
  'b',
  'i',
  'strong',
  'em',
  'strike',
  'code',
  'hr',
  'br',
  'div',
  'table',
  'thead',
  'caption',
  'tbody',
  'tr',
  'th',
  'td',
  'pre',
  'span',
];

const SANITIZE_OPTIONS = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    a: ['href', 'name', 'target', 'rel', 'class'],
    span: ['class'],
    div: ['class'],
    p: ['class'],
    h1: ['class', 'id'],
    h2: ['class', 'id'],
    h3: ['class', 'id'],
    ul: ['class'],
    ol: ['class'],
    li: ['class'],
    table: ['class'],
    th: ['class'],
    td: ['class'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    a: (tagName, attribs) => {
      const isExternal =
        attribs.href && (attribs.href.startsWith('http://') || attribs.href.startsWith('https://'));
      return {
        tagName: 'a',
        attribs: {
          ...attribs,
          ...(isExternal
            ? {
                target: '_blank',
                rel: 'nofollow noopener noreferrer',
              }
            : {}),
        },
      };
    },
  },
};

/**
 * Parses and sanitizes a raw markdown string into secure HTML.
 *
 * @param {string} markdown - Raw markdown text
 * @returns {string} Sanitized HTML safe for rendering
 */
export function renderMarkdown(markdown) {
  if (!markdown || typeof markdown !== 'string') return '';
  const rawHtml = marked.parse(markdown, { gfm: true, breaks: true });
  return sanitizeHtml(rawHtml, SANITIZE_OPTIONS);
}

/**
 * Loads a static content file from the /content directory, parses, and sanitizes it.
 *
 * @param {string} slug - File slug (e.g. 'about', 'contact', 'disclaimer', 'privacy-policy')
 * @returns {{ title: string, html: string } | null}
 */
export function getStaticPageContent(slug) {
  if (!slug || typeof slug !== 'string') return null;

  // Map known short URLs to file names
  const normalizedSlug = slug.toLowerCase();
  const fileNameMap = {
    about: 'about.md',
    contact: 'contact.md',
    disclaimer: 'disclaimer.md',
    privacy: 'privacy-policy.md',
    'privacy-policy': 'privacy-policy.md',
  };

  const fileName = fileNameMap[normalizedSlug];
  if (!fileName) return null;

  const filePath = path.join(process.cwd(), 'content', fileName);
  if (!fs.existsSync(filePath)) return null;

  const rawMarkdown = fs.readFileSync(filePath, 'utf-8');

  // Extract first H1 heading for the page title if present
  let title = 'JivikaHunt';
  const h1Match = rawMarkdown.match(/^#\s+(.+)$/m);
  if (h1Match) {
    title = h1Match[1].trim();
  }

  const html = renderMarkdown(rawMarkdown);

  return {
    title,
    html,
  };
}
