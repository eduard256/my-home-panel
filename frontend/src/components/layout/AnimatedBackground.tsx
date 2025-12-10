import { useEffect, useRef, useCallback } from 'react';

interface Particle {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  alpha: number;
  alphaDirection: number;
}

interface Ray {
  angle: number;
  length: number;
  width: number;
  alpha: number;
  speed: number;
}

/**
 * AnimatedBackground component
 * Creates a premium animated background with:
 * - Purple rays emanating from top-right corner
 * - Fog/smoke effect with slow-moving particles
 * - 60fps rendering on canvas
 */
export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const raysRef = useRef<Ray[]>([]);
  const timeRef = useRef<number>(0);

  const initParticles = useCallback((width: number, height: number) => {
    const particles: Particle[] = [];
    const particleCount = Math.min(15, Math.floor((width * height) / 80000));

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 150 + 100,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.2,
        alpha: Math.random() * 0.08 + 0.02,
        alphaDirection: Math.random() > 0.5 ? 1 : -1,
      });
    }

    return particles;
  }, []);

  const initRays = useCallback(() => {
    const rays: Ray[] = [];
    const rayCount = 8;

    for (let i = 0; i < rayCount; i++) {
      rays.push({
        angle: (Math.PI / 4) + (Math.PI / 3) * (i / rayCount) + Math.random() * 0.2,
        length: 0.8 + Math.random() * 0.4,
        width: 0.02 + Math.random() * 0.03,
        alpha: 0.03 + Math.random() * 0.04,
        speed: 0.0002 + Math.random() * 0.0003,
      });
    }

    return rays;
  }, []);

  const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Clear canvas with dark background
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, width, height);

    // Draw rays from top-right corner
    const rayOriginX = width + 100;
    const rayOriginY = -100;
    const maxRayLength = Math.sqrt(width * width + height * height) * 1.5;

    raysRef.current.forEach((ray) => {
      const currentAngle = ray.angle + timeRef.current * ray.speed;
      const rayLength = maxRayLength * ray.length;

      const gradient = ctx.createLinearGradient(
        rayOriginX,
        rayOriginY,
        rayOriginX - Math.cos(currentAngle) * rayLength,
        rayOriginY + Math.sin(currentAngle) * rayLength
      );

      gradient.addColorStop(0, `rgba(155, 135, 245, ${ray.alpha * 1.5})`);
      gradient.addColorStop(0.3, `rgba(155, 135, 245, ${ray.alpha})`);
      gradient.addColorStop(0.7, `rgba(124, 58, 237, ${ray.alpha * 0.5})`);
      gradient.addColorStop(1, 'rgba(124, 58, 237, 0)');

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(rayOriginX, rayOriginY);

      const endX = rayOriginX - Math.cos(currentAngle) * rayLength;
      const endY = rayOriginY + Math.sin(currentAngle) * rayLength;

      const perpAngle = currentAngle + Math.PI / 2;
      const halfWidth = rayLength * ray.width;

      ctx.lineTo(
        endX + Math.cos(perpAngle) * halfWidth,
        endY + Math.sin(perpAngle) * halfWidth
      );
      ctx.lineTo(
        endX - Math.cos(perpAngle) * halfWidth,
        endY - Math.sin(perpAngle) * halfWidth
      );
      ctx.closePath();

      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.restore();
    });

    // Draw fog/smoke particles
    particlesRef.current.forEach((particle) => {
      // Update particle position
      particle.x += particle.vx;
      particle.y += particle.vy;

      // Wrap around edges
      if (particle.x < -particle.radius) particle.x = width + particle.radius;
      if (particle.x > width + particle.radius) particle.x = -particle.radius;
      if (particle.y < -particle.radius) particle.y = height + particle.radius;
      if (particle.y > height + particle.radius) particle.y = -particle.radius;

      // Pulse alpha
      particle.alpha += 0.0002 * particle.alphaDirection;
      if (particle.alpha > 0.1) particle.alphaDirection = -1;
      if (particle.alpha < 0.02) particle.alphaDirection = 1;

      // Draw particle with radial gradient
      const gradient = ctx.createRadialGradient(
        particle.x,
        particle.y,
        0,
        particle.x,
        particle.y,
        particle.radius
      );

      gradient.addColorStop(0, `rgba(155, 135, 245, ${particle.alpha})`);
      gradient.addColorStop(0.5, `rgba(124, 58, 237, ${particle.alpha * 0.5})`);
      gradient.addColorStop(1, 'rgba(124, 58, 237, 0)');

      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    });

    // Add subtle vignette effect
    const vignetteGradient = ctx.createRadialGradient(
      width / 2,
      height / 2,
      height * 0.3,
      width / 2,
      height / 2,
      height
    );
    vignetteGradient.addColorStop(0, 'rgba(10, 10, 15, 0)');
    vignetteGradient.addColorStop(1, 'rgba(10, 10, 15, 0.4)');
    ctx.fillStyle = vignetteGradient;
    ctx.fillRect(0, 0, width, height);

    // Update time for ray rotation
    timeRef.current += 1;
  }, []);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    draw(ctx, canvas.width, canvas.height);
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [draw]);

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }

    // Reinitialize particles on resize
    particlesRef.current = initParticles(rect.width, rect.height);
  }, [initParticles]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Initialize
    handleResize();
    raysRef.current = initRays();

    // Start animation
    animate();

    // Handle window resize
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [animate, handleResize, initRays]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      style={{
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
}
