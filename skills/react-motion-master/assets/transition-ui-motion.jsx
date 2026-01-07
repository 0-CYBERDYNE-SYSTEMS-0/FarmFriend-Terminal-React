import React, { useState } from 'react';
import { TransitionMotion, spring, presets } from 'react-motion';

const TransitionExample = () => {
  const [items, setItems] = useState([{ key: '1', data: 'Item 1' }]);

  const willEnter = () => ({ scale: spring(0), opacity: spring(0) });
  const willLeave = () => ({ scale: spring(0), opacity: spring(0) });

  const getStyles = () => items.map(item => ({
    key: item.key,
    data: item.data,
    style: { scale: spring(1, presets.wobbly), opacity: spring(1) },
  }));

  return (
    <div>
      <button onClick={() => setItems(prev => [...prev, { key: `${prev.length + 1}`, data: `Item ${prev.length + 1}` }])}>
        Add Item
      </button>
      <button onClick={() => setItems(prev => prev.slice(0, -1))}>Remove Item</button>

      <TransitionMotion willEnter={willEnter} willLeave={willLeave} styles={getStyles()}>
        {interpolated => (
          <div>
            {interpolated.map(config => (
              <div key={config.key} style={{
                transform: `scale(${config.style.scale})`,
                opacity: config.style.opacity,
                margin: 10,
                padding: 20,
                background: '#2ecc71',
                color: 'white',
              }}>
                {config.data}
              </div>
            ))}
          </div>
        )}
      </TransitionMotion>
    </div>
  );
};

export default TransitionExample;
