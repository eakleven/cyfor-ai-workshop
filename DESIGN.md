# Forsvaret Design System — Application Guide

This document translates Forsvaret's visual identity into practical guidelines for this booking/resource management application. It is based on the official profile elements published at [forsvaret.no/profilelement](https://www.forsvaret.no/om-forsvaret/forsvarets-profil/profilelement).

---

## Color Palette

Forsvaret's palette is described as "controlled, calm, and discrete" — inspired by Norwegian nature (forests, stone, sky). Avoid bright accent colors.

| Token | Hex | Usage |
|---|---|---|
| `fv-green` | `#2B3829` | Primary actions, header backgrounds |
| `fv-green-mid` | `#4A6044` | Hover states, secondary elements |
| `fv-sage` | `#8AA88A` | Badges, labels, subtle indicators |
| `fv-bg` | `#F2F2ED` | Page background |
| `fv-card` | `#FFFFFF` | Card/panel backgrounds |
| `fv-border` | `#C8C8BF` | Borders, dividers |
| `fv-text` | `#2A2A25` | Primary body text |
| `fv-text-muted` | `#65655C` | Secondary/helper text |
| `fv-red` | `#8B3030` | Error states only |

---

## Typography

| Context | Font | Notes |
|---|---|---|
| Brand/external | Cera Pro | Requires licensing — use only in official materials |
| Internal tools | Arial | Default for internal systems and applications |
| Serif alternative | Cambria | Formal documents only |

**For this application: use Arial.** It is the sanctioned typeface for internal tools and operational systems.

Hierarchy:
- Page title: Arial, 20–22px, normal weight (avoid heavy weights that feel aggressive)
- Section heading: Arial, 15–16px, medium weight
- Body: Arial, 14px, regular
- Labels/metadata: Arial, 12px, muted color

---

## Visual Identity Rules

Forsvaret's identity guidelines explicitly prohibit:

| Prohibited | Why |
|---|---|
| Drop shadows | Creates artificial depth — the aesthetic must be flat and direct |
| Gradients | Inconsistent with the controlled, calm palette |
| Bevels / embossing | Decorative effects undermine the serious, functional tone |
| Diagonal angles | The visual language is orthogonal and structured |

**What to use instead:**
- Borders (`1px solid fv-border`) to define cards and panels
- Solid fills — no transparency effects on key elements
- Generous whitespace to create hierarchy and breathing room

---

## Component Patterns

### Buttons (primary)
```
background: fv-green (#2B3829)
color: white
border: none
border-radius: 2px (minimal — nearly square)
padding: 8px 16px
font: Arial 14px
hover: fv-green-mid (#4A6044)
```

### Input fields
```
border: 1px solid fv-border (#C8C8BF)
background: fv-card (#FFFFFF)
border-radius: 2px
focus border: fv-green (#2B3829)
```

### Cards / panels
```
background: fv-card (#FFFFFF)
border: 1px solid fv-border (#C8C8BF)
NO shadow
border-radius: 2px or 0px
```

### Type badges
```
border: 1px solid fv-sage (#8AA88A)
background: none
color: fv-green-mid (#4A6044)
font: Arial 11px, normal weight
padding: 2px 8px
```

### Error messages
```
color: fv-red (#8B3030)
No background — inline text only
```

---

## Tone of the UI

- **Functional first.** This is an operational tool — every UI element should serve a clear purpose.
- **No decoration.** If an element is not informational, remove it.
- **Respect for the user.** Labels are clear and direct; no marketing language.
- **Norwegian context.** Labels and copy can be in Norwegian for internal deployments.

---

## Logo Usage (reference)

The Forsvaret shield logo is protected under heraldic law (Norwegian Criminal Code §165) and copyright. **Do not include the logo or shield in this application** unless you hold a written agreement with Forsvaret. The tagline _"For alt vi har. Og alt vi er."_ is likewise protected and must not be reproduced without authorization.
