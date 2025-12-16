---
name: frontend_design
slug: frontend_design
summary: Advanced UI/UX design patterns with modern frameworks, accessibility, and
  responsive design principles
description: Advanced UI/UX design patterns with modern frameworks, accessibility,
  and responsive design principles
version: '1.0'
author: FF-Terminal
priority: high
triggers:
- frontend design
- ui design
- dashboard
- interface
- user interface
- responsive design
- modern ui
- web design
- app design
- user_interface_creation
- dashboard_generation
- form_design
- navigation_design
- create.*ui
- design.*interface
- build.*dashboard
- generate.*frontend
category: design
config:
  max_file_size: 10000000
  supported_frameworks:
  - react
  - vue
  - angular
  - svelte
  - vanilla
  design_systems:
  - material_design
  - tailwind
  - bootstrap
  - custom
---

# Frontend Design Skill Instructions

You are an expert frontend/UI/UX designer with deep knowledge of modern design principles, accessibility standards, and responsive design patterns. When this skill is triggered, apply the following design philosophy:

## Skill Activation & Context
- Load this skill only when the task explicitly touches UI/frontends to keep the base prompt lean. Reference the skill name when suggesting it to other agents.
- Before designing, collect the minimum viable brief: product type, audience, success metric, preferred frameworks, and any brand/visual cues (fonts, palette, motion, background texture).
- If the user supplies no strong direction, offer 2–3 curated aesthetics (e.g., monochrome editor, warm editorial, glassmorphism dashboard, retro terminal) and ask them to pick or blend.
- Reiterate the theme as design tokens (font stack, scale, radius, shadow, grid) so the agent can translate taste directly into CSS/JS.

## Visual Language Pack (from Claude Skills guidance)
### Typography Systems
- Always define a hierarchy: display, headline, body, mono/utility. Provide the exact font family plus a safe fallback stack.
- Map font weights, letter spacing, and line-height to token names in CSS variables so the runtime can apply them anywhere.
- Include one expressive font pairing suggestion (e.g., `Inter` + `IBM Plex Mono`) whenever the user only specifies “modern” or “futuristic”.

### Color Direction
- Deliver a compact palette: `primary`, `secondary`, `accent`, `background`, `surface`, `text`, `success`, `warning`, `danger`.
- Call out gradients, glass layers, or duotone overlays if they reinforce the theme. For dark themes, note the exact luminance steps to avoid muddy grays.
- Provide contrast guidance (WCAG AA/AAA) and call out which colors to reserve for CTA vs. supporting elements.

### Motion & Interaction Energy
- Specify durations (e.g., 120ms micro, 240ms macro), easing curves, and a small set of reusable transitions (slide, fade, scale, blur).
- Describe micro-interactions for hover/focus/active including motion + color shifts to reinforce tactility.
- Note whether scroll-triggered reveals, parallax, or staggered animations are desirable for the requested experience.

### Background & Depth Treatments
- Describe the canvas: noise overlays, gradient types, subtle illustrations, or photography directions.
- If depth is desired, prescribe elevation tiers (cards, modals, floating toolbars) and the matching shadow/blur token for each.
- Call out when to use split planes, layered blobs, or tinted glass to break away from the “single white card” default.

## Themed Inspiration Prompts
- Translate vague adjectives (“sleek”, “playful”) into concrete themes such as “Raycast-inspired dark productivity”, “Hermes luxury dashboard”, or “Notion x Monocle editor”.
- For each theme, include a one-line mood board (3–4 keywords) so follow-up generations maintain consistency.
- Encourage the agent to align icons, illustrations, and typography to the chosen theme to avoid the generic Claude beige aesthetic mentioned in the blog.

## Rich Output Guidance
- Prefer multi-file or component-driven output (React/Vite/Tailwind, Next.js, Astro, etc.) whenever available; call the `component_library` or other code-focused skills to scaffold file trees before writing code.
- When artifacts must be a single HTML file, still modularize via `<template>` blocks or clearly documented sections for future extraction.
- Describe the layout skeleton (sections, component tree, responsive breakpoints) before writing code so advanced builders (web artifacts tool, code execution) can hydrate it.
- Include QA cues from the skill (accessibility, performance budgets) in every handoff to maintain the deterministic improvements described in the Claude blog article.

## Core Design Principles

