#!/usr/bin/env node
// scrape.js — crawls aisi.gov.uk/research and writes papers.json
// Node 18+ required (uses built-in fetch). No npm install needed.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const LISTING_URL = 'https://www.aisi.gov.uk/research';
const OUTPUT_FILE = path.join(__dirname, 'papers.json');
const LOG_FILE = path.join(__dirname, '.scrape-log');
const DELAY_MS = 500;

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const check = args.includes('--check');
const silent = args.includes('--silent');

function log(...msgs) {
  if (!silent) console.log(...msgs);
}

function logError(...msgs) {
  // Always print errors regardless of --silent
  console.error(...msgs);
}

function getArgValue(argList, flag, defaultVal) {
  const i = argList.indexOf(flag);
  if (i !== -1 && argList[i + 1] !== undefined) {
    const v = parseFloat(argList[i + 1]);
    return isNaN(v) ? defaultVal : v;
  }
  return defaultVal;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// --check: skip if papers.json is younger than threshold
if (check) {
  const maxAgeDays = getArgValue(args, '--days', 7);
  try {
    const existing = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
    const ageDays = (Date.now() - new Date(existing.scraped_at).getTime())
                    / (1000 * 60 * 60 * 24);
    if (ageDays < maxAgeDays) {
      if (!silent) console.log(
        `papers.json is ${ageDays.toFixed(1)} days old — skipping (threshold: ${maxAgeDays}d)\n` +
        `Run without --check to force a rescrape.`
      );
      process.exit(0);
    }
  } catch {
    // papers.json missing or unreadable — fall through and scrape
  }
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'AISI-altmetric-scraper/1.0 (internal research tool)' }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

function extractEntryLinks(html) {
  // Handles both absolute and relative hrefs
  const absolute = [...html.matchAll(/href="(https:\/\/www\.aisi\.gov\.uk\/research\/[^"\/]+)"/g)]
    .map(m => m[1]);
  const relative = [...html.matchAll(/href="(\/research\/[^"\/]+)"/g)]
    .map(m => `https://www.aisi.gov.uk${m[1]}`);
  const all = [...absolute, ...relative];
  return all.filter((v, i, a) => a.indexOf(v) === i); // deduplicate
}

function extractTitle(html) {
  const m = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  return m ? m[1].trim() : null;
}

function extractReportUrl(html) {
  // The link text may be in a nested element inside <a>:
  //   <a href="..."><div>Read the full report</div></a>
  // Match href then allow inner tags before the text, and also try reverse order.
  const m = html.match(/href="([^"]+)"[^>]*>(?:<[^>]*>)*\s*Read the full report/i)
           || html.match(/Read the full report[\s\S]{0,200}?href="([^"]+)"/i);
  return m ? m[1].trim() : null;
}

