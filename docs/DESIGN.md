---
name: Academic Nexus
colors:
  surface: '#f7f9ff'
  surface-dim: '#d7dae0'
  surface-bright: '#f7f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f4fa'
  surface-container: '#ebeef4'
  surface-container-high: '#e5e8ee'
  surface-container-highest: '#dfe3e8'
  on-surface: '#181c20'
  on-surface-variant: '#42474e'
  inverse-surface: '#2d3135'
  inverse-on-surface: '#eef1f7'
  outline: '#72777f'
  outline-variant: '#c2c7cf'
  surface-tint: '#35618c'
  primary: '#00375e'
  on-primary: '#ffffff'
  primary-container: '#1f4e78'
  on-primary-container: '#95bff0'
  inverse-primary: '#a0cafb'
  secondary: '#006687'
  on-secondary: '#ffffff'
  secondary-container: '#87d6fe'
  on-secondary-container: '#005d7c'
  tertiary: '#003d29'
  on-tertiary: '#ffffff'
  tertiary-container: '#00573b'
  on-tertiary-container: '#5cd19f'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d0e4ff'
  primary-fixed-dim: '#a0cafb'
  on-primary-fixed: '#001d35'
  on-primary-fixed-variant: '#194973'
  secondary-fixed: '#c1e8ff'
  secondary-fixed-dim: '#81d0f8'
  on-secondary-fixed: '#001e2b'
  on-secondary-fixed-variant: '#004d67'
  tertiary-fixed: '#85f8c4'
  tertiary-fixed-dim: '#68dba9'
  on-tertiary-fixed: '#002114'
  on-tertiary-fixed-variant: '#005137'
  background: '#f7f9ff'
  on-background: '#181c20'
  surface-variant: '#dfe3e8'
  brand-navy-dark: '#163A59'
  brand-hero-dark: '#0F2744'
  brand-hero-mid: '#1E3A5F'
  brand-surface: '#F5F7FA'
  brand-light-blue: '#E6F0F7'
  brand-active-pill: '#D3E3FD'
  brand-active-text: '#001D35'
  text-main: '#1A1A1A'
  text-muted: '#8A8F98'
  border-subtle: '#E1E5EA'
  status-error: '#DC2626'
  status-warning: '#F59E0B'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 26px
    fontWeight: '800'
    lineHeight: 32px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '800'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '700'
    lineHeight: 24px
    letterSpacing: '0'
  title-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 22px
  body-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
  space-2xl: 2rem
---

## Brand & Style
Academic Nexus embodies an institutional yet forward-leaning research workspace tailored for university students, faculty labs, and industrial technology partners. The aesthetic synthesizes **Corporate Modern** structural rigor with high-density utilitarian workspace patterns (reminiscent of productivity suites like Gmail or Google Workspace). 

Visual cues focus on clarity, academic authority, and professional momentum. Crisp slate borders, cool off-white canvases, deep collegiate navy accents, and subtle technical teal highlights balance credibility with digital velocity. The interface conveys institutional prestige without feeling bureaucratic, providing an elevated workspace for funding, intellectual property exchanges, and deep-tech collaboration.

## Colors
The palette is rooted in collegiate navy and digital cyan, anchored against cool neutral slates.

- **Primary (`#1F4E78`):** Deep academic blue used for active headers, primary buttons, branding marks, and high-emphasis controls. Hover states darken to `#163A59`.
- **Secondary (`#2E86AB`):** Bright cerulean used for secondary highlights, tech headlines, and gradient transitions.
- **Tertiary (`#059669`):** Forest emerald applied to financial budgets, verification badges, and positive active recruitment signals.
- **Neutral (`#5F6368`):** Standard slate gray providing balanced legibility for captions, meta timestamps, and secondary navigation items.
- **Surface Roles:** Backgrounds rely on `#F5F7FA` to produce clear contrast against pure white (`#FFFFFF`) card containers. Interactive selections and pill highlights utilize gentle tints such as `#D3E3FD` and `#E6F0F7`.

## Typography
Typographic hierarchy is structured around `Inter` for all UI chrome, editorial headers, and body narrative, with `JetBrains Mono` reserved for technical metadata, tags, and code-aligned references.

- Section kickers and sidebar group dividers use uppercase text with expanded tracking (`0.04em`) at `11px` (`label-sm`).
- Hero display headers employ tight line heights and heavy weight (`800`) to create an authoritative editorial feel.
- Body text prioritizes density: metadata and microcopy default to `12px` and `11px` to support information-dense workspace layouts without clutter.

