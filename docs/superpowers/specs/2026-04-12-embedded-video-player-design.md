# Embedded Video Player for charliethedp.com

## Goal

Replace YouTube link-outs with an in-page modal video player so visitors can watch portfolio videos without leaving the site.

## Scope

### In scope
- Modal player for all YouTube work cards on `index.html`
- Autoplay with sound on modal open
- Close via: ✕ button, backdrop click, Esc key
- Close destroys iframe to stop playback
- Responsive modal sized at 16:9 with 90vw / 90vh max
- Update the `/add-portfolio-item` skill to output the new card markup

### Out of scope
- Video titles/descriptions in the modal (YouTube's native overlay is enough)
- Prev/next navigation between videos
- Keyboard navigation between cards
- Deep-linking (URL does not change when modal opens)
- Instagram modal support — Instagram cards continue to open in a new tab

## User Experience

1. Visitor sees the portfolio grid (unchanged).
2. Visitor clicks a YouTube work card.
3. Dark modal fades in, centered on the page. Body scroll locks.
4. YouTube iframe loads with autoplay + sound.
5. Visitor watches the video. They can close the modal by:
   - Clicking the ✕ button (top-right of modal)
   - Clicking the dark backdrop outside the video
   - Pressing the `Esc` key
6. Modal fades out, iframe is removed from DOM (stops audio immediately), body scroll unlocks.
7. Instagram cards continue to open `https://instagram.com/...` in a new tab as anchor tags.

## Architecture

Three concerns, kept small and isolated:

### Markup
- YouTube cards change from `<a href="...">` to `<button class="work-card" data-youtube-id="VIDEO_ID">`
- Instagram cards remain `<a href="..." target="_blank" rel="noopener">`
- A single `<div id="video-modal" aria-hidden="true">` appended to `<body>` contains:
  - Backdrop (`.video-modal-backdrop`)
  - Container (`.video-modal-content`) with close button and iframe slot

### Styling (added to `style.css`)
- `.video-modal` — fixed, full-screen, z-index high, hidden by default
- `.video-modal.open` — display flex, fade-in
- `.video-modal-backdrop` — rgba(0,0,0,0.92), fills parent
- `.video-modal-content` — centered, 16:9 aspect ratio, max 90vw / 90vh
- `.video-modal-close` — absolute top-right, white ✕ SVG, hover dims background
- `.work-card` selectors updated so they apply to both `<a>` and `<button>` variants (reset button styles: border, background, padding, font inheritance, cursor)

### JavaScript (inline `<script>` at end of `<body>`, no dependencies)
- On DOMContentLoaded, attach one delegated click listener to the grid for `button.work-card[data-youtube-id]`
- `openModal(videoId)` — inject `<iframe>` with `https://www.youtube.com/embed/{id}?autoplay=1&rel=0`, add `.open` class to modal, lock body scroll (`overflow: hidden`)
- `closeModal()` — remove iframe, remove `.open` class, unlock body scroll
- Close handlers: ✕ click, backdrop click (not inner content), `keydown` for Escape

## Data Flow

```
[User clicks work-card button]
          ↓
[Click listener reads data-youtube-id]
          ↓
[openModal(id) — iframe injected, modal shown, scroll locked]
          ↓
[User watches video]
          ↓
[User triggers close: ✕ / backdrop / Esc]
          ↓
[closeModal() — iframe removed, modal hidden, scroll unlocked]
```

## File Changes

- `index.html` — convert ~61 YouTube card anchors to buttons with `data-youtube-id`, append modal markup before closing `</body>`, add `<script>` block
- `style.css` — append modal styles, extend `.work-card` selectors to cover `<button>`
- `~/.claude/skills/add-portfolio-item/SKILL.md` — update card template for YouTube to use `<button data-youtube-id="...">` (Instagram template unchanged)

## Error Handling

- If a card has no `data-youtube-id`, do nothing (shouldn't happen, but safe fallback)
- If iframe fails to load, the modal still shows the backdrop and close control — user can close normally
- No network error states — YouTube's own iframe handles its own errors

## Accessibility

- Close button has `aria-label="Close video"`
- Modal uses `aria-hidden` toggled on open/close
- Focus moves to close button on open
- Focus returns to triggering card on close
- Esc key closes modal (standard dialog pattern)

## Testing

Manual testing checklist after deploy:
- [ ] Click a YouTube card → modal opens, video autoplays with sound
- [ ] Click ✕ → modal closes, audio stops
- [ ] Click backdrop → modal closes
- [ ] Press Esc → modal closes
- [ ] Click Instagram card → opens Instagram in new tab (unchanged)
- [ ] Mobile: modal is usable on narrow screens
- [ ] Body does not scroll while modal is open
- [ ] Tab key focuses the close button when modal is open

## Performance Notes

- Iframe is only injected on click, not preloaded — zero impact on initial page load
- One iframe at a time; removed fully on close to prevent memory leaks from the YouTube player
- No external JS dependencies added

## Follow-up Work (not in this spec)

- If Instagram cards need embedded playback later, that's a separate design (Instagram's embed SDK is heavier and looks quite different)
- If we want SEO value from video pages, we could add dedicated `/work/<slug>/` pages later
