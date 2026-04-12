# Embedded Video Player Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a modal video player to charliethedp.com so YouTube work cards play inline instead of linking out.

**Architecture:** Single-page static HTML site. YouTube cards become `<button>` elements with a `data-youtube-id` attribute. A small vanilla JS handler opens a modal containing a YouTube iframe. Instagram cards remain unchanged (link-outs).

**Tech Stack:** Plain HTML, CSS, vanilla JS. No dependencies. No build step. Repo at `/tmp/charliethedp-setup/` (auto-deploys to GitHub Pages on push).

---

## File Structure

- `index.html` — modify ~61 YouTube work-card markup, add modal markup at end of `<body>`, add inline `<script>` at end of `<body>`
- `style.css` — append modal styles + button-variant work-card rules
- `~/.claude/skills/add-portfolio-item/SKILL.md` — update YouTube card template for future additions

No new files. All changes are additive or in-place.

---

### Task 1: Add modal CSS

**Files:**
- Modify: `/tmp/charliethedp-setup/style.css` (append to end)

- [ ] **Step 1: Append modal styles to style.css**

Append the following block to `/tmp/charliethedp-setup/style.css`:

```css
/* VIDEO MODAL */
.video-modal{position:fixed;inset:0;z-index:1000;display:none;align-items:center;justify-content:center;padding:2rem;opacity:0;transition:opacity .2s ease}
.video-modal.open{display:flex;opacity:1}
.video-modal-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.92);cursor:pointer}
.video-modal-content{position:relative;width:100%;max-width:min(90vw,calc(90vh * 16/9));aspect-ratio:16/9;background:#000;border-radius:4px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.5)}
.video-modal-content iframe{width:100%;height:100%;border:0;display:block}
.video-modal-close{position:absolute;top:-2.5rem;right:0;width:2rem;height:2rem;padding:0;background:transparent;border:0;color:var(--cream);cursor:pointer;display:flex;align-items:center;justify-content:center;opacity:.7;transition:opacity .15s}
.video-modal-close:hover{opacity:1}
.video-modal-close svg{width:100%;height:100%}
body.modal-open{overflow:hidden}

/* Make work-card button variant match anchor variant */
button.work-card{border:0;padding:0;background:transparent;font:inherit;color:inherit;cursor:pointer;text-align:left;width:100%;display:block}
```

- [ ] **Step 2: Verify CSS has no syntax errors**

Open `/tmp/charliethedp-setup/style.css` in a browser via a local file or visual check. No command-line validation needed — the file is small and plain CSS.

- [ ] **Step 3: Commit**

```bash
cd /tmp/charliethedp-setup
git add style.css
git commit -m "Add modal video player styles"
```

---

### Task 2: Convert YouTube work cards from anchors to buttons

**Files:**
- Modify: `/tmp/charliethedp-setup/index.html`

Every YouTube card currently looks like:

```html
<a class="work-card" href="https://www.youtube.com/watch?v=VIDEO_ID" target="_blank" rel="noopener">
  <img class="work-thumb" src="https://img.youtube.com/vi/VIDEO_ID/maxresdefault.jpg" alt="TITLE" loading="lazy">
  <div class="work-overlay"><div class="play-icon"><svg viewBox="0 0 24 24"><polygon points="8,5 19,12 8,19"/></svg></div><h3>TITLE</h3></div>
</a>
```

It must become:

```html
<button class="work-card" data-youtube-id="VIDEO_ID" type="button" aria-label="Play TITLE">
  <img class="work-thumb" src="https://img.youtube.com/vi/VIDEO_ID/maxresdefault.jpg" alt="TITLE" loading="lazy">
  <div class="work-overlay"><div class="play-icon"><svg viewBox="0 0 24 24"><polygon points="8,5 19,12 8,19"/></svg></div><h3>TITLE</h3></div>
</button>
```

Instagram cards (which have `instagram.com` in the `href`) MUST be left unchanged.

- [ ] **Step 1: Write a Python script to perform the conversion**

Create `/tmp/convert_cards.py`:

