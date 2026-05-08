# DESIGN PRD: Offline AI Traffic Light Control System - UI/UX Specifications

**Project Name:** Offline AI Traffic Light Control Demonstration Engine  
**Document Type:** Design Product Requirements Document  
**Version:** 1.0  
**Date:** 2026-05-07  

---

## 1. DESIGN PHILOSOPHY

### Aesthetic Direction: **Modern, Professional, Tesla-Inspired**

The design should evoke the **Tesla vehicle map interface** - clean, minimalist, real-time visualization with a focus on clarity and precision. The overall tone is sophisticated, tech-forward, and easy to understand at a glance.

**Core Design Principles:**
- Clarity over decoration
- Real-time information prominence
- Dark theme (suitable for 24/7 traffic monitoring)
- High contrast for visibility
- Smooth animations (not distracting)
- Professional, trustworthy appearance

---

## 2. COLOR PALETTE

### Primary Colors
- **Primary Blue (Cyan):** `#00d4ff`
  - Used for: Highlights, primary text, active elements, AI decisions
  - Represents: Intelligence, trust, technology

- **Background Dark:** `#0f0f0f` (main), `#1a1a1a` (panels), `#0a0a0a` (map)
  - Used for: Main background, panel backgrounds
  - Represents: Sophistication, minimalism

- **Neutral Grey:** `#d0d0d0`, `#e0e0e0`, `#888888`
  - Used for: Secondary text, disabled states, vehicle colors (normal cars)
  - Represents: Calm, neutral

### Status Colors
- **Green (Safe/Go):** `#00c864`
  - Used for: Green traffic lights, active status, confirmed actions

- **Yellow (Caution):** `#ffb400`
  - Used for: Yellow traffic lights, medium density, warnings

- **Red (Stop/Alert):** `#ff3232`
  - Used for: Red traffic lights, high density, errors, stop states

- **Emergency Orange-Red:** `#ff6432`
  - Used for: Emergency vehicles, critical alerts, priority indicators

### Gradient & Effects
- **Panel Gradient:** `linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%)`
  - Used for: Panel backgrounds for depth

- **Light Overlay:** `rgba(255, 255, 255, 0.05)` - `0.15`
  - Used for: Subtle borders, hover states, depth layers

---

## 3. TYPOGRAPHY

### Font Stack
**Primary Font Family:**
```
'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
```
(System fonts that mimic Apple/Tesla aesthetic)

### Font Sizes & Hierarchy

| Element | Size | Weight | Line Height | Usage |
|---------|------|--------|-------------|-------|
| Main Header | 16px | 600 | 1.2 | Panel titles |
| Section Header | 14px | 600 | 1.3 | AI section titles |
| Body Text | 12px | 400 | 1.4 | Metrics, descriptions |
| Small Text | 11px | 500 | 1.3 | Labels, secondary info |
| Tiny Text | 9px-10px | 400 | 1.2 | Time labels, hints |
| Metric Values | 16px-20px | 700 | 1.0 | Large numbers |

### Text Styling
- **Uppercase Labels:** Text-transform: uppercase, letter-spacing: 0.8px-1px
  - Used for: Section titles, button labels, headings (professional feel)

- **Metric Numbers:** Font-variant-numeric: tabular-nums
  - Used for: Numbers in metrics (ensures alignment)

- **Color Codes:**
  - Headings: `#00d4ff` (primary blue)
  - Primary Text: `#e0e0e0` (light grey)
  - Secondary Text: `#888888` (medium grey)
  - Labels: `#888888` (medium grey)

---

## 4. LAYOUT STRUCTURE

### Overall Layout: **Two-Panel Split Screen**

```
┌─────────────────────────────────────────────────────────────┐
│ CONTAINER (100vh, flex, gap: 16px, padding: 16px)           │
├──────────────────────────────────┬──────────────────────────┤
│                                  │                          │
│     LEFT PANEL (flex: 1)         │   RIGHT PANEL (420px)    │
│                                  │                          │
│  ┌──────────────────────────┐   │ ┌────────────────────┐   │
│  │ Map Header               │   │ │ AI Header          │   │
│  │ - Title                  │   │ │ - Title            │   │
│  │ - Controls               │   │ │                    │   │
│  │  (Start, Stop, Speed...) │   │ └────────────────────┘   │
│  └──────────────────────────┘   │ ┌────────────────────┐   │
│                                  │ │ AI Content         │   │
│  ┌──────────────────────────┐   │ │ - Current State    │   │
│  │   CANVAS MAP             │   │ │ - Decision Logic   │   │
│  │   (Bird's-eye view)      │   │ │ - Commands         │   │
│  │   - Roads & Lanes        │   │ │ - Priority Logic   │   │
│  │   - Traffic Lights       │   │ │ - History          │   │
│  │   - Vehicles (Grey)      │   │ │                    │   │
│  │   - Emergency (Red+Siren)│   │ │ (Scrollable)       │   │
│  │                          │   │ │                    │   │
│  │                          │   │ │                    │   │
│  │                          │   │ │                    │   │
│  │                          │   │ │                    │   │
│  │                          │   │ │                    │   │
│  │                          │   │ │                    │   │
│  └──────────────────────────┘   │ └────────────────────┘   │
│                                  │                          │
└──────────────────────────────────┴──────────────────────────┘
```

