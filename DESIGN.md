---
name: HouseTour Studio Pro
version: 1.0.0
colors:
  primary: "#0F172A"
  primary-glow: "#06B6D4"
  accent: "#10B981"
  accent-hover: "#059669"
  warning: "#F59E0B"
  error: "#EF4444"
  surface: "#1E293B"
  surface-light: "#334155"
  background: "#0B0F17"
  text-primary: "#F8FAFC"
  text-secondary: "#94A3B8"
  text-muted: "#64748B"
  border: "#334155"
  border-highlight: "rgba(6, 182, 212, 0.4)"
typography:
  headline-display:
    fontFamily: Outfit, system-ui, sans-serif
    fontSize: 32px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Outfit, system-ui, sans-serif
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.3
  body-md:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.5
  label-sm:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 12px
    fontWeight: 500
    letterSpacing: 0.05em
rounded:
  sm: 6px
  md: 10px
  lg: 16px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
components:
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: 20px
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    padding: 12px 20px
---

# HouseTour Studio Pro Design System

## Overview
A hyper-modern, high-precision dark workstation dashboard designed for real estate agencies and 3D vision engineers. The visual identity conveys cutting-edge spatial computing, algorithmic precision, and high-performance real-time graphics.

## Colors
- **Onyx Abyss Background (`#0B0F17`):** Immersive, high-contrast dark space.
- **Slate Surfaces (`#1E293B`, `#334155`):** Clean structural elevation layers with subtle border highlights.
- **Electric Cyan (`#06B6D4`):** Spatial telemetry, point clouds, processing indicators, and interactive focus states.
- **Vibrant Mint (`#10B981`):** Primary action triggers, completed job badges, and download triggers.
- **Amber Warning (`#F59E0B`):** Long-running computation warnings and queue delays.

## Typography
- **Headings:** `Outfit` — modern geometric sans with distinctive architectural punch.
- **Body & Code:** `Inter` & `JetBrains Mono` for crisp readability across dense telemetry tables and telemetry logs.

## Layout & Elevation
- Multi-column spatial layout: Upload dropzone, Active Processing Pipeline Timeline, Real-time Job Telemetry & 3D Interactive WebGL Inspector.
- Glassmorphic card styling with layered backdrop filters (`blur(12px)`) and subtle luminous outlines.

## Do's and Don'ts
- **DO** present real-time stage transitions (Frames → SfM → Mesh → LODs → NavMesh → Tour ZIP).
- **DO** provide immediate interactive 3D model inspection in-browser alongside mobile tour package downloads.
- **DON'T** use generic purple or default bootstrap palettes.
