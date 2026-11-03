---
name: Academic & Corporate Nexus
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
  tertiary: '#003d27'
  on-tertiary: '#ffffff'
  tertiary-container: '#005739'
  on-tertiary-container: '#66d09d'
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
  tertiary-fixed: '#8df7c2'
  tertiary-fixed-dim: '#71daa7'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005235'
  background: '#f7f9ff'
  on-background: '#181c20'
  surface-variant: '#dfe3e8'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-md-medium:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  caption-code:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.5rem
  margin: 1.5rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-xxl: 3rem
---

## Brand & Style

This design system establishes a bridge between rigorous academic research and modern enterprise execution. It serves a multi-stakeholder ecosystem consisting of four primary user personas: Sinh viên (Students), Giảng viên (Lecturers), Doanh nghiệp (Enterprises), and Quản trị viên (Administrators).

### Brand Personality & Core Values
- **Uy tín & Chuẩn mực (Authoritative & Trustworthy):** Rooted in higher education excellence and institutional credibility. Information must be clear, structured, and auditable.
- **Hiện đại & Thực tiễn (Modern & Pragmatic):** Corporate efficiency with friction-free collaboration workflows, clear state progression, and streamlined approval processes.
- **Minh bạch & Kết nối (Transparent & Collaborative):** Removing silos between university research labs and industry requirements through visible project milestones, intellectual property status, and verified institutional profiles.

### Visual Aesthetic
The interface adheres to an **Elevated Corporate-Academic Minimalist** style. It favors structured white space, crisp data dividers, tactile status badges, and restrained typography over decorative flourishes. High-density data tables, milestone timelines, and profile cards are organized through clean 1px structural borders and subtle elevation changes, maintaining extreme legibility in complex academic and corporate workflows. All copy, functional labels, and workflow states are localized cleanly in Vietnamese.

## Colors

The color system delivers high functional contrast, clear role differentiation, and unambiguous workflow states across academic and enterprise pipelines.

### Primary & Accent Roles
- **Primary Brand (`#1F4E78`):** Deep Blue anchoring top-level navigation, primary call-to-action buttons, key workflow confirmations, and active structural states. Represents stability, institutional trust, and depth.
- **Primary Dark (`#163A59`):** Interactive hover states for primary controls, table headers in specialized administrative views, and high-emphasis brand marks.
- **Primary Light / Surface Tint (`#E6F0F7`):** Selected table rows, active sidebar items, informational panel backdrops, and interactive tags.
- **Secondary Accent (`#2E86AB`):** Interactive utility actions, secondary filters, research topic tags, and corporate partner badges.

### Surface, Neutral & Content Foundation
- **Canvas / Background (`#F5F7FA`):** Cool light-gray page canvas preventing eye fatigue during lengthy data reviews.
- **Surface (`#FFFFFF`):** High-clarity cards, modal dialogues, input fields, and standard tables.
- **Border / Divider (`#E1E5EA`):** Structural borders maintaining containment across high-density layouts without overpowering content.
- **Text Chính (Main Text - `#1A1A1A`):** Pure contrast for primary headlines, data values, and active form inputs.
- **Text Phụ (Secondary Text - `#5F6368`):** Supporting metadata, column headers, form descriptions, and helper hints.
- **Text Mờ (Muted Text - `#8A8F98`):** Disabled states, breadcrumb separators, timestamps, and placeholder copy.

### Functional & Semantic Feedback
- **Thành công (Success - `#2D9D6F`):** Approved applications, verified credentials, completed research deliverables, and active partnerships.
- **Cảnh báo (Warning - `#E8A33D`):** Pending approvals, milestone deadlines approaching, and incomplete enterprise profiles.
- **Nguy cơ / Từ chối (Danger - `#D64545`):** Rejected submissions, critical alerts, revoked API tokens, and destructive actions.

## Typography

The typographic engine uses **Inter** across all system levels to maintain crisp geometry and high legibility for technical Vietnamese diacritics (dấu thanh). A supplementary monospace scale (**JetBrains Mono**) is reserved for project reference codes, TRL indices, and integration tokens.

