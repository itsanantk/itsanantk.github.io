# Anant Khanna — Portfolio

Personal portfolio site. Pure HTML/CSS/JS — no build step, no dependencies.

## Structure

```
index.html      — single-page site (hero, about, experience, projects, skills, contact)
css/style.css   — all styling (dark theme, design tokens in :root)
js/main.js      — particles, typewriter, scroll reveals, counters, tilt cards, nav
Anant_Khanna_Resume.pdf
```

## Run locally

Just open `index.html`, or serve it:

```
python -m http.server 8000
```

## Deploy to GitHub Pages

Copy the contents into the `itsanantk.github.io` repo (or push this repo and enable
Pages on it). No build step needed.

## Updating content

- **Roles in the hero typewriter** — `roles` array at the top of `js/main.js`
- **Colors/fonts** — CSS custom properties in `:root` in `css/style.css`
- **Resume** — replace `Anant_Khanna_Resume.pdf` (source lives in `Desktop\Jobs\Resume Source\`)