### Left Panel: Map Visualization
- **Dimensions:** Flex: 1 (fills remaining space)
- **Background:** `linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%)`
- **Border Radius:** 12px
- **Box Shadow:** `0 8px 32px rgba(0, 0, 0, 0.5)`

**Map Header:**
- Padding: 12px 16px
- Background: `rgba(0, 0, 0, 0.4)`
- Border-bottom: 1px solid `rgba(255, 255, 255, 0.1)`
- Display: flex, justify-content: space-between, align-items: center

**Controls Section (within header):**
- Flex layout, gap: 8px
- Contains: Speed selector, Start/Stop buttons, Reset button, Emergency button

**Canvas Area:**
- Flex: 1 (fills remaining space)
- Background: `#0a0a0a`
- Contains: HTML5 Canvas element

### Right Panel: AI Decision Engine
- **Dimensions:** Fixed width: 420px
- **Background:** `linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%)`
- **Border Radius:** 12px
- **Box Shadow:** `0 8px 32px rgba(0, 0, 0, 0.5)`
- **Display:** Flex column

**AI Header:**
- Padding: 12px 16px
- Background: `rgba(0, 0, 0, 0.4)`
- Border-bottom: 1px solid `rgba(255, 255, 255, 0.1)`

**AI Content (Scrollable):**
- Flex: 1, overflow-y: auto, padding: 12px
- Display: flex, flex-direction: column, gap: 12px
- Custom scrollbar styling

---

## 5. COMPONENT SPECIFICATIONS

### 5.1 Buttons

#### Primary Button (Start, Reset, etc.)
```css
Background: rgba(0, 212, 255, 0.15)
Border: 1px solid rgba(0, 212, 255, 0.4)
Color: #00d4ff
Padding: 6px 14px
Border-radius: 6px
Font-size: 11px
Font-weight: 600
Text-transform: uppercase
Letter-spacing: 0.5px

Hover State:
  Background: rgba(0, 212, 255, 0.25)
  Border-color: rgba(0, 212, 255, 0.8)
```

#### Stop Button
```css
Background: rgba(255, 50, 50, 0.15)
Border: 1px solid rgba(255, 50, 50, 0.4)
Color: #ff3232
(Same padding, border-radius, font as primary)

Hover State:
  Background: rgba(255, 50, 50, 0.25)
  Border-color: rgba(255, 50, 50, 0.8)
```

#### Emergency Button
```css
Background: rgba(255, 100, 50, 0.2)
Border: 1px solid rgba(255, 100, 50, 0.6)
Color: #ff6432
Font-size: 12px
Animation: pulse 2s infinite
  (Opacity: 1 → 0.7 → 1)
```

### 5.2 Controls Section

**Speed Control Dropdown:**
- Display: flex, gap: 6px, align-items: center
- Background: `rgba(255, 255, 255, 0.05)`
- Padding: 6px 12px
- Border-radius: 6px
- Border: 1px solid `rgba(255, 255, 255, 0.1)`

**Select Element:**
- Background: transparent
- Border: none
- Color: #00d4ff
- Font-weight: 600
- Font-size: 12px
- Cursor: pointer

### 5.3 AI Sections

**Section Container:**
- Background: `rgba(0, 0, 0, 0.3)`
- Border: 1px solid `rgba(255, 255, 255, 0.08)`
- Border-radius: 8px
- Padding: 12px

**Section Header:**
- Font-size: 11px
- Font-weight: 700
- Text-transform: uppercase
- Letter-spacing: 0.8px
- Color: #00d4ff
- Margin-bottom: 8px
- Display: flex, align-items: center, gap: 6px

**Indicator Dot (in header):**
- Width: 4px, Height: 4px
- Background: #00d4ff
- Border-radius: 50%

### 5.4 State Items

**State Item (Metric Row):**
```css
Display: flex
Justify-content: space-between
Align-items: center
Padding: 6px 0
Font-size: 12px
Border-bottom: 1px solid rgba(255, 255, 255, 0.05)

Label: color: #888, font-weight: 500
Value: color: #00d4ff, font-weight: 600
```

### 5.5 Badges (Density Labels)