### Typographic Hierarchy Rules
- **Headline XL (H1 - 32px Bold / 26px Bold on Mobile):** Portal view titles, main dashboard welcomes, and primary directory headings.
- **Headline LG (H2 - 24px Semibold):** Module sections, tab panel titles, and modal headers.
- **Headline MD (H3 - 18px Semibold):** Project card titles, panel block titles, and form step groups.
- **Body LG (16px Regular):** Executive summaries, research abstracts, and long-form project requirements.
- **Body MD (14px Regular / Medium):** Default interface text, list items, data table cells, and form field entries.
- **Label MD / SM (14px / 12px Semibold):** Button labels, workflow state pills, tabs, and table headers.
- **Caption (12px Regular):** Field validation messages, timestamps, and metadata notes.

## Layout & Spacing

Layouts follow an **8px baseline rhythm** enclosed within a responsive 12-column grid system capped at a maximum width of **1280px** for content pages.

### Breakpoints & Adaptive Behavior
- **Desktop (≥ 1200px):** 12-column grid, 24px (`space-lg`) gutters, 24px canvas margins, max-width 1280px centered. Sidebars collapse to icon-only rails on toggle or remain at 260px fixed width.
- **Tablet (768px – 1199px):** 8-column layout, 16px (`space-md`) gutters, 20px outer margin. Auxiliary information panels stack beneath primary workspaces.
- **Mobile (< 768px):** 4-column layout, 16px (`space-md`) gutters, 16px outer margins. Navigation collapses to an off-canvas drawer; tables transition into responsive list-cards.

### Spacing Application Guidelines
- `space-xs` (4px): Inline icon-to-label spacing, badge interior padding.
- `space-sm` (8px): Stacked input field label-to-control distance, list item tight gaps.
- `space-md` (16px): Default padding inside cards, table row heights, form field spacing.
- `space-lg` (24px): Padding for container cards, modal bodies, and spacing between grid widgets.
- `space-xl` (32px): Vertical distance separating distinct semantic blocks within a page.
- `space-xxl` (48px): Page-level section breaks and landing hero segment gaps.

## Elevation & Depth

To sustain an academic and corporate look, visual separation relies on **1px crisp borders (`#E1E5EA`) combined with low-radius ambient drop shadows**. This prevents visual clutter while creating clear interactive affordances.

### Depth Layers
- **Level 0 (Nền phẳng - Flat Canvas):** Background surface (`#F5F7FA`). No shadow, no border.
- **Level 1 (Thẻ tĩnh & Danh sách - Surface Cards & Containers):** Pure white background (`#FFFFFF`), solid border `1px solid #E1E5EA`, shadow: `0px 1px 3px rgba(16, 24, 40, 0.05)`.
- **Level 2 (Thẻ tương tác & Thao tác Hover - Interactive Cards & Popovers):** Used when hovering over cards, filters, and standard popovers. Solid border `1px solid #D0D5DD`, shadow: `0px 4px 12px -2px rgba(16, 24, 40, 0.08), 0px 2px 4px -2px rgba(16, 24, 40, 0.04)`.
- **Level 3 (Bảng chọn thả xuống & Hộp thoại - Dropdowns & Menus):** Shadow: `0px 10px 20px -4px rgba(16, 24, 40, 0.10), 0px 4px 6px -2px rgba(16, 24, 40, 0.05)`, border `1px solid #E1E5EA`.
- **Level 4 (Hộp thoại tương tác & Cửa sổ nổi - Modals & Dialogs):** Backdrop `rgba(22, 58, 89, 0.45)` with a subtle blur (`backdrop-filter: blur(4px)`). Container shadow: `0px 20px 24px -4px rgba(16, 24, 40, 0.12), 0px 8px 8px -4px rgba(16, 24, 40, 0.04)`.

## Shapes

The geometric personality is **Soft & Structured** (`roundedness: 1`), prioritizing professional containment and high data density.

### Corner Radii
- **Base (0.25rem / 4px):** Checkboxes, radio containers, subtle progress bar indicators, code tokens, and internal table elements.
- **Medium (0.375rem / 6px):** Form controls (inputs, selects, textareas), button primitives, status tags, and dropdown containers.
- **Large (0.5rem / 8px):** Content cards, data table wrappers, upload zones, tab bars, and floating action alerts.
- **Extra Large (0.75rem / 12px):** Modal dialogs, presentation cards, and major dashboard widget wrappers.
- **Full Pill (9999px):** Status pills, avatar circles, role indicators, and workflow step indicators.

