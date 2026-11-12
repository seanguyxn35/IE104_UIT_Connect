# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

UIT Connect: a platform connecting Students (SV), Lecturers (GV) and Enterprises (DN) at UIT, built for the IE104 course project. Only the **frontend prototype** exists. `backend/` and `database/` hold READMEs with a proposed layout and no code yet. The planned database is Microsoft SQL Server 2017+, and the business requirements are in `docs/datab.pdf`. All UI copy, code comments and docs are in **Vietnamese**, so keep new text in Vietnamese.

## Running / deploying

- There is no build step, package manager, linter or test suite. Pages are static HTML that load Tailwind through the Play CDN (`cdn.tailwindcss.com?plugins=forms,container-queries`), plus Google Fonts (Inter, JetBrains Mono, Material Symbols Outlined).
- To run it, open `frontend/index.html` in a browser or use VS Code Live Server. The role entry points `frontend/SV.html`, `GV.html` and `DN.html` redirect to the login screen.
- Deploy: `.github/workflows/deploy-pages.yml` publishes **only `frontend/`** to GitHub Pages when `frontend/**` changes on a push to `main`. Anything a page needs must therefore live inside `frontend/`. A page cannot reference `docs/`, `design/` or `archive/`.

## Architecture

**There are no templates or includes.** Each page in `frontend/pages/{sv,gv,dn}/` is a full standalone HTML file. It contains its own copy of the shared header, sidebar, footer and logout modal, plus its own inline `tailwind.config`. Consequences:
- When you change the shell (a sidebar item, the header, the footer), apply the same change to **every page of that role**. The active sidebar item is hard-coded per page (`aria-current="page"` plus the highlighted pill classes), so the shell is not byte-identical across pages.
- The Tailwind config differs from page to page. App pages mix hex-based `brand-*` tokens with Material-3-style tokens (`primary-container`, `surface-*`, `on-*`) from `docs/DESIGN.md`. Auth pages use only the M3-style tokens. Before you use a custom token class, check that it is defined in **that page's** config.
- Page-specific content sits between `<!-- ===== NỘI DUNG TRANG: … ===== -->` and `<!-- ===== HẾT NỘI DUNG TRANG ===== -->`. Mock data and page interactivity (filters, tabs, dropdowns) live in an inline `<script>` at the bottom of each page, for example `SEARCH_FILTERS` in `sv/01_trang-chu.html`. Nothing is persisted. No page uses storage or calls an API.

**Shared assets** (`frontend/assets/`):
- `js/app-shell.js` + `css/app-shell.css`: the sidebar behavior, used by the sv/gv/dn pages. On desktop the toggle collapses the sidebar from 260px to 72px with `.collapsed`. Below 768px it becomes a drawer via `.is-open` plus `#sidebar-backdrop`. The file also defines the global `openLogoutModal()`/`closeLogoutModal()` functions, navigation for non-anchor elements through `data-href="..."`, and the DN "Tạo mới" `<details class="create-menu">`. It depends on the element ids `sidebar`, `hamburger-btn`, `sidebar-backdrop`, `logout-modal` and `logout-modal-card`.
- `js/ux-effects.js` + `css/ux-effects.css`: the ripple and press feedback on every page, applied automatically to buttons, tabs, `.nav-item`, `[onclick]` and `.cursor-pointer`. Put `data-no-ripple` on an element or one of its ancestors to opt it out.
- `js/router.js`: loaded **only by `pages/auth/`**. Auth screens never hard-code links between each other. Elements carry `data-path="<key>"` (or `data-screen-link`), and `router.js` maps each key to a file through its `ROUTES` table. A key that is missing from `ROUTES` leaves the link as `href="#"`, which is how screens that are not designed yet stay unlinked. The role comes from `?role=gv|dn` (no parameter means sv) and is carried across every auth screen. After login or registration the user lands on the home page for that role (`APPS` in `router.js`). Screens 03–08 are shared by SV and GV. Screens 09–13 are the separate enterprise (DN) registration flow.
- `img/_map.json`: maps the original Stitch-hosted image URLs (`lh3.googleusercontent.com/...`) to the local files in `assets/img/`. Pages must use the local files, not the remote URLs.

**Design sources** (reference only, not deployed):
- `docs/DESIGN.md`: the "Academic Nexus" design system (color tokens, typography, spacing, components). The brand primary is `#1F4E78`.
- `design/stitch/<screen>/code.html` + `screen.png`: the raw Google Stitch exports that the pages were built from. `design/screenshots/` holds captures of the finished screens.
- `archive/`: older prototypes from before milestone 1. Do not edit them.

## Conventions

- Always link with **relative paths** (`../../assets/css/app-shell.css`), never root-absolute `/...`. GitHub Pages serves the site under a repo subpath.
- File and folder names in `pages/` are **lowercase, without Vietnamese diacritics, hyphen-separated**, and numbered in screen order (`05_dang-bai-toan-moi.html`). GitHub Pages is case-sensitive but Windows is not, so a wrong-case link works locally and breaks after deploy.
- To add a screen to a role, copy an existing page of the same role so you inherit the shell, update its sidebar active state, and add a link to it in the sidebar of **all** pages of that role.
