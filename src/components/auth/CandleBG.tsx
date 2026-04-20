'use client';
import { useRef, useEffect } from 'react';

export default function CandleBG() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let W = (canvas.width = window.innerWidth);
    let H = (canvas.height = window.innerHeight);
    const onResize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
    window.addEventListener('resize', onResize);

    const R = (a: number, b: number) => a + Math.random() * (b - a);

    interface Particle {
      x: number; y: number; speed: number; bull: boolean;
      bodyH: number; wickT: number; wickB: number; bW: number;
      alpha: number; wobble: number; wobAmp: number;
    }
    interface Splash {
      ring?: boolean; x: number; y: number;
      vx?: number; vy?: number; grav?: number;
      alpha: number; fade: number; r: number;
      maxR?: number; grow?: number; bull: boolean;
      rot?: number; rotSpd?: number; w?: number; h?: number;
    }

    const mkCandle = (randomY?: number): Particle => ({
      x: R(0, W),
      y: randomY !== undefined ? randomY : H + R(20, 140),
      speed: R(0.12, 0.55),           // slower: was R(0.3, 1.1)
      bull: Math.random() > 0.44,
      bodyH: R(20, 52),
      wickT: R(8, 22), wickB: R(6, 18),
      bW: R(6, 14),
      alpha: R(0.18, 0.50),
      wobble: R(0, Math.PI * 2),
      wobAmp: R(0.1, 0.55),
    });

    const particles: Particle[] = [];
    const splashes: Splash[] = [];
    for (let i = 0; i < 32; i++) particles.push(mkCandle(R(-H * 0.1, H * 1.05)));

    const burst = (x: number, bull: boolean) => {
      const col = bull ? [55, 195, 105] : [215, 65, 65];

      // Flash at top
      splashes.push({ ring: true, x, y: 6, r: 1, maxR: R(28, 52), alpha: 0.85, fade: 0.016, grow: R(1.8, 3.0), bull });

      // Second outer ring
      splashes.push({ ring: true, x, y: 6, r: 1, maxR: R(14, 28), alpha: 0.5, fade: 0.025, grow: R(1.2, 2.0), bull });

      // Particle debris — more particles, better spread
      const n = Math.floor(R(12, 22));
      for (let i = 0; i < n; i++) {
        const ang = R(-Math.PI * 0.95, -Math.PI * 0.05);
        const spd = R(1.5, 5.5);
        splashes.push({
          x, y: 6,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          grav: R(0.08, 0.22),
          alpha: R(0.6, 1.0),
          fade: R(0.010, 0.022),
          r: R(1.0, 3.8),
          bull,
        });
      }

      // Tiny rect shards
      const shards = Math.floor(R(4, 8));
      for (let i = 0; i < shards; i++) {
        const ang = R(-Math.PI * 0.9, -Math.PI * 0.1);
        const spd = R(0.8, 3.2);
        splashes.push({
          x, y: 6,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          grav: R(0.06, 0.14),
          alpha: R(0.4, 0.8),
          fade: R(0.012, 0.020),
          r: 0,                          // flag for rect shard
          w: R(2, 5), h: R(6, 14),
          rot: R(0, Math.PI * 2),
          rotSpd: R(-0.12, 0.12),
          bull,
        });
      }
    };

    let frame = 0, raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      const bg = ctx.createLinearGradient(0, 0, W * 0.5, H);
      bg.addColorStop(0, '#0a0f18'); bg.addColorStop(0.5, '#0c1420'); bg.addColorStop(1, '#091018');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      const gl = ctx.createRadialGradient(W * 0.38, H * 0.44, 0, W * 0.38, H * 0.44, W * 0.5);
      gl.addColorStop(0, 'rgba(12,50,68,0.18)'); gl.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);

      for (let i = particles.length - 1; i >= 0; i--) {
        const c = particles[i];
        const sway = Math.sin(frame * 0.015 * c.speed + c.wobble) * c.wobAmp * 9;
        const cx2 = c.x + sway;
        const col = c.bull ? `rgba(55,195,105,${c.alpha})` : `rgba(215,65,65,${c.alpha})`;
        const wc  = c.bull ? `rgba(55,195,105,${c.alpha * 0.5})` : `rgba(215,65,65,${c.alpha * 0.5})`;

        ctx.strokeStyle = wc; ctx.lineWidth = 1.1; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(cx2, c.y - c.bodyH / 2 - c.wickT); ctx.lineTo(cx2, c.y - c.bodyH / 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx2, c.y + c.bodyH / 2); ctx.lineTo(cx2, c.y + c.bodyH / 2 + c.wickB); ctx.stroke();
        ctx.fillStyle = col;
        ctx.beginPath(); (ctx as any).roundRect(cx2 - c.bW / 2, c.y - c.bodyH / 2, c.bW, c.bodyH, 1.5); ctx.fill();

        c.y -= c.speed;
        if (c.y + c.bodyH / 2 + c.wickT < 0) {
          burst(cx2, c.bull);
          particles.splice(i, 1);
          particles.push(mkCandle());
        }
      }

      if (frame % 55 === 0 && particles.length < 34) particles.push(mkCandle());

      for (let i = splashes.length - 1; i >= 0; i--) {
        const s = splashes[i];
        if (s.alpha <= 0) { splashes.splice(i, 1); continue; }
        const col = s.bull ? [55, 195, 105] : [215, 65, 65];
        const sc = `rgba(${col[0]},${col[1]},${col[2]},${s.alpha})`;

        if (s.ring) {
          ctx.strokeStyle = sc; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.stroke();
          s.r += s.grow!;
          s.alpha = s.r > s.maxR! ? 0 : s.alpha - s.fade;
        } else if (s.w !== undefined) {
          // rect shard
          ctx.save();
          ctx.translate(s.x, s.y);
          ctx.rotate(s.rot!);
          ctx.fillStyle = sc;
          ctx.fillRect(-s.w! / 2, -s.h! / 2, s.w!, s.h!);
          ctx.restore();
          s.x += s.vx!; s.y += s.vy!;
          s.vy = (s.vy || 0) + (s.grav || 0);
          s.rot! += s.rotSpd!;
          s.alpha -= s.fade;
        } else {
          ctx.fillStyle = sc;
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
          s.x += s.vx!; s.y += s.vy!;
          s.vy = (s.vy || 0) + (s.grav || 0);
          s.alpha -= s.fade;
        }
      }

      // top fade mask
      const tm = ctx.createLinearGradient(0, 0, 0, 10);
      tm.addColorStop(0, 'rgba(10,15,24,1)'); tm.addColorStop(1, 'rgba(10,15,24,0)');
      ctx.fillStyle = tm; ctx.fillRect(0, 0, W, 10);

      const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.12, W / 2, H / 2, W * 0.74);
      vig.addColorStop(0, 'rgba(10,15,24,0.05)'); vig.addColorStop(0.55, 'rgba(10,15,24,0.22)'); vig.addColorStop(1, 'rgba(7,10,16,0.78)');
      ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);

      frame++; raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />;
}
