import React, { useRef, useEffect, useState } from 'react';
import GIF from 'gif.js'; // npm install gif.js
// For CDN prototype: <script src="https://unpkg.com/gif.js@0.2.0/dist/gif.min.js"></script>

const ExportableGIFAnimation = ({ width = 600, height = 400 }) => {
  const canvasRef = useRef(null);
  const [capturing, setCapturing] = useState(false);
  const [gifUrl, setGifUrl] = useState(null);
  const capturerRef = useRef(null);
  const animationRef = useRef(null);

  // Spring state (multi-spring example)
  const springs = useRef([
    { pos: -100, vel: 0 }, // ball 1 x
    { pos: 0, vel: 50 },   // ball 1 y velocity initial
    { pos: 100, vel: 0 },  // ball 2 etc.
  ]);

  const config = { stiffness: 180, damping: 12 }; // wobbly preset

  const drawScene = (ctx, time, springValues) => {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, width, height);

    // Example: bouncing balls with spring to center
    const [x1, y1, x2] = springValues;

    ctx.fillStyle = `hsl(${time * 0.1 % 360}, 100%, 50%)`;
    ctx.beginPath();
    ctx.arc(width / 2 + x1, height / 2 + Math.abs(y1 * Math.sin(time)), 50, 0, Math.PI * 2);
    ctx.fill();

    // Add more shapes using springValues...
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let lastTime = 0;

    const loop = (time) => {
      const dt = (time - lastTime) / 1000 || 0.016;
      lastTime = time;

      // Update springs (example toward 0)
      springs.current = springs.current.map(s => {
        const force = -config.stiffness * s.pos;
        const damper = -config.damping * s.vel;
        const acc = force + damper;
        const newVel = s.vel + acc * dt;
        const newPos = s.pos + newVel * dt;
        return { pos: newPos, vel: newVel };
      });

      const springValues = springs.current.map(s => s.pos);

      drawScene(ctx, time / 1000, springValues);

      if (capturing && capturerRef.current) {
        capturerRef.current.addFrame(ctx, { copy: true, delay: 16 });
      }

      animationRef.current = requestAnimationFrame(loop);
    };

    animationRef.current = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(animationRef.current);
  }, [capturing]);

  const startCapture = () => {
    if (capturerRef.current) return;

    const workerScript = 'https://unpkg.com/gif.js@0.2.0/gif.worker.js'; // CDN worker

    const gif = new GIF({
      workers: 4,
      quality: 10,
      width,
      height,
      workerScript,
    });

    gif.on('finished', blob => {
      const url = URL.createObjectURL(blob);
      setGifUrl(url);
      setCapturing(false);
    });

    capturerRef.current = gif;
    setCapturing(true);
  };

  const stopCapture = () => {
    if (capturerRef.current && capturing) {
      capturerRef.current.render();
      capturerRef.current = null;
    }
  };

  return (
    <div>
      <canvas ref={canvasRef} width={width} height={height} style={{ border: '1px solid #000' }} />
      <div style={{ marginTop: 20 }}>
        <button onClick={startCapture} disabled={capturing}>Start GIF Capture</button>
        <button onClick={stopCapture} disabled={!capturing}>Stop & Download GIF</button>
        {gifUrl && <a href={gifUrl} download="animation.gif">Download Generated GIF</a>}
      </div>
    </div>
  );
};

export default ExportableGIFAnimation;