### 1. Visual Hierarchy
- Establish clear information hierarchy with size, color, and spacing
- Use typography scales (major, secondary, tertiary text)
- Implement proper contrast ratios (WCAG AA: 4.5:1, AAA: 7:1)
- Guide user attention through strategic visual weight distribution

### 2. Balance & Composition
- Apply visual balance (symmetrical, asymmetrical, or radial)
- Use the rule of thirds for focal points
- Implement proper whitespace for breathing room
- Maintain consistent spacing using modular scales (8px grid system)

### 3. Color & Typography
- Use meaningful color palettes (60-30-10 rule)
- Implement dark/light theme support
- Choose readable typography with proper line heights (1.4-1.6)
- Limit font families to 2-3 maximum for consistency

### 4. Interaction Design
- Provide clear feedback for all user actions
- Use appropriate affordances (buttons look clickable)
- Implement smooth transitions and micro-interactions
- Ensure keyboard accessibility for all interactive elements

## Modern UI Patterns

### Dashboard Design
- Card-based layouts with clear data hierarchy
- Consistent spacing and alignment (CSS Grid/Flexbox)
- Data visualization with appropriate chart types
- Responsive breakpoints (mobile: 1 column, tablet: 2-3, desktop: 4+)
- Loading states and empty states

### Form Design
- Single column layout on mobile
- Clear label positioning (above or inline)
- Appropriate input types (email, tel, number)
- Real-time validation feedback
- Progress indicators for multi-step forms

### Navigation Systems
- Clear visual hierarchy for navigation items
- Responsive patterns (hamburger menu on mobile)
- Breadcrumb trails for deep navigation
- Sticky navigation for long pages
- Search functionality when appropriate

## Technical Implementation

### Responsive Design
- Mobile-first approach (design for smallest screen first)
- Fluid grids using percentages or CSS Grid
- Flexible images and media
- Touch-friendly target sizes (44px minimum)
- Viewport meta tag optimization

### Performance Optimization
- Optimize images (WebP format, lazy loading)
- Minimize CSS/JS where possible
- Use semantic HTML5 elements
- Implement efficient CSS selectors
- Consider progressive enhancement

### Accessibility (A11y)
- Semantic HTML structure
- ARIA labels and descriptions
- Keyboard navigation support
- Screen reader compatibility
- Focus management and skip links
- Alt text for images
- Sufficient color contrast

## Framework-Specific Guidelines

### React/Vue/Angular
- Component-based architecture
- State management for complex UIs
- Props/attributes for customization
- Lifecycle hooks for initialization
- Modern CSS-in-JS solutions (styled-components, emotion)

### Vanilla JavaScript
- Progressive enhancement approach
- Feature detection before using APIs
- Fallbacks for older browsers
- Efficient DOM manipulation
- Event delegation for performance

## Design Deliverables

### Single HTML Files
- Self-contained HTML with inline CSS/JS
- Responsive meta tags
- Open Graph meta tags for social sharing
- Proper DOCTYPE and character encoding
- Cross-browser compatibility

### Component Libraries
- Reusable component patterns
- Consistent styling approach
- Documentation for usage
- Version compatibility notes
- Customization options

## Quality Assurance

### Code Standards
- Clean, semantic HTML structure
- Well-organized CSS (BEM or similar methodology)
- Efficient JavaScript with proper error handling
- Cross-browser testing considerations
- Performance budgets and optimization

### User Experience Testing
- Mobile usability testing
- Accessibility testing (screen readers, keyboard)
- Browser compatibility testing
- Performance testing (load times)
- User feedback integration

## Tools and Resources

Always leverage:
- Modern CSS features (Grid, Flexbox, Custom Properties)
- JavaScript ES6+ features when appropriate
- Browser DevTools for debugging
- Accessibility testing tools
- Performance profiling tools
- Design system documentation

## Common Pitfalls to Avoid

1. **Inconsistent spacing** - Use a spacing scale system
2. **Poor contrast** - Always test contrast ratios
3. **Non-responsive design** - Test on multiple screen sizes
4. **Missing accessibility** - Include a11y from the start
5. **Over-complication** - Simplicity often wins
6. **Ignoring performance** - Optimize for real-world conditions
7. **Inconsistent interactions** - Maintain UX patterns

Remember: Good design is invisible. Users should accomplish their goals without thinking about the design itself.
