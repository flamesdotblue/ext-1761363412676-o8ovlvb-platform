import { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, Home, DoorOpen, Gauge } from 'lucide-react';

// Simple colors per car type
const CAR_COLORS = {
  Porsche: '#d32f2f',
  BMW: '#1976d2',
  'G-Wagon': '#9e9e9e',
  Supra: '#ff9800',
  Bolero: '#2e7d32',
  'Mahindra Marshal': '#7b1fa2',
};

const ENV_CONFIGS = {
  City: { road: '#2b2e34', divider: '#ffffff', bg: ['#0a0a0a', '#141414'], obstacles: ['#90caf9', '#ef9a9a', '#a5d6a7'] },
  Village: { road: '#3a2e20', divider: '#f4e5b2', bg: ['#0a0f09', '#141b10'], obstacles: ['#8d6e63', '#a1887f', '#795548'] },
  Highway: { road: '#20232a', divider: '#d9d9d9', bg: ['#050505', '#0f0f10'], obstacles: ['#cfd8dc', '#90a4ae', '#78909c'] },
  Market: { road: '#2d2330', divider: '#ffd54f', bg: ['#0a0710', '#140e1e'], obstacles: ['#f48fb1', '#ba68c8', '#ce93d8'] },
};

export default function GameCanvas({ gameMode, car, environment, onExit, onSubmitScore }) {
  const canvasRef = useRef(null);
  const reqRef = useRef();
  const [paused, setPaused] = useState(false);
  const [camera, setCamera] = useState('third'); // 'third' | 'cockpit'
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highest, setHighest] = useState(Number(localStorage.getItem('rd_highest') || 0));
  const [timeLeft, setTimeLeft] = useState(60);
  const [speed, setSpeed] = useState(120); // km/h
  const [nitro, setNitro] = useState(100);
  const [modeLabel, setModeLabel] = useState(gameMode);

  const input = useRef({ left: false, right: false, accel: false, brake: false, nitro: false });

  useEffect(() => {
    const onKey = (e, down) => {
      if (e.repeat) return;
      switch (e.code) {
        case 'ArrowLeft': input.current.left = down; break;
        case 'ArrowRight': input.current.right = down; break;
        case 'KeyW': input.current.accel = down; break;
        case 'KeyS': input.current.brake = down; break;
        case 'Space': input.current.nitro = down; break;
        case 'KeyC': if (down) setCamera((c) => c === 'third' ? 'cockpit' : 'third'); break;
        case 'Escape': if (down) setPaused((p) => !p); break;
        default: break;
      }
    };
    window.addEventListener('keydown', (e) => onKey(e, true));
    window.addEventListener('keyup', (e) => onKey(e, false));
    return () => {
      window.removeEventListener('keydown', (e) => onKey(e, true));
      window.removeEventListener('keyup', (e) => onKey(e, false));
    };
  }, []);

  // Simple WebAudio for engine and nitro
  const audioRef = useRef({ ctx: null, engine: null, nitro: null });
  useEffect(() => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const engine = ctx.createOscillator();
    const engineGain = ctx.createGain();
    engine.type = 'sawtooth';
    engine.frequency.value = 80;
    engineGain.gain.value = 0.04;
    engine.connect(engineGain).connect(ctx.destination);
    engine.start();

    const nitro = ctx.createOscillator();
    const nitroGain = ctx.createGain();
    nitro.type = 'square';
    nitro.frequency.value = 0;
    nitroGain.gain.value = 0.0;
    nitro.connect(nitroGain).connect(ctx.destination);
    nitro.start();
    audioRef.current = { ctx, engine, engineGain, nitro, nitroGain };
    return () => {
      engine.stop(); nitro.stop(); ctx.close();
    };
  }, []);

  useEffect(() => {
    setModeLabel(gameMode);
    setScore(0);
    setGameOver(false);
    setPaused(false);
    setNitro(100);
    setSpeed(120);
    setTimeLeft(60);
  }, [gameMode, car, environment]);

  // Game state
  const stateRef = useRef(null);
  useEffect(() => {
    const lanes = 4;
    const laneWidth = 80;
    const roadWidth = lanes * laneWidth;
    const player = { lane: 1, x: 0, y: 0, w: 60, h: 120, vx: 0, vy: 0 };
    const obstacles = [];
    const env = ENV_CONFIGS[environment] || ENV_CONFIGS.City;
    stateRef.current = { lanes, laneWidth, roadWidth, player, obstacles, env, dist: 0, spawnT: 0 };
  }, [environment]);

  // Timed mode countdown
  useEffect(() => {
    if (paused || gameOver || modeLabel !== 'Timed') return;
    if (timeLeft <= 0) {
      setGameOver(true);
      onSubmitScore(score);
      return;
    }
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [paused, gameOver, modeLabel, timeLeft, score, onSubmitScore]);

  // Main loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = Math.floor(w * DPR);
      canvas.height = Math.floor(h * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let last = performance.now();

    const loop = (now) => {
      reqRef.current = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const g = stateRef.current;
      if (!g) return;

      // Update audio
      if (audioRef.current.engine) {
        const targetHz = 60 + (speed / 200) * 220;
        audioRef.current.engine.frequency.setTargetAtTime(targetHz, audioRef.current.ctx.currentTime, 0.05);
        audioRef.current.engineGain.gain.setTargetAtTime(paused || gameOver ? 0.0 : 0.04, audioRef.current.ctx.currentTime, 0.1);
      }

      if (paused || gameOver) {
        render(ctx);
        return;
      }

      update(dt);
      render(ctx);
    };

    const update = (dt) => {
      const g = stateRef.current;
      const player = g.player;
      const maxSpeed = 240;
      const minSpeed = 0;

      // Acceleration
      const accelRate = 60; // km/h per sec
      const brakeRate = 120;
      const naturalDrag = 20;

      if (input.current.accel) setSpeed((s) => Math.min(maxSpeed, s + accelRate * dt));
      else setSpeed((s) => Math.max(minSpeed, s - naturalDrag * dt));
      if (input.current.brake) setSpeed((s) => Math.max(minSpeed, s - brakeRate * dt));

      // Nitro
      if (input.current.nitro && nitro > 0) {
        setSpeed((s) => Math.min(320, s + 160 * dt));
        setNitro((n) => Math.max(0, n - 25 * dt));
        if (audioRef.current.nitro) {
          audioRef.current.nitro.frequency.setTargetAtTime(440, audioRef.current.ctx.currentTime, 0.02);
          audioRef.current.nitroGain.gain.setTargetAtTime(0.03, audioRef.current.ctx.currentTime, 0.02);
        }
      } else {
        if (audioRef.current.nitro) {
          audioRef.current.nitro.frequency.setTargetAtTime(0, audioRef.current.ctx.currentTime, 0.2);
          audioRef.current.nitroGain.gain.setTargetAtTime(0.0, audioRef.current.ctx.currentTime, 0.2);
        }
        setNitro((n) => Math.min(100, n + 8 * dt));
      }

      // Lateral movement between lanes
      const targetLane = Math.max(0, Math.min(g.lanes - 1, g.player.lane + (input.current.right ? 1 : 0) - (input.current.left ? 1 : 0)));
      g.player.lane += Math.sign(targetLane - g.player.lane) * Math.min(1, 8 * dt);
      player.x = (canvasRef.current.clientWidth / 2) - (g.roadWidth / 2) + g.laneWidth * (0.5 + g.player.lane);
      player.y = canvasRef.current.clientHeight - (camera === 'third' ? 180 : 120);

      // Progress and score
      const mps = (speed * 1000) / 3600;
      g.dist += mps * dt;
      setScore((s) => Math.floor(g.dist / 10));
      if (modeLabel === 'Endless') {
        // +1 per second as well
        setScore((s) => s + Math.floor(dt));
      }

      // Spawn obstacles
      g.spawnT -= dt;
      if (g.spawnT <= 0) {
        const count = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < count; i++) {
          const lane = Math.floor(Math.random() * g.lanes);
          const w = 60, h = 120;
          const x = (canvasRef.current.clientWidth / 2) - (g.roadWidth / 2) + g.laneWidth * (0.5 + lane);
          const y = -h - Math.random() * 200;
          const rel = 40 + Math.random() * 140; // km/h incoming
          const color = g.env.obstacles[Math.floor(Math.random() * g.env.obstacles.length)];
          const type = Math.random() < 0.15 && environment === 'Village' ? 'cow' : 'car';
          g.obstacles.push({ lane, x, y, w, h, speed: rel, color, type });
        }
        g.spawnT = Math.max(0.5, 1.2 - (speed / 300));
      }

      // Move obstacles and check collision
      for (let i = g.obstacles.length - 1; i >= 0; i--) {
        const o = g.obstacles[i];
        const rel = ((o.speed + speed) * 1000) / 3600; // incoming relative speed
        o.y += rel * dt;
        if (o.y > canvasRef.current.clientHeight + 50) g.obstacles.splice(i, 1);
      }

      // Collision detection
      for (const o of g.obstacles) {
        if (Math.abs(o.x - player.x) < (o.w + player.w) * 0.5 && Math.abs(o.y - player.y) < (o.h + player.h) * 0.5) {
          // crash
          setGameOver(true);
          onSubmitScore(Math.floor(score));
          break;
        }
      }
    };

    const render = (ctx) => {
      const g = stateRef.current;
      const w = canvasRef.current.clientWidth;
      const h = canvasRef.current.clientHeight;
      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, g.env.bg[0]);
      grad.addColorStop(1, g.env.bg[1]);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Road
      const roadX = w / 2 - g.roadWidth / 2;
      ctx.fillStyle = g.env.road;
      ctx.fillRect(roadX, 0, g.roadWidth, h);

      // Lane dividers with perspective movement
      const dashH = 30;
      const dashGap = 40;
      const offset = (performance.now() * (speed / 2000)) % (dashH + dashGap);
      ctx.strokeStyle = g.env.divider;
      ctx.lineWidth = 4;
      ctx.setLineDash([dashH, dashGap]);
      for (let i = 1; i < g.lanes; i++) {
        const x = roadX + i * g.laneWidth;
        ctx.beginPath();
        ctx.moveTo(x, -offset);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Obstacles
      for (const o of g.obstacles) {
        ctx.fillStyle = o.color;
        ctx.fillRect(o.x - o.w / 2, o.y - o.h / 2, o.w, o.h);
        if (o.type === 'cow') {
          ctx.fillStyle = '#3e2723';
          ctx.fillRect(o.x - 15, o.y - 20, 30, 15);
          ctx.fillRect(o.x - 10, o.y - 5, 8, 8);
          ctx.fillRect(o.x + 2, o.y - 5, 8, 8);
        }
      }

      // Player car (simple rectangle with gloss)
      const pColor = CAR_COLORS[car] || '#e53935';
      const player = g.player;
      ctx.fillStyle = pColor;
      ctx.fillRect(player.x - player.w / 2, player.y - player.h / 2, player.w, player.h);
      const gloss = ctx.createLinearGradient(player.x, player.y - player.h / 2, player.x, player.y + player.h / 2);
      gloss.addColorStop(0, 'rgba(255,255,255,0.4)');
      gloss.addColorStop(0.3, 'rgba(255,255,255,0.15)');
      gloss.addColorStop(1, 'rgba(255,255,255,0.0)');
      ctx.fillStyle = gloss;
      ctx.fillRect(player.x - player.w / 2, player.y - player.h / 2, player.w, player.h);

      // Cockpit overlay
      if (camera === 'cockpit') {
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(0, 0, w, 50);
        ctx.fillRect(0, h - 70, w, 70);
      }
    };

    reqRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(reqRef.current);
      ro.disconnect();
    };
  }, [paused, gameOver, camera, nitro, speed, modeLabel, environment, car, onSubmitScore]);

  useEffect(() => {
    setHighest(Number(localStorage.getItem('rd_highest') || 0));
  }, [gameOver]);

  const restart = () => {
    setGameOver(false);
    setPaused(false);
    setScore(0);
    setNitro(100);
    setSpeed(120);
    setTimeLeft(60);
    // reset world
    const g = stateRef.current;
    if (g) {
      g.obstacles.length = 0;
      g.dist = 0;
      g.spawnT = 0;
    }
  };

  const mobileBtn = (label, onDown, onUp, className='') => (
    <button
      onTouchStart={(e)=>{e.preventDefault(); onDown();}}
      onTouchEnd={(e)=>{e.preventDefault(); onUp();}}
      onMouseDown={(e)=>{e.preventDefault(); onDown();}}
      onMouseUp={(e)=>{e.preventDefault(); onUp();}}
      className={`select-none rounded-xl bg-white/10 backdrop-blur border border-white/20 text-white text-sm px-4 py-3 ${className}`}
    >{label}</button>
  );

  return (
    <div className="relative w-full h-screen bg-black">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      <div className="absolute top-3 left-3 flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-xl bg-white/10 backdrop-blur border border-white/20 px-3 py-2">
          <Gauge className="w-4 h-4" />
          <div className="text-xs">{Math.round(speed)} km/h</div>
        </div>
        <div className="rounded-xl bg-white/10 backdrop-blur border border-white/20 px-3 py-2 text-xs">Nitro: {Math.round(nitro)}%</div>
        <div className="rounded-xl bg-white/10 backdrop-blur border border-white/20 px-3 py-2 text-xs">Mode: {modeLabel}{modeLabel==='Timed' ? ` • ${timeLeft}s` : ''}</div>
        <button onClick={()=>setPaused(p=>!p)} className="rounded-xl bg-white/10 backdrop-blur border border-white/20 px-3 py-2 hover:bg-white/20">
          {paused ? <Play className="w-4 h-4"/> : <Pause className="w-4 h-4"/>}
        </button>
      </div>

      <div className="absolute top-3 right-3 flex items-center gap-2">
        <button onClick={restart} className="rounded-xl bg-white/10 backdrop-blur border border-white/20 px-3 py-2 hover:bg-white/20 flex items-center gap-2"><RotateCcw className="w-4 h-4"/>Restart</button>
        <button onClick={()=>onExit()} className="rounded-xl bg-white/10 backdrop-blur border border-white/20 px-3 py-2 hover:bg-white/20 flex items-center gap-2"><Home className="w-4 h-4"/>Menu</button>
        <button onClick={()=>window.close()} className="rounded-xl bg-white/10 backdrop-blur border border-white/20 px-3 py-2 hover:bg-white/20 flex items-center gap-2"><DoorOpen className="w-4 h-4"/>Exit</button>
      </div>

      <div className="absolute bottom-3 left-3 flex items-center gap-2">
        <div className="rounded-xl bg-white/10 backdrop-blur border border-white/20 px-3 py-2 text-sm">Score: {score}</div>
        <div className="rounded-xl bg-white/10 backdrop-blur border border-white/20 px-3 py-2 text-sm">Highest: {highest}</div>
        <div className="rounded-xl bg-white/10 backdrop-blur border border-white/20 px-3 py-2 text-sm">View: {camera === 'third' ? 'Third-person' : 'Cockpit'} (C)</div>
      </div>

      <div className="absolute bottom-3 right-3 hidden sm:flex items-center gap-2">
        <div className="rounded-xl bg-white/10 backdrop-blur border border-white/20 px-3 py-2 text-xs">PC: ← → steer • W accel • S brake • Space nitro • C camera</div>
      </div>

      {/* Mobile controls */}
      <div className="absolute bottom-20 left-3 right-3 sm:hidden flex items-center justify-between gap-3">
        <div className="flex gap-2">
          {mobileBtn('←', ()=> input.current.left=true, ()=> input.current.left=false)}
          {mobileBtn('→', ()=> input.current.right=true, ()=> input.current.right=false)}
        </div>
        <div className="flex gap-2">
          {mobileBtn('Brake', ()=> input.current.brake=true, ()=> input.current.brake=false)}
          {mobileBtn('Accel', ()=> input.current.accel=true, ()=> input.current.accel=false)}
          {mobileBtn('Nitro', ()=> input.current.nitro=true, ()=> input.current.nitro=false)}
        </div>
      </div>

      {/* Speed slider */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-3 w-[90%] max-w-xl bg-white/5 backdrop-blur border border-white/10 rounded-xl p-3 flex items-center gap-3">
        <div className="text-xs opacity-80">Speed</div>
        <input
          type="range"
          min={0}
          max={320}
          step={1}
          value={speed}
          onChange={(e)=> setSpeed(Number(e.target.value))}
          className="w-full"
        />
      </div>

      {/* Game over overlay */}
      {gameOver && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center">
          <div className="w-[90%] max-w-md rounded-2xl bg-zinc-900/90 border border-white/10 p-6 text-center space-y-3">
            <div className="text-2xl">💥 You Crashed! – Game Over</div>
            <div className="text-sm text-white/80">Score: {score} | Highest: {highest}</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              <button onClick={restart} className="rounded-xl bg-red-600 hover:bg-red-500 px-4 py-3">🔁 Restart</button>
              <button onClick={()=>onExit()} className="rounded-xl bg-zinc-800 hover:bg-zinc-700 px-4 py-3">🏁 Main Menu</button>
              <button onClick={()=>window.close()} className="rounded-xl bg-zinc-800 hover:bg-zinc-700 px-4 py-3">🚪 Exit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
