---
name: UIT Connect Academic Portal
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
  secondary: '#406182'
  on-secondary: '#ffffff'
  secondary-container: '#b6d8fe'
  on-secondary-container: '#3d5e7f'
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
  secondary-fixed: '#cfe4ff'
  secondary-fixed-dim: '#a9caef'
  on-secondary-fixed: '#001d34'
  on-secondary-fixed-variant: '#274969'
  tertiary-fixed: '#85f8c4'
  tertiary-fixed-dim: '#68dba9'
  on-tertiary-fixed: '#002114'
  on-tertiary-fixed-variant: '#005137'
  background: '#f7f9ff'
  on-background: '#181c20'
  surface-variant: '#dfe3e8'
  primary-light: '#E6F0F7'
  neutral-dark: '#1A1A1A'
  border-subtle: '#E1E5EA'
  bg-page: '#F5F7FA'
  success-emerald: '#047857'
  success-light: '#ECFDF5'
  success-border: '#A7F3D0'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  title-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
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
  margin: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

UIT Connect embodies a rigorous, scholarly, and modern research portal identity. Designed for academic institutions, research labs, faculty, and engineering students, the atmosphere balances authoritative institutional prestige with the clarity of state-of-the-art developer tooling.

The interface adheres to a **Corporate / Modern Technical** aesthetic influenced by modern research dashboards and software repositories:
- Structured, data-dense layouts with minimal decorative flourishes.
- High functional clarity that prioritizes technical metadata (TRL meters, dataset metrics, lineage mapping, intellectual property records).
- Crisp boundaries and soft cool-neutral surfaces that communicate precision and reliability.

## Colors

The palette revolves around deep university slate blue (`#1F4E78`) paired with cool academic neutrals and verified validation emeralds:

- **Primary (`#1F4E78`)**: The dominant anchor used for active navigation states, primary call-to-actions, hero brand accents, and key technical highlights.
- **Secondary (`#163A59`)**: A deeper, high-contrast navy utilized for hovering interactive primaries and dense structural anchors like the global public footer.
- **Tertiary / Success Emerald (`#059669` / `#047857`)**: Reserved strictly for verified council accreditations, verified badges, active lab telemetry, and live status signals.
- **Background & Neutrals**: Grounded on a cool page canvas (`#F5F7FA`) with elevated pure white (`#FFFFFF`) card containers, outlined by hairline borders (`#E1E5EA`). Primary text sits comfortably at `#1A1A1A` with secondary metadata toned down via `#5F6368`.

## Typography

Typography prioritizes legibility in complex academic and engineering documentation:
- **Inter** handles all narrative, UI controls, navigation labels, and structural headings with fine-tuned font weights (400 regular, 500 medium, 600 semi-bold, 700 bold).
- **JetBrains Mono** is utilized for technical markers, TRL ratings, research IDs (`UIT-RD-2024-089`), and performance benchmark counters.
- Large titles (`headline-lg`) step down gracefully on mobile screens to preserve line-length sanity.
- Small uppercase metadata labels leverage 11px semi-bold tracking for category segment dividers.

## Layout & Spacing

The portal combines a persistent fixed-rail architecture with a responsive 12-column content grid:

- **Desktop Shell**:
  - Persistent left sidebar fixed at `260px` width.
  - Sticky top header fixed at `64px` height with a continuous left offset matching the sidebar width (`260px`).
  - Main container uses fluid padding (`2rem` desktop, `1rem` mobile) over the neutral background `#F5F7FA`.
- **Responsive Adaptations**:
  - **Mobile (< 768px)**: The navigation sidebar collapses into an off-canvas drawer with backdrop blur. Main content and header revert to full width.
  - **Desktop (>= 1024px)**: Main stage divides into an 8-column main technical dossier and a 4-column contextual laboratory and IP inspector sidebar.
- **Component Gap Rhythm**:
  - `space-xs` (4px) to `space-sm` (8px) for badge chips, inline icons, and metric markers.
  - `space-md` (16px) for item rows and card-to-card inner paddings.
  - `space-lg` (24px) for section card internal cushions and column grid gutters.

## Elevation & Depth

Visual hierarchy uses **low-contrast outlines combined with shallow ambient shadows**:

- **Borders over drop shadows**: Containers rely primarily on 1px crisp borders in `#E1E5EA` rather than deep shadows, reinforcing an institutional laboratory feel.
- **Surface Layering**:
  - Base canvas: `#F5F7FA`
  - Elevated surfaces: `#FFFFFF` with `box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05)` (`shadow-sm`)
  - Floating drawer / Modals: `box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1)` (`shadow-lg`)
- **Accents & Active Depth**: Interactive components use a 2px high-visibility primary focus ring or active borders (`#1F4E78`) to signal active lineage branches or active tab underline markers.

## Shapes

The design uses **Soft (Level 1)** corner radii:
- Standard UI modules, cards, and primary heroes use `rounded-[12px]` (0.75rem) to maintain a modern, friendly polish without feeling playful.
- Form inputs, nested cards, and buttons use `rounded-[8px]` (0.5rem).
- Small badges, chips, and data-grid items use `rounded-[6px]` (0.375rem).
- Circular rounding (`rounded-full`) is reserved strictly for avatar rings, status dots, step indicators, and TRL numerical badges.

## Components

### Buttons
- **Primary**: Solid `#1F4E78` background, white text, 8px radius, 10px 20px padding, subtle shadow. Hover transitions to `#163A59`.
- **Secondary / Soft**: `#E6F0F7` background, `#1F4E78` text, 1px border with `rgba(31, 78, 120, 0.2)`.
- **Outline / Neutral**: `#FFFFFF` or `#F8FAFC` background, `#1A1A1A` text, 1px `#E1E5EA` border.

### Badges & Status Chips
- **Academic Verification**: Emerald light background (`#ECFDF5`), emerald text (`#047857`), with 1px border in `#A7F3D0` accompanied by Material verification symbols.
- **TRL Meter**: Monospaced badge (`#1F4E78` background, white text) paired with segmented pip bars representing the 9 Technology Readiness Levels.

### Tab Navigation
- Horizontal tab bar container with bottom border. Active tab highlighted by bold text, `#1F4E78` color, and an active 2px bottom indicator line. Inactive tabs rest in `#5F6368`.

### Cards & Panels
- White background (`#FFFFFF`), 12px rounded corners, 1px subtle border (`#E1E5EA`), and low elevation `shadow-sm`.
- Nested cards and data metric blocks feature cool-slate background fills (`#F8FAFC` / `#F1F5F9`) with clear 1px borders.

### Lineage / Tree Flow
- Connected vertical timeline rail (`2px` slate border) with circular checkpoint nodes denoting predecessor research, active version, and ongoing downstream forks.