import { execFileSync } from 'node:child_process';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const ROBOTS_PATH = path.join(ROOT_DIR, 'robots.txt');
const SITEMAP_PATH = path.join(ROOT_DIR, 'sitemap.xml');
const SKIP_DIRS = new Set(['.git', '.github', 'node_modules']);

async function collectHtmlFiles(dirPath) {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) {
      continue;
    }

    const entryPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...await collectHtmlFiles(entryPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(entryPath);
    }
  }

  return files.sort();
}

function extractCanonicalUrl(html) {
  const linkTags = html.match(/<link\b[^>]*>/gi) || [];

  for (const tag of linkTags) {
    const attributes = new Map();

    for (const match of tag.matchAll(/([^\s=/>]+)\s*=\s*(['"])(.*?)\2/g)) {
      attributes.set(match[1].toLowerCase(), match[3]);
    }

    const relValue = attributes.get('rel');
    if (!relValue) {
      continue;
    }

    const relTokens = relValue.toLowerCase().split(/\s+/);
    if (!relTokens.includes('canonical')) {
      continue;
    }

    const hrefValue = attributes.get('href');
    if (hrefValue) {
      return hrefValue.trim();
    }
  }

  return null;
}

async function getLastModified(filePath) {
  const relativePath = path.relative(ROOT_DIR, filePath);

  try {
    const committedDate = execFileSync(
      'git',
      ['log', '-1', '--format=%cs', '--', relativePath],
      { cwd: ROOT_DIR, encoding: 'utf8' }
    ).trim();

    if (committedDate) {
      return committedDate;
    }
  } catch {}

  const fileStats = await stat(filePath);
  return fileStats.mtime.toISOString().slice(0, 10);
}

function escapeXml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function buildSitemap(pages) {
  const urlEntries = pages.map(({ loc, lastmod }) => [
    '  <url>',
    `    <loc>${escapeXml(loc)}</loc>`,
    `    <lastmod>${escapeXml(lastmod)}</lastmod>`,
    '  </url>',
  ].join('\n')).join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urlEntries,
    '</urlset>',
    '',
  ].join('\n');
}

async function writeIfChanged(filePath, nextContent) {
  let currentContent = null;

  try {
    currentContent = await readFile(filePath, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  if (currentContent !== nextContent) {
    await writeFile(filePath, nextContent, 'utf8');
  }
}

async function updateRobotsTxt(baseUrl) {
  const sitemapLine = `Sitemap: ${baseUrl}/sitemap.xml`;
  const robotsContent = await readFile(ROBOTS_PATH, 'utf8');
  const filteredLines = robotsContent
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((line) => !/^Sitemap:\s+/i.test(line));

  while (filteredLines.length > 0 && filteredLines.at(-1) === '') {
    filteredLines.pop();
  }

  filteredLines.push('', sitemapLine);
  await writeIfChanged(ROBOTS_PATH, `${filteredLines.join('\n')}\n`);
}

async function main() {
  const htmlFiles = await collectHtmlFiles(ROOT_DIR);
  const pages = [];
  let siteOrigin = null;

  for (const filePath of htmlFiles) {
    const html = await readFile(filePath, 'utf8');
    const canonicalUrl = extractCanonicalUrl(html);

    if (!canonicalUrl) {
      console.warn(`Skipping ${path.relative(ROOT_DIR, filePath)} because it has no canonical URL.`);
      continue;
    }

    const url = new URL(canonicalUrl);
    if (siteOrigin && url.origin !== siteOrigin) {
      throw new Error(`Canonical URL host mismatch in ${path.relative(ROOT_DIR, filePath)}: ${canonicalUrl}`);
    }

    siteOrigin = siteOrigin || url.origin;
    pages.push({
      loc: url.toString(),
      lastmod: await getLastModified(filePath),
    });
  }

  if (pages.length === 0 || !siteOrigin) {
    throw new Error('No canonical URLs found in HTML files.');
  }

  pages.sort((left, right) => left.loc.localeCompare(right.loc));

  await writeIfChanged(SITEMAP_PATH, buildSitemap(pages));
  await updateRobotsTxt(siteOrigin);

  console.log(`Generated sitemap.xml with ${pages.length} URL(s).`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
