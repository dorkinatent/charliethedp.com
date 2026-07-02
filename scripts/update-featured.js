#!/usr/bin/env node
/**
 * Rotates the featured frame on index.html to the most-viewed COMMERCIAL
 * video published within the last 6 months (YouTube Data API v3), falling
 * back to the most-viewed commercial of all time if none qualify. Also
 * orders each grid's tiles by data-added-date, newest first (tiles without
 * a date keep their relative order at the end).
 *
 * Note: the public API only exposes cumulative view counts, so "popular in
 * the last 6 months" is approximated as "published in the last 6 months,
 * ranked by total views".
 *
 * Dependency-free: needs Node 18+ (global fetch) and YOUTUBE_API_KEY.
 */
const fs = require('fs');
const path = require('path');

const INDEX = path.join(__dirname, '..', 'index.html');
const API_KEY = process.env.YOUTUBE_API_KEY;
if (!API_KEY) {
  console.error('YOUTUBE_API_KEY is not set');
  process.exit(1);
}

const SIX_MONTHS_MS = 183 * 24 * 60 * 60 * 1000;
const TILE_RE = /<article class="tile"[\s\S]*?<\/article>|<a class="tile tile-ig"[\s\S]*?<\/a>/g;

/** Video ids appearing in the Commercial & Branded section only. */
function commercialIds(html) {
  const start = html.indexOf('COMMERCIAL &amp; BRANDED');
  const end = html.indexOf('FILM &amp; MUSIC');
  if (start === -1) throw new Error('Commercial section heading not found — markup drift?');
  const slice = html.slice(start, end === -1 ? undefined : end);
  return [...new Set([...slice.matchAll(/data-video="([^"]+)"/g)].map((m) => m[1]))];
}

async function fetchVideoData(ids) {
  const data = new Map();
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const url =
      'https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics' +
      `&id=${batch.join(',')}&key=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`YouTube API ${res.status}: ${await res.text()}`);
    const body = await res.json();
    for (const item of body.items || []) {
      data.set(item.id, {
        views: Number(item.statistics?.viewCount || 0),
        publishedAt: Date.parse(item.snippet?.publishedAt || 0) || 0,
      });
    }
  }
  return data;
}

function updateFeatured(html, id) {
  const tile = (html.match(TILE_RE) || []).find((t) => t.includes(`data-video="${id}"`));
  // No grid tile for this id: leave the featured frame as-is.
  if (!tile) return html;

  const attr = (re, fallback) => (tile.match(re) || [, fallback])[1];
  const dataTitle = attr(/data-title="([^"]*)"/, '');
  const title = attr(/<h3 class="tile-title">([\s\S]*?)<\/h3>/, dataTitle.toUpperCase());
  const client = attr(/<p class="tile-client">([\s\S]*?)<\/p>/, '');
  const thumb = attr(/img src="([^"]+)"/, `https://img.youtube.com/vi/${id}/maxresdefault.jpg`);

  let matched = false;
  const out = html.replace(
    /(<div class="featured" data-video=")[^"]*(" data-title=")[^"]*("[\s\S]*?<img src=")[^"]*(" alt=")[^"]*("[\s\S]*?<div class="featured-kicker">)[^<]*(<\/div>\s*<div class="featured-title">)[^<]*(<\/div>)/,
    (_, g1, g2, g3, g4, g5, g6, g7) => {
      matched = true;
      return g1 + id + g2 + dataTitle + g3 + thumb + g4 + dataTitle + g5 +
        'FEATURED — ' + client + g6 + title + g7;
    },
  );
  if (!matched) {
    throw new Error(`Featured frame markup did not match — cannot rotate to ${id}`);
  }
  return out;
}

function sortGrids(html) {
  let grids = 0;
  const out = html.replace(/(<div class="grid[^>]*>)([\s\S]*?)(\n  <\/div>)/g, (m, open, inner, close) => {
    grids++;
    const tiles = inner.match(TILE_RE) || [];
    if (tiles.length < 2) return m;
    const dated = [];
    const undated = [];
    for (const t of tiles) {
      const d = (t.match(/data-added-date="(\d{4}-\d{2}-\d{2})"/) || [])[1];
      if (d) dated.push({ t, d });
      else undated.push(t);
    }
    dated.sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : 0)); // stable: ties keep order
    const sorted = [...dated.map((x) => x.t), ...undated];
    return open + '\n' + sorted.map((t) => '    ' + t).join('\n') + close;
  });
  if (grids === 0) {
    console.warn('sortGrids: no grid blocks matched — markup drift? Grids left unsorted.');
  } else {
    console.log(`Sorted ${grids} grid(s)`);
  }
  return out;
}

(async () => {
  const original = fs.readFileSync(INDEX, 'utf8');
  const ids = commercialIds(original);
  if (!ids.length) throw new Error('No commercial video ids found');
  console.log(`Found ${ids.length} commercial video ids`);

  const stats = await fetchVideoData(ids);
  if (!stats.size) throw new Error('YouTube API returned no statistics');

  const cutoff = Date.now() - SIX_MONTHS_MS;
  let candidates = [...stats.entries()].filter(([, s]) => s.publishedAt >= cutoff);
  if (!candidates.length) {
    console.warn('No commercial published in the last 6 months — falling back to all-time views');
    candidates = [...stats.entries()];
  }
  candidates.sort((a, b) => b[1].views - a[1].views);
  const [featuredId, top] = candidates[0];
  console.log(
    `Featured pick: ${featuredId} (${top.views.toLocaleString()} views, ` +
    `published ${new Date(top.publishedAt).toISOString().slice(0, 10)})`,
  );

  let html = updateFeatured(original, featuredId);
  html = sortGrids(html);

  if (html !== original) {
    fs.writeFileSync(INDEX, html);
    console.log('index.html updated');
  } else {
    console.log('No changes needed');
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
