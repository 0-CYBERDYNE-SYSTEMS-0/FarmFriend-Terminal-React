import React from 'react';
import { StaggeredMotion, spring, presets } from 'react-motion';

const items = ['One', 'Two', 'Three', 'Four'];

const StaggeredMotionExample = () => (
  <StaggeredMotion
    defaultStyles={items.map(() => ({ y: -100, o: 0 }))}
    styles={prev => prev.map((_, i) => (
      i === 0
        ? { y: spring(0, presets.gentle), o: spring(1) }
        : { y: spring(prev[i - 1].y), o: spring(prev[i - 1].o) }
    ))}>
    {interpolatingStyles => (
      <div>
        {interpolatingStyles.map((style, i) => (
          <div key={i} style={{
            transform: `translateY(${style.y}px)`,
            opacity: style.o,
            margin: 10,
            padding: 20,
            background: '#e74c3c',
            color: 'white',
          }}>
            {items[i]}
          </div>
        ))}
      </div>
    )}
  </StaggeredMotion>
);

export default StaggeredMotionExample;