```python
#!/usr/bin/env python3
"""Convert YouTube <a class="work-card"> tags to <button> tags with data-youtube-id."""
import re
import sys

with open('/tmp/charliethedp-setup/index.html', 'r') as f:
    html = f.read()

# Pattern matches a YouTube work-card opening anchor through to its closing </a>
pattern = re.compile(
    r'<a class="work-card" href="https://www\.youtube\.com/watch\?v=([a-zA-Z0-9_-]+)" target="_blank" rel="noopener">'
    r'(.*?)'
    r'</a>',
    re.DOTALL
)

converted = 0
def replace(match):
    global converted
    video_id = match.group(1)
    inner = match.group(2)
    # Extract title from <h3>...</h3> for aria-label
    title_match = re.search(r'<h3>(.*?)</h3>', inner, re.DOTALL)
    title = title_match.group(1).strip() if title_match else 'video'
    # Unescape common HTML entities for aria-label (keep them in inner content as-is)
    aria = title.replace('&mdash;', '—').replace('&amp;', '&').replace('&nbsp;', ' ')
    converted += 1
    return f'<button class="work-card" data-youtube-id="{video_id}" type="button" aria-label="Play {aria}">{inner}</button>'

new_html = pattern.sub(replace, html)

with open('/tmp/charliethedp-setup/index.html', 'w') as f:
    f.write(new_html)

print(f'Converted {converted} YouTube cards')

# Sanity check: no YouTube anchor tags should remain
remaining = len(re.findall(r'<a class="work-card" href="https://www\.youtube\.com', new_html))
if remaining > 0:
    print(f'ERROR: {remaining} YouTube anchor tags still present')
    sys.exit(1)
```

- [ ] **Step 2: Run the conversion script**

```bash
python3 /tmp/convert_cards.py
```

Expected output: `Converted 61 YouTube cards` (or similar number, matches count of YouTube cards in repo).

- [ ] **Step 3: Verify Instagram cards are untouched**

```bash
grep -c 'instagram.com' /tmp/charliethedp-setup/index.html
```

Expected: `2` (unchanged from before — count Instagram cards before conversion with the same command for comparison).

- [ ] **Step 4: Verify no YouTube anchors remain**

```bash
grep -c '<a class="work-card" href="https://www.youtube.com' /tmp/charliethedp-setup/index.html
```

Expected: `0`

- [ ] **Step 5: Verify YouTube buttons are present**

```bash
grep -c '<button class="work-card" data-youtube-id=' /tmp/charliethedp-setup/index.html
```

Expected: `61` (or the same count as YouTube cards before conversion).

- [ ] **Step 6: Commit**

```bash
cd /tmp/charliethedp-setup
git add index.html
git commit -m "Convert YouTube work cards from anchors to buttons"
```

---

### Task 3: Add modal markup and JavaScript

**Files:**
- Modify: `/tmp/charliethedp-setup/index.html` (insert before `</body>`)

- [ ] **Step 1: Locate the closing `</body>` tag**

```bash
grep -n '</body>' /tmp/charliethedp-setup/index.html
```

Note the line number — the modal markup and script go immediately before this line.

- [ ] **Step 2: Insert modal markup and script before `</body>`**

Use an Edit tool call to insert the following block immediately before the `</body>` line. Replace the existing `</body>` line with:

```html
<!-- VIDEO MODAL -->
<div class="video-modal" id="video-modal" role="dialog" aria-modal="true" aria-hidden="true" aria-label="Video player">
  <div class="video-modal-backdrop" data-modal-close></div>
  <div class="video-modal-content">
    <button class="video-modal-close" type="button" aria-label="Close video" data-modal-close>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
    </button>
    <div class="video-modal-slot"></div>
  </div>
</div>

<script>
(function(){
  var modal = document.getElementById('video-modal');
  var slot = modal.querySelector('.video-modal-slot');
  var lastTrigger = null;

  function open(videoId, trigger){
    lastTrigger = trigger;
    var iframe = document.createElement('iframe');
    iframe.src = 'https://www.youtube.com/embed/' + encodeURIComponent(videoId) + '?autoplay=1&rel=0';
    iframe.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
    iframe.setAttribute('allowfullscreen', '');
    iframe.setAttribute('title', 'YouTube video player');
    slot.appendChild(iframe);
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    var closeBtn = modal.querySelector('.video-modal-close');
    closeBtn.focus();
  }

  function close(){
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    slot.innerHTML = '';
    if (lastTrigger && typeof lastTrigger.focus === 'function') lastTrigger.focus();
    lastTrigger = null;
  }

  document.addEventListener('click', function(e){
    var card = e.target.closest('button.work-card[data-youtube-id]');
    if (card){
      e.preventDefault();
      open(card.getAttribute('data-youtube-id'), card);
      return;
    }
    if (e.target.closest('[data-modal-close]')){
      close();
    }
  });

  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape' && modal.classList.contains('open')) close();
  });
})();
</script>
</body>
```

- [ ] **Step 3: Verify insertion**

```bash
grep -c 'id="video-modal"' /tmp/charliethedp-setup/index.html
```

Expected: `1`

```bash
grep -c 'data-youtube-id' /tmp/charliethedp-setup/index.html
```

