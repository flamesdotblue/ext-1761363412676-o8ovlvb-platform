import { Play, Timer, Settings, Car, Map } from 'lucide-react';

export default function MainMenu({ highest, onStartEndless, onStartTimed, onOpenGarage, onOpenEnvs }) {
  return (
    <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">Realistic Drive India</h1>
        <p className="text-white/80">Created by Manmohan | Instagram @manxpaa</p>
        <p className="text-sm text-white/70">Highest Score: <span className="font-semibold">{highest}</span></p>
      </div>

      <div className="mt-10 grid gap-4 w-full max-w-md">
        <button onClick={onStartEndless} className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 rounded-xl px-6 py-4 transition">
          <Play className="w-5 h-5" />
          Start Endless Drive
        </button>
        <button onClick={onStartTimed} className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 rounded-xl px-6 py-4 transition">
          <Timer className="w-5 h-5" />
          Timed Challenge
        </button>
        <div className="grid grid-cols-2 gap-4">
          <button onClick={onOpenGarage} className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl px-4 py-3 transition">
            <Car className="w-5 h-5" /> Garage
          </button>
          <button onClick={onOpenEnvs} className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl px-4 py-3 transition">
            <Map className="w-5 h-5" /> Environments
          </button>
        </div>
      </div>

      <div className="mt-10 max-w-2xl text-center text-white/80 text-sm">
        • Controls: Arrow keys to steer, W accelerate, S brake, Space nitro, C camera • Mobile: on-screen controls
      </div>
    </div>
  );
}
