import { Marked } from './vendor/marked.js';

const escape = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

export function renderDocument(markdown) {
  let section = 0;
  const headings = [];
  const parser = new Marked({ gfm: true, breaks: true });
  parser.use({ renderer: {
    heading({ tokens, depth }) {
      const labelHtml = this.parser.parseInline(tokens);
      const label = labelHtml.replace(/<[^>]*>/g, '');
      const episode = label.match(/^第(\d+)集/);
      const id = episode ? `episode-${episode[1]}` : `section-${++section}`;
      if (depth <= 2) headings.push({ id, label, episode: Boolean(episode) });
      return `<h${depth} id="${id}">${labelHtml}</h${depth}>\n`;
    }
  } });
  // Markdown inside native details blocks needs its own parsing pass.
  const pattern = /<details(?:\s[^>]*)?>\s*<summary[^>]*>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/gi;
  let html = '', cursor = 0;
  for (const match of markdown.matchAll(pattern)) {
    html += parser.parse(markdown.slice(cursor, match.index));
    html += `<details><summary>${escape(match[1].trim())}</summary><div class="detail-content">${parser.parse(match[2])}</div></details>\n`;
    cursor = match.index + match[0].length;
  }
  html += parser.parse(markdown.slice(cursor));
  const navigation = headings.map(item => `<a class="${item.episode ? 'episode' : 'section'}-link" href="#${item.id}">${escape(item.label)}</a>`).join('\n');
  return { html, navigation, headings };
}
