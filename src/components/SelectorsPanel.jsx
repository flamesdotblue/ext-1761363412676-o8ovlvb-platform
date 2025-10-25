const cars = ['Porsche','BMW','G-Wagon','Supra','Bolero','Mahindra Marshal'];
const environments = [
  { name: 'City', desc: 'Modern city with tall buildings and traffic', emoji: '🏙️' },
  { name: 'Village', desc: 'Indian village road with trees, huts, and cows', emoji: '🌾' },
  { name: 'Highway', desc: 'Highway with barriers and trucks', emoji: '🛣️' },
  { name: 'Market', desc: 'People walking and local markets', emoji: '🛍️' },
];

export default function SelectorsPanel({ type, selected, onBack, onSelect }) {
  const isGarage = type === 'garage';
  return (
    <div className="relative min-h-screen w-full bg-gradient-to-b from-black via-zinc-950 to-black p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">{isGarage ? 'Garage' : 'Environment Selector'}</h2>
          <button onClick={onBack} className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700">Back</button>
        </div>

        {isGarage ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
            {cars.map((c) => (
              <button
                key={c}
                onClick={() => onSelect(c)}
                className={`p-4 rounded-xl border transition text-left ${selected===c? 'bg-red-600/20 border-red-500':'bg-zinc-900/60 border-zinc-700 hover:bg-zinc-800'}`}
              >
                <div className="text-lg font-medium">{c}</div>
                <div className="mt-2 h-24 rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-900" />
                <div className="mt-2 text-xs text-white/70">Under soft lighting • Rotating platform</div>
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            {environments.map((e) => (
              <button
                key={e.name}
                onClick={() => onSelect(e.name)}
                className={`p-4 rounded-xl border transition text-left ${selected===e.name? 'bg-blue-600/20 border-blue-500':'bg-zinc-900/60 border-zinc-700 hover:bg-zinc-800'}`}
              >
                <div className="flex items-center gap-2"><span className="text-xl">{e.emoji}</span><span className="font-medium">{e.name}</span></div>
                <div className="mt-2 text-sm text-white/80">{e.desc}</div>
                <div className="mt-3 h-20 rounded-lg bg-gradient-to-tr from-zinc-800 to-zinc-900 overflow-hidden">
                  <div className="w-full h-full animate-pulse opacity-70" />
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="mt-8 text-sm text-white/70">Tip: Make your pick and head back to the main menu to start driving.</div>
      </div>
    </div>
  );
}