**Low Density Badge:**
```css
Background: rgba(0, 200, 100, 0.2)
Color: #00c864
Border: 1px solid rgba(0, 200, 100, 0.4)
Padding: 2px 8px
Border-radius: 4px
Font-size: 10px
Font-weight: 700
Text-transform: uppercase
Letter-spacing: 0.5px
```

**Medium Density Badge:**
```css
Background: rgba(255, 180, 0, 0.2)
Color: #ffb400
Border: 1px solid rgba(255, 180, 0, 0.4)
(Same padding, font as above)
```

**High Density Badge:**
```css
Background: rgba(255, 50, 50, 0.2)
Color: #ff3232
Border: 1px solid rgba(255, 50, 50, 0.4)
(Same padding, font as above)
```

### 5.6 Alert Boxes

**Command Active Box:**
```css
Background: rgba(0, 200, 100, 0.12)
Border-left: 3px solid #00c864
Padding: 10px
Padding-left: 8px
Border-radius: 4px
Margin-bottom: 8px

Label (inside):
  Color: #00c864
  Font-weight: 700
  Font-size: 11px
  Text-transform: uppercase
  Letter-spacing: 0.5px
  Margin-bottom: 4px

Content (inside):
  Color: #ddd
  Font-size: 12px
  Font-weight: 500
```

**Emergency Alert Box:**
```css
Background: rgba(255, 100, 50, 0.15)
Border-left: 3px solid #ff6432
Padding: 10px
Padding-left: 8px
Border-radius: 4px
Margin-bottom: 8px
Animation: blink 0.8s infinite
  (Opacity: 1 → 0.8 → 1)

Label & Content: Same as Command Active (but with emergency colors)
```

### 5.7 Charts/Graphs

**History Chart Container:**
```css
Width: 100%
Height: 120px
Background: rgba(0, 0, 0, 0.3)
Border-radius: 6px
Position: relative
Margin-top: 8px
```

**Chart Bar:**
```css
Position: absolute
Bottom: 0
Width: 12px
Background: linear-gradient(180deg, #00d4ff 0%, rgba(0, 212, 255, 0.3) 100%)
Border-radius: 2px 2px 0 0
Transition: height 0.3s
```

**Time Label (below bar):**
```css
Position: absolute
Bottom: -18px
Font-size: 9px
Color: #666
Text-align: center
```

### 5.8 Scrollbar Styling

```css
Width: 6px
Track background: transparent
Thumb background: rgba(0, 212, 255, 0.2)
Thumb border-radius: 3px
Thumb:hover background: rgba(0, 212, 255, 0.4)
```

---

## 6. ANIMATION & MOTION

### Principles
- Smooth, not jarring
- Purposeful (not gratuitous)
- 300-500ms standard duration
- Easing: ease-in-out for most transitions

### Animations Defined

**Pulse Animation (Emergency Button):**
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
Duration: 2s
Iteration: infinite
```

**Blink Animation (Emergency Alert):**
```css
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}
Duration: 0.8s
Iteration: infinite
```

**Fade In/Out Animation (Loading text):**
```css
@keyframes fadeInOut {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}
Duration: 1.5s
Iteration: infinite
```

**Hover Transitions:**
- All button hover states: 0.2s ease-in-out
- All color transitions: 0.3s ease-in-out

### Canvas Animations
- Vehicle movement: Smooth, continuous updates
- Traffic light changes: Instant state change, animated color transition (optional)
- Emergency siren: Blinking red/blue at 0.4s interval per color
- Car speed changes: Gradual acceleration/deceleration (0.1s per frame)

---

## 7. RESPONSIVE DESIGN

### Desktop Layout (Primary)
- Two-panel split: 60% map, 40% AI panel
- Full canvas utilization
- All controls visible
- Scrollable AI panel

### Tablet Layout (if needed)
- Vertical stacking: Map on top, AI panel below
- Full-width panels
- Scrollable content

### Mobile Layout (Not in Scope for MVP)
- Single-column layout
- Tabbed interface to switch between map and AI panel
- Touch-friendly controls

### Current Target
- **Minimum Resolution:** 1600px width (college lab computers)
- **Recommended Resolution:** 1920px width
- **Vertical:** 1080px or higher

---

## 8. VISUAL STYLE DETAILS

### Map Visualization (Canvas)

**Road Rendering:**
- Gray/dark asphalt color: `#333333` - `#444444`
- Lane markings: White dashed lines (`#ffffff` at 0.3 opacity)
- Road width proportional to lanes (2-3 lane roads clearly visible)

**Vehicle Rendering:**
- **Normal Cars:** 
  - Color: `#d0d0d0` (light grey, Tesla-like)
  - Shape: Small rounded rectangles (16px × 10px)
  - Border: Optional 1px lighter shade for definition

