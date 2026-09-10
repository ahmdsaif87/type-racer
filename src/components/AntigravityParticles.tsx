import React, { useEffect, useRef } from 'react';

interface Particle {
  angle: number;
  baseRadius: number;
  radius: number;
  speed: number;
  size: number;
  color: string;
  vx: number;
  vy: number;
  length: number;
}

const PARTICLE_COLORS = [
  '#00e5ff', // Cyan / Accent glow
  '#3b82f6', // Electric Blue
  '#ec4899', // Pink / Rose
  '#8b5cf6', // Violet / Purple
  '#06b6d4', // Darker Cyan
  '#f43f5e'  // Coral / Red
];

export const AntigravityParticles: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const mouse = {
      x: -1000,
      y: -1000,
      targetX: -1000,
      targetY: -1000
    };

    // Generate ~150 orbital particles matching Antigravity design
    const particleCount = Math.min(180, Math.floor((width * height) / 8000));
    const particles: Particle[] = [];

    const minDimension = Math.min(width, height);

    for (let i = 0; i < particleCount; i++) {
      const radiusRatio = Math.pow(Math.random(), 0.7); // Distribute outwards
      const baseRadius = 60 + radiusRatio * (minDimension * 0.45);
      
      particles.push({
        angle: Math.random() * Math.PI * 2,
        baseRadius,
        radius: baseRadius,
        speed: (Math.random() - 0.5) * 0.003 + (Math.random() > 0.5 ? 0.001 : -0.001),
        size: Math.random() * 2 + 1.5,
        length: Math.random() * 8 + 3,
        color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
        vx: 0,
        vy: 0
      });
    }

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        mouse.targetX = e.touches[0].clientX;
        mouse.targetY = e.touches[0].clientY;
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove);

    const render = () => {
      // Smooth lerp mouse position
      mouse.x += (mouse.targetX - mouse.x) * 0.1;
      mouse.y += (mouse.targetY - mouse.y) * 0.1;

      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.angle += p.speed;

        // Base orbital target coordinates
        const targetX = centerX + Math.cos(p.angle) * p.radius;
        const targetY = centerY + Math.sin(p.angle) * p.radius;

        // Calculate distance to mouse cursor
        const currentX = targetX + p.vx;
        const currentY = targetY + p.vy;

        const dx = currentX - mouse.x;
        const dy = currentY - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Antigravity cursor repulsion physics
        const hoverRadius = 180;
        if (dist < hoverRadius && dist > 0) {
          const force = (1 - dist / hoverRadius) * 4;
          const angle = Math.atan2(dy, dx);
          p.vx += Math.cos(angle) * force;
          p.vy += Math.sin(angle) * force;
        }

        // Damping spring force back to orbit
        p.vx *= 0.91;
        p.vy *= 0.91;

        const posX = targetX + p.vx;
        const posY = targetY + p.vy;

        // Tangent angle for dash rotation along the orbit
        const tangentAngle = p.angle + Math.PI / 2;

        ctx.save();
        ctx.translate(posX, posY);
        ctx.rotate(tangentAngle);

        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.55;
        
        // Draw elongated Antigravity capsule particle
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(-p.length / 2, -p.size / 2, p.length, p.size, p.size / 2);
        } else {
          ctx.rect(-p.length / 2, -p.size / 2, p.length, p.size);
        }
        ctx.fill();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-500 opacity-60 dark:opacity-75"
    />
  );
};