Expected: `62` (61 cards + 1 selector in the script).

- [ ] **Step 4: Manual smoke test locally**

```bash
cd /tmp/charliethedp-setup && python3 -m http.server 8000 &
sleep 2
echo "Open http://localhost:8000/ in a browser and verify:"
echo "  1. Click a YouTube card -> modal opens, video autoplays with sound"
echo "  2. Click the X -> modal closes, audio stops"
echo "  3. Click outside the video (backdrop) -> modal closes"
echo "  4. Press Escape while modal open -> modal closes"
echo "  5. Click an Instagram card -> opens Instagram in new tab"
echo "  6. Body doesn't scroll while modal is open"
```

Test in browser, then stop the server:

```bash
pkill -f 'python3 -m http.server 8000'
```

- [ ] **Step 5: Commit**

```bash
cd /tmp/charliethedp-setup
git add index.html
git commit -m "Add modal video player markup and script"
```

---

### Task 4: Push and verify deploy

**Files:** none

- [ ] **Step 1: Push to GitHub**

```bash
cd /tmp/charliethedp-setup
git push origin main
```

- [ ] **Step 2: Watch the deploy**

```bash
gh run list --repo dorkinatent/charliethedp.com --limit 1
```

Note the run ID from the most recent run, then:

```bash
gh run watch <run-id> --repo dorkinatent/charliethedp.com --exit-status
```

Expected: workflow finishes with success status.

- [ ] **Step 3: Verify live site**

Open https://charliethedp.com in a browser. Repeat the manual smoke test from Task 3 Step 4 against the live site.

---

### Task 5: Update the add-portfolio-item skill

**Files:**
- Modify: `/Users/charlieanderson/.claude/skills/add-portfolio-item/SKILL.md`

- [ ] **Step 1: Read the current skill file**

Read `/Users/charlieanderson/.claude/skills/add-portfolio-item/SKILL.md` to find the card template section (around step 4, lines 39-49).

- [ ] **Step 2: Replace the card template section**

The current template reads:

```html
<a class="work-card" href="POST_URL" target="_blank" rel="noopener">
  <img class="work-thumb" src="THUMBNAIL_SRC" alt="TITLE" loading="lazy">
  <div class="work-overlay"><div class="play-icon"><svg viewBox="0 0 24 24"><polygon points="8,5 19,12 8,19"/></svg></div><h3>TITLE</h3></div>
</a>
```

Replace with two templates — one for YouTube, one for other sources:

````markdown
   **For YouTube** (extract VIDEO_ID from the URL — the value after `v=`):
   ```html
   <button class="work-card" data-youtube-id="VIDEO_ID" type="button" aria-label="Play TITLE">
     <img class="work-thumb" src="THUMBNAIL_SRC" alt="TITLE" loading="lazy">
     <div class="work-overlay"><div class="play-icon"><svg viewBox="0 0 24 24"><polygon points="8,5 19,12 8,19"/></svg></div><h3>TITLE</h3></div>
   </button>
   ```

   **For Instagram / Vimeo / TikTok / X** (link-out, unchanged):
   ```html
   <a class="work-card" href="POST_URL" target="_blank" rel="noopener">
     <img class="work-thumb" src="THUMBNAIL_SRC" alt="TITLE" loading="lazy">
     <div class="work-overlay"><div class="play-icon"><svg viewBox="0 0 24 24"><polygon points="8,5 19,12 8,19"/></svg></div><h3>TITLE</h3></div>
   </a>
   ```
````

- [ ] **Step 3: Add a note about the modal**

Under the "Notes" section of the skill file, add:

```markdown
- YouTube cards open in an in-page modal video player (not a new tab). Instagram and other sources still open in a new tab.
```

- [ ] **Step 4: Verify changes**

Read the updated skill file and confirm both templates are present and the note is added.

- [ ] **Step 5: No commit needed**

The skill file lives in `~/.claude/skills/` which is not a git repo — changes take effect immediately.

---

## Self-Review Notes

- **Spec coverage:** All spec sections have tasks — markup (Task 2), styles (Task 1), JS (Task 3), skill update (Task 5), testing (Tasks 3 & 4). Accessibility requirements (aria-label, focus management, Esc key) are covered in Task 3's script.
- **Placeholders:** None. Every code block contains actual code.
- **Type consistency:** Selector `button.work-card[data-youtube-id]` is used consistently between the CSS (Task 1) and JS (Task 3). Modal element IDs and class names match between markup and script.
- **Order-independence:** Task 1 (CSS) can run before Task 2 (markup conversion) because the CSS applies only when markup exists. Tasks must run in order 1→2→3→4→5 because later tasks depend on earlier ones.
