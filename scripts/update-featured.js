#!/usr/bin/env node
/**
 * Rotates the featured frame on index.html to the most-viewed video on the
 * page (YouTube Data API v3) and orders each grid's tiles by
 * data-added-date, newest first (tiles without a date keep their relative
 * order at the end).
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

const TILE_RE = /<article class="tile"[\s\S]*?<\/article>|<a class="tile tile-ig"[\s\S]*?<\/a>/g;

async function fetchViewCounts(ids) {
  const counts = new Map();
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const url =
      'https://www.googleapis.com/youtube/v3/videos?part=statistics' +
      `&id=${batch.join(',')}&key=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`YouTube API ${res.status}: ${await res.text()}`);
    const data = await res.json();
    for (const item of data.items || []) {
      counts.set(item.id, Number(item.statistics?.viewCount || 0));
    }
  }
  return counts;
}

function updateFeatured(html, id) {
  const tile = (html.match(TILE_RE) || []).find((t) => t.includes(`data-video="${id}"`));
  // No grid tile for this id (e.g. it is already the featured-only video):
  // leave the featured frame as-is.
  if (!tile) return html;

  const attr = (re, fallback) => (tile.match(re) || [, fallback])[1];
  const dataTitle = attr(/data-title="([^"]*)"/, '');
  const title = attr(/<h3 class="tile-title">([\s\S]*?)<\/h3>/, dataTitle.toUpperCase());
  const client = attr(/<p class="tile-client">([\s\S]*?)<\/p>/, '');
  const thumb = attr(/img src="([^"]+)"/, `https://img.youtube.com/vi/${id}/maxresdefault.jpg`);

  return html.replace(
    /(<div class="featured" data-video=")[^"]*(" data-title=")[^"]*("[\s\S]*?<img src=")[^"]*(" alt=")[^"]*("[\s\S]*?<div class="featured-kicker">)[^<]*(<\/div>\s*<div class="featured-title">)[^<]*(<\/div>)/,
    (_, g1, g2, g3, g4, g5, g6, g7) =>
      g1 + id + g2 + dataTitle + g3 + thumb + g4 + dataTitle + g5 +
      'FEATURED — ' + client + g6 + title + g7,
  );
}

function sortGrids(html) {
  return html.replace(/(<div class="grid[^>]*>)([\s\S]*?)(\n  <\/div>)/g, (m, open, inner, close) => {
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
}

(async () => {
  const original = fs.readFileSync(INDEX, 'utf8');
  const ids = [...new Set([...original.matchAll(/data-video="([^"]+)"/g)].map((m) => m[1]))];
  console.log(`Found ${ids.length} video ids`);

  const counts = await fetchViewCounts(ids);
  if (!counts.size) throw new Error('YouTube API returned no statistics');
  const [trendingId, views] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  console.log(`Top video by views: ${trendingId} (${views.toLocaleString()} views)`);

  let html = updateFeatured(original, trendingId);
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