## Components

All user interface controls prioritize state transparency, clear role recognition, and standardized Vietnamese terminology.

### 1. Nút bấm (Buttons)
- **Primary:** Background `#1F4E78`, Text `#FFFFFF`, Border: None. Hover: `#163A59`. Focus: 3px outer ring `#1F4E78` at 20% opacity.
- **Secondary:** Background `#FFFFFF`, Border `1px solid #E1E5EA`, Text `#1F4E78`. Hover: Background `#E6F0F7`, Border `#1F4E78`.
- **Ghost:** Background transparent, Text `#5F6368`. Hover: Background `#F5F7FA`, Text `#1A1A1A`.
- **Danger:** Background `#D64545`, Text `#FFFFFF`. Hover: `#B73434`.

### 2. Thẻ thông tin & Bộ chứa (Cards & Containers)
- Standard cards feature white backgrounds, `1px solid #E1E5EA` borders, 8px corner radii, and 24px interior padding.
- Interactive cards apply an elevation shift to Level 2 with a primary border accent (`#1F4E78`) on hover.

### 3. Trường nhập liệu (Form Inputs & Upload Zones)
- **Input Fields:** Height 40px, padding horizontal 12px, border `1px solid #E1E5EA`, radius 6px, font size 14px. Focus transitions border to `#1F4E78` with a 3px ring of `#E6F0F7`. Validation errors transition border to `#D64545`.
- **Khu vực tải tài liệu (Upload Zones):** Dashed border `2px dashed #E1E5EA`, radius 8px, background `#F5F7FA`. Hover: Border `#1F4E78`, background `#E6F0F7`. Include clear format restrictions (PDF, DOCX, ZIP tối đa 25MB).

### 4. Nhãn trạng thái & Quy trình (Status Pills & Approval Badges)
Workflow status elements use a 9999px pill radius, 12px semibold text, and balanced tint-and-text contrast:
- **Đang chờ duyệt (Pending Approval):** Background `#FEF6E9`, Text `#B8751E`, Dot indicator `#E8A33D`.
- **Đã phê duyệt (Approved):** Background `#EAF7F1`, Text `#207250`, Dot indicator `#2D9D6F`.
- **Từ chối (Rejected):** Background `#FDEEEE`, Text `#A82D2D`, Dot indicator `#D64545`.
- **Đang thực hiện (In Progress):** Background `#E6F0F7`, Text `#1F4E78`, Dot indicator `#2E86AB`.

### 5. Chỉ số công nghệ & Phân loại tài nguyên (TRL & Resource Badges)
- **Chỉ số TRL (Technology Readiness Level 1-9):** Monospace font label (e.g., `TRL 4`), dark slate background `#163A59`, white text, 4px border radius.
- **Loại tài nguyên (Resource Badges):** Subtle secondary background `#E6F0F7`, text `#1F4E78` (e.g., `Đề tài NCKH`, `Chuyển giao công nghệ`, `Thực tập doanh nghiệp`).

### 6. Huy hiệu xác thực (Verified Badges)
- **Doanh nghiệp xác thực & Giảng viên kiểm duyệt:** Blue checkmark icon (`#1F4E78`) enclosed within a subtle circle, placed alongside stakeholder titles.

### 7. Điều hướng (Tabs, Breadcrumbs & Avatars)
- **Tabs:** Underline style with 2px solid active indicator in `#1F4E78`, active text in `#1F4E78` (Semibold), inactive text in `#5F6368`.
- **Breadcrumbs:** 14px regular, muted forward slash separator `/` (`#8A8F98`), active page in `#1A1A1A` semibold.
- **Avatars:** Circular (9999px), accompanied by a bottom-right role indicator chip: Sinh viên (Green dot), Giảng viên (Blue dot), Doanh nghiệp (Secondary blue dot), Quản trị viên (Dark slate dot).

### 8. Hộp thoại & Trạng thái rỗng (Modals & Empty States)
- **Modals:** Fixed width scales (Small 480px, Medium 640px, Large 880px), Level 4 elevation, sticky footer actions with primary action on the right.
- **Trạng thái rỗng (Empty States):** Centered layout with muted slate illustration/icon, H3 title, supporting explanation text (`#5F6368`), and a primary CTA button to initialize the flow (e.g., "Tạo đề tài mới").