- **Emergency Vehicles:**
  - Color: `#ff6432` (orange-red)
  - Size: Same as normal cars
  - **Animated Sirens on Top:**
    - Two circles above vehicle
    - Red siren: `rgba(255, 50, 50, opacity)`
    - Blue siren: `rgba(0, 150, 255, opacity)`
    - Alternating visibility: Red visible (opacity: 1) → Blue visible (opacity: 1)
    - Blink frequency: Every 0.4s

**Traffic Light Rendering:**
- Circle indicators at intersection approaches
- States: Red (`#ff3232`), Yellow (`#ffb400`), Green (`#00c864`)
- Size: 20px × 20px circles
- Border: 2px solid `rgba(255, 255, 255, 0.3)`
- Shadow on active state

**Intersection Markers:**
- Optional: Subtle grid or crosshair at intersection center
- Color: `rgba(0, 212, 255, 0.2)`

### Dark Theme Consistency
- All backgrounds use dark palette (`#0f0f0f` - `#1a1a1a`)
- Accents use bright colors (#00d4ff, #ff3232, etc.)
- High contrast ratio (WCAG AA standard: 4.5:1)
- No harsh white text (use `#e0e0e0` instead)

---

## 9. ACCESSIBILITY STANDARDS

### Color Contrast
- Text on background: Minimum 4.5:1 ratio (WCAG AA)
- Interactive elements: Clear, distinct colors
- Status colors supplemented by text labels (not color-only)

### Keyboard Navigation
- All buttons accessible via Tab key
- Focus states visible (outline or background change)
- No keyboard traps

### Screen Reader Support
- Semantic HTML (not just divs)
- ARIA labels on interactive elements
- Proper heading hierarchy

### Text Readability
- Minimum font size: 11px (body text)
- Line-height: 1.4+ for readability
- Not all caps for body text (headings only)

---

## 10. VISUAL HIERARCHY

**Primary Information (Largest, Brightest):**
1. Vehicle positions on map
2. Traffic light status
3. Current traffic density
4. Active AI decisions (commands)
5. Emergency alerts (if present)

**Secondary Information (Medium):**
1. Vehicle counts per lane
2. Signal timing durations
3. Historical data bars
4. Decision logic explanations

**Tertiary Information (Smallest):**
1. Labels and legends
2. Time stamps
3. Debug information (if included)
4. Secondary metrics

---

## 11. DESIGN TOKENS (CSS VARIABLES)

```css
:root {
  /* Colors */
  --color-primary: #00d4ff;
  --color-primary-dark: #0099cc;
  --color-background: #0f0f0f;
  --color-surface: #1a1a1a;
  --color-surface-dark: #0d0d0d;
  --color-border: rgba(255, 255, 255, 0.1);
  --color-text-primary: #e0e0e0;
  --color-text-secondary: #888888;
  --color-success: #00c864;
  --color-warning: #ffb400;
  --color-error: #ff3232;
  --color-emergency: #ff6432;

  /* Typography */
  --font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-size-xs: 9px;
  --font-size-sm: 11px;
  --font-size-md: 12px;
  --font-size-lg: 14px;
  --font-size-xl: 16px;
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 6px;
  --spacing-md: 8px;
  --spacing-lg: 12px;
  --spacing-xl: 16px;

  /* Shadows */
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.5);

  /* Transitions */
  --transition-fast: 0.2s ease-in-out;
  --transition-normal: 0.3s ease-in-out;
  --transition-slow: 0.5s ease-in-out;

  /* Border Radius */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;
}
```

---

## 12. DESIGN VALIDATION CHECKLIST

- [ ] Dark theme consistent across all elements
- [ ] Primary blue (#00d4ff) used as accent throughout
- [ ] Status colors clearly differentiated (Green/Yellow/Red)
- [ ] Typography hierarchy clear and readable
- [ ] Buttons have clear hover states
- [ ] Emergency alerts visually distinct and animated
- [ ] Map canvas uses Tesla-style grey for vehicles
- [ ] AI panel information organized logically
- [ ] No accessibility color-contrast violations
- [ ] Animations smooth and purposeful
- [ ] Responsive layout works on target resolutions
- [ ] Loading states visible (spinners, text)

---

## 13. DESIGN FILES & ASSETS

**Required Assets:**
- None (vector rendering only, no image assets)
- All rendered via Canvas API
- All styling via CSS

**Optional Assets (for future enhancement):**
- Vehicle icons/sprites (currently rendered as shapes)
- Map background texture
- Custom font files (currently system fonts)

---

## 14. APPROVAL & SIGN-OFF

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Design Lead | [Your Name] | _________ | 2026-05-07 |
| Project Lead | [Your Name] | _________ | _________ |

---

**Next Steps:**
1. Review and approve this Design PRD
2. Create prototype/mockups if needed
3. Begin implementation with Design guidelines
4. Conduct visual review during development
5. Iterate on feedback during integration phase
