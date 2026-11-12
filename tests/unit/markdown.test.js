import { describe, it, expect } from 'vitest';
import { renderMarkdown, getStaticPageContent } from '@/lib/markdown';

describe('Markdown & Static Content Pipeline (lib/markdown.js)', () => {
  it('should parse markdown into formatted HTML', () => {
    const md = '## Welcome to JivikaHunt\n\nThis is a **clean** job board for freshers.';
    const html = renderMarkdown(md);

    expect(html).toContain('<h2>Welcome to JivikaHunt</h2>');
    expect(html).toContain('<strong>clean</strong>');
  });

  it('should strip malicious script and iframe injections', () => {
    const malicious = `
# Safe Title
<script>alert("hacked")</script>
<iframe src="https://evil.com"></iframe>
<img src="x" onerror="alert(1)" />
<p>Normal text</p>
    `;
    const html = renderMarkdown(malicious);

    expect(html).not.toContain('<script');
    expect(html).not.toContain('<iframe');
    expect(html).not.toContain('onerror');
    expect(html).toContain('Safe Title');
    expect(html).toContain('Normal text');
  });

  it('should add nofollow noopener noreferrer and target _blank to external links', () => {
    const md = '[External Site](https://example.com/apply)';
    const html = renderMarkdown(md);

    expect(html).toContain('href="https://example.com/apply"');
    expect(html).toContain('rel="nofollow noopener noreferrer"');
    expect(html).toContain('target="_blank"');
  });

  it('should load and sanitize static pages from /content', () => {
    const aboutPage = getStaticPageContent('about');
    expect(aboutPage).not.toBeNull();
    expect(aboutPage.title).toBe('About JivikaHunt');
    expect(aboutPage.html).toContain('JivikaHunt');

    const contactPage = getStaticPageContent('contact');
    expect(contactPage).not.toBeNull();
    expect(contactPage.title).toBe('Contact Us');

    const disclaimerPage = getStaticPageContent('disclaimer');
    expect(disclaimerPage).not.toBeNull();
    expect(disclaimerPage.title).toBe('Disclaimer');

    const privacyPage = getStaticPageContent('privacy');
    expect(privacyPage).not.toBeNull();
    expect(privacyPage.title).toBe('Privacy Policy');
    expect(privacyPage.html).toContain('Google AdSense');
  });

  it('should return null for non-existent static page slugs', () => {
    const nonExistent = getStaticPageContent('non-existent-page-xyz');
    expect(nonExistent).toBeNull();
  });
});