## Layout & Spacing
The layout employs an application shell model comprising a full-width sticky navigation bar (`64px` height), a collapsible persistent sidebar (`260px` expanded, `72px` icon-collapsed), and a fluid central canvas constrained to a maximum content width of `1280px`.

- **Grid & Gutters:** Grid layouts scale from 1 column on mobile to 2 or 3 columns on tablet/desktop (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`) with a consistent `1.5rem` (`24px`) gutter. Partner logo displays stretch across 5 columns on desktop.
- **Padding Cadence:** Component interiors strictly adhere to 4px multiples. Dense actionable list rows utilize `1rem` (`16px`) padding; high-visibility hero modules employ `2rem` (`32px`) padding.
- **Responsive Adaptations:** On viewports below `768px`, the sidebar transitions to an off-canvas drawer with a blurred backdrop overlay (`bg-slate-900/50 backdrop-blur-xs`), while container margins reduce from `2rem` to `1rem`.

## Elevation & Depth
Elevation is achieved through a combination of crisp hairline borders and soft ambient diffusion rather than deep drop shadows.

- **Base Cards & Modules:** Enclosed within `border border-slate-200` (or `#E1E5EA`) on `#FFFFFF` surfaces paired with `shadow-xs` (`0 1px 2px 0 rgba(0, 0, 0, 0.05)`).
- **Hover Transitions:** Interactive cards lift subtly with `-translate-y-1` or border transitions to `#1F4E78` accompanied by `shadow-md`.
- **Search & Filter Bars:** Pill search elements utilize floating `shadow-md` to `shadow-lg` on focus, paired with white background elevations over tinted canvas sections.
- **Overlays & Modals:** Modals use backdrop blurs (`backdrop-blur-xs`) and `shadow-xl` to establish an elevated interaction tier.

## Shapes
The design leverages a **Soft (`1`)** baseline geometry mixed intentionally with full pill radiuses for action-oriented controls.

- **Containers & Cards:** Feature rounded corners between `0.5rem` (`rounded-lg`) and `0.75rem` (`rounded-xl`), creating clean edges that organize high volumes of research data.
- **Interactive Controls:** Search bars, primary navigation links, category filter tabs, status chips, and tag buttons use fully rounded pill profiles (`rounded-full`) to differentiate interactive buttons from content cards.
- **Hero Containers:** Hero display wrappers utilize `rounded-2xl` (`1rem`) to establish distinct visual zoning for highlighted editorial content.

## Components

### Buttons
- **Primary:** Fully rounded (`rounded-full` or `rounded-lg`), colored in `#1F4E78` with white typography, supporting hover shift to `#163A59` and `shadow-xs`.
- **Secondary / Outlined:** White background, `border border-[#1F4E78]`, text colored `#1F4E78`, transitioning to `#E6F0F7` on hover.
- **Sidebar Nav Items:** `h-9 px-4 rounded-full` pill structure. Active items adopt `#D3E3FD` with `#001D35` text; inactive items utilize hoverable transparent states shifting to `hover:bg-slate-100`.

### Input Fields & Search Bars
- **Pill Search (Global / Hero):** Contained in `h-11` or `h-14` fully rounded shells with neutral borders or tinted backgrounds (`#EEF2F6`). On focus, shifts to white background with subtle shadow ring.
- **Integrated Selectors:** Embedded dropdown triggers within search bars separated by vertical hairline dividers (`w-px h-6 bg-slate-200`).

### Chips & Badges
- **Category Indicators:** Soft pastel backdrops (`bg-blue-50`, `bg-emerald-50`, `bg-amber-50`) paired with high-contrast text (`text-blue-700`, `text-emerald-800`), sized at `11px` with `px-2 py-0.5 rounded`.
- **Trend Tags:** Translucent glassmorphic pills (`bg-white/10 hover:bg-white/20 border border-white/15`) with backdrop blur for dark hero placements.

### Cards & Opportunity Rows
- **News / Content Cards:** Structured vertically with image previews (`h-48`), absolute category tags, clamping headlines, and structured footer metadata rows.
- **Horizontal Opportunity Rows:** Flex containers with media thumbnails (`180px x 112px`), title, fund source, fiscal budget indicators, and right-aligned CTA buttons.
- **Partner Logo Cards:** Minimalist square cards (`h-[200px]`) centered around branded iconography, top "TOP" ranking tags, and reactive hover borders.

### Dialogs & Modals
- Fixed centered layout with tinted overlay (`bg-slate-900/40`), clean dividing borders, status-colored header badges (e.g., `#DC2626` logout iconography), and vertical action stacks.