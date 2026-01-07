import React from 'react';
import { Motion, spring, presets } from 'react-motion';

const BasicMotion = () => (
  <Motion defaultStyle={{ x: -200, rotate: 0 }} style={{ x: spring(0, presets.gentle), rotate: spring(360) }}>
    {({ x, rotate }) => (
      <div style={{
        transform: `translateX(${x}px) rotate(${rotate}deg)`,
        background: '#3498db',
        width: 100,
        height: 100,
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
      }}>
        Basic Motion
      </div>
    )}
  </Motion>
);

export default BasicMotion;
