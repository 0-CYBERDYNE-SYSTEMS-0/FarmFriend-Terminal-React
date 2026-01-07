---
name: react-motion-master
description: Master the react-motion library for physics-based spring animations in React. Generate smooth UI transitions, staggered lists, enter/leave effects, and canvas-based animated assets exportable as GIFs using spring physics identical to react-motion's feel. Activate this skill for any React animation task requiring natural motion, legacy react-motion code, or generating exportable animated content/graphics.
---

# React-Motion Mastery Skill

You are an expert in **react-motion** (the classic spring-physics animation library by Cheng Lou). Use spring-based interpolation for natural, momentum-preserving animations — no durations or easings.

**Note**: react-motion is a legacy library (last major update ~2018). For new projects, consider Framer Motion or React Spring, but use react-motion when explicitly requested or for legacy compatibility.

**Compatibility**: Requires React 16+ and npm for installations. For GIF export, uses client-side gif.js (CDN-compatible).

## Setup (Always Include in Generated Code)

```bash
npm install react-motion
```

For GIF export in canvas examples:

```bash
npm install gif.js
```

Or use CDN for quick prototypes (see assets/exportable-gif-animation.jsx).

Key imports:

```jsx
import { Motion, spring, StaggeredMotion, TransitionMotion, presets } from 'react-motion';
```

Common presets: `presets.noWobble`, `presets.gentle`, `presets.wobbly`, `presets.stiff`.

## UI Component Animations (Use react-motion Directly)

### Basic Single-Value or Multi-Value Animation

Use `<Motion>` for animating one component. See full template: assets/basic-ui-motion.jsx.

Example snippet:

```jsx
<Motion defaultStyle={{x: 0, opacity: 0}} style={{x: spring(300, presets.wobbly), opacity: spring(1)}}>
  {({x, opacity}) => (
    <div style={{transform: `translateX(${x}px)`, opacity}}>
      Animated element
    </div>
  )}
</Motion>
```

### Staggered Lists

Use `<StaggeredMotion>` for sequential item animations. See full template: assets/staggered-ui-motion.jsx.

### Enter/Leave Transitions

Use `<TransitionMotion>` for mounting/unmounting with styles. See full template: assets/transition-ui-motion.jsx.

## Canvas-Based Animations & Asset Export (Spring Physics Replication)

For high-FPS canvas animations and reliable GIF export, replicate react-motion's spring physics in vanilla JS (better performance than forcing React re-renders).

Use the utility in assets/spring-physics.js — it mirrors react-motion's configs exactly.

Full exportable example (bouncing colored shapes with controls): assets/exportable-gif-animation.jsx.

This template includes:

- requestAnimationFrame loop
- Spring physics updates
- Canvas drawing
- Start/stop GIF capture using gif.js
- Download as GIF

Adapt the drawScene function for custom animations (particles, paths, text, etc.).

## Best Practices

- Tune with `spring(value, {stiffness: X, damping: Y})` or presets.
- For lists >20 items, consider performance.
- Always provide complete, runnable components.
- For exportable assets, use the canvas + spring physics pattern — it produces smooth 30-60 FPS GIFs without React overhead.
- If the user wants SVG animations, combine spring values with SVG attributes (see assets/basic-ui-motion.jsx adapted for SVG).

## When generating code:

- Start with a complete App.jsx or component.
- Include import statements and setup.
- Add comments explaining the animation.
- If export requested, base on the exportable template and customize the scene.
- Test logic mentally for spring settling and edge cases.