function extractArxivId(url) {
  const m = url.match(/arxiv\.org\/abs\/([^\s"?#]+)/i);
  return m ? m[1] : null;
}

function extractCategory(html) {
  // Category is in: <div class="padding-xxs"><div>CATEGORY</div></div> inside category-row
  // Fallback: linked category tag
  const rowMatch = html.match(/class="padding-xxs"[^>]*>\s*<div>([^<]+)<\/div>/i);
  if (rowMatch) return rowMatch[1].trim();
  const linked = html.match(/category\/[^"]+">([^<]+)<\/a>/i);
  return linked ? linked[1].trim() : null;
}

function extractDate(html) {
  const m = html.match(/<div[^>]*>\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4})\s*<\/div>/i);
  return m ? m[1].trim() : null;
}

async function scrapePage(url) {
  let html;
  try {
    html = await fetchHtml(url);
  } catch (err) {
    return { url, error: err.message, type: 'error' };
  }

  const title = extractTitle(html);
  const reportUrl = extractReportUrl(html);
  const category = extractCategory(html);
  const publishedDate = extractDate(html);

  // Treat missing link or placeholder '#' as no_link
  if (!reportUrl || reportUrl === '#') {
    return {
      title,
      aisi_url: url,
      report_url: null,
      type: 'no_link',
      arxiv_id: null,
      category,
      published_date: publishedDate,
    };
  }

  const arxivId = extractArxivId(reportUrl);
  if (arxivId) {
    return {
      title,
      aisi_url: url,
      report_url: reportUrl,
      type: 'arxiv',
      arxiv_id: arxivId,
      category,
      published_date: publishedDate,
    };
  }

  return {
    title,
    aisi_url: url,
    report_url: reportUrl,
    type: 'other',
    arxiv_id: null,
    category,
    published_date: publishedDate,
  };
}

function formatLabel(paper, url) {
  if (paper.type === 'error') return `error: ${paper.error}`;
  if (paper.type === 'no_link') return 'no report link found';
  if (paper.type === 'arxiv') return `arxiv:${paper.arxiv_id}`;
  if (paper.type === 'other') return `other (${paper.report_url})`;
  return '?';
}

async function main() {
  // Read old papers.json before overwriting (for diff)
  let oldArxivIds = new Set();
  let isFirstRun = true;
  try {
    const old = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
    if (old.papers) {
      old.papers.forEach(p => { if (p.arxiv_id) oldArxivIds.add(p.arxiv_id); });
      isFirstRun = false;
    }
  } catch {
    // no existing file — first run
  }

  // Fetch listing page
  log('Fetching AISI research listing...');
  let listingHtml;
  try {
    listingHtml = await fetchHtml(LISTING_URL);
  } catch (err) {
    logError(`Failed to fetch listing page: ${err.message}`);
    process.exit(1);
  }

  const entryLinks = extractEntryLinks(listingHtml);
  log(`Found ${entryLinks.length} research entries`);

  if (dryRun) {
    console.log('\n--dry-run: entry URLs found (not fetching individual pages):');
    entryLinks.forEach(u => console.log(' ', u));
    process.exit(0);
  }

  log('\nScraping individual pages (500ms delay between requests):');

  const papers = [];
  for (let i = 0; i < entryLinks.length; i++) {
    const url = entryLinks[i];
    const paper = await scrapePage(url);
    papers.push(paper);

    const label = formatLabel(paper, url);
    const title = paper.title || url.split('/').pop();
    log(`  [${i + 1}/${entryLinks.length}] ${title} → ${label}`);

    if (i < entryLinks.length - 1) await sleep(DELAY_MS);
  }

  const arxivPapers = papers.filter(p => p.type === 'arxiv');
  const otherPapers = papers.filter(p => p.type === 'other');
  const noLinkPapers = papers.filter(p => p.type === 'no_link');
  const errorPapers = papers.filter(p => p.type === 'error');

  log(`\nDone. ${arxivPapers.length} arXiv papers, ${otherPapers.length} other, ${noLinkPapers.length} no-link${errorPapers.length ? `, ${errorPapers.length} errors` : ''}.`);

  const scrapedAt = new Date().toISOString();
  const output = {
    scraped_at: scrapedAt,
    source_url: LISTING_URL,
    total_found: papers.length,
    papers,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  log(`Wrote papers.json (${papers.length} entries, scraped ${scrapedAt})`);

  // Compute new papers diff
  const newArxivIds = papers
    .filter(p => p.arxiv_id && !oldArxivIds.has(p.arxiv_id))
    .map(p => p.arxiv_id);

  let diffMsg;
  if (isFirstRun) {
    diffMsg = '(first run)';
  } else if (newArxivIds.length === 0) {
    diffMsg = '0 new papers since last run';
  } else {
    diffMsg = `${newArxivIds.length} new papers since last run: ${newArxivIds.join(', ')}`;
  }
  log(diffMsg);

  // Append to .scrape-log
  const logLine = `${scrapedAt}  ${papers.length} papers found  (${arxivPapers.length} arXiv, ${otherPapers.length + noLinkPapers.length} other)  ${isFirstRun ? '(first run)' : `${newArxivIds.length} new since last run`}\n`;
  try {
    fs.appendFileSync(LOG_FILE, logLine);
  } catch (err) {
    logError(`Warning: could not write .scrape-log: ${err.message}`);
  }
}

main().catch(err => {
  logError('Fatal error:', err.message);
  process.exit(1);
});
