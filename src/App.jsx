import { useEffect, useMemo, useState } from 'react';
import HeroSpline from './components/HeroSpline';
import MainMenu from './components/MainMenu';
import GameCanvas from './components/GameCanvas';
import SelectorsPanel from './components/SelectorsPanel';

const initialSettings = {
  car: 'Porsche',
  environment: 'City',
};

export default function App() {
  const [screen, setScreen] = useState('menu'); // 'menu' | 'game' | 'garage' | 'environments'
  const [gameMode, setGameMode] = useState('Endless'); // 'Endless' | 'Timed'
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('rd_settings');
      return saved ? JSON.parse(saved) : initialSettings;
    } catch {
      return initialSettings;
    }
  });
  const [highest, setHighest] = useState(() => {
    try {
      return Number(localStorage.getItem('rd_highest') || 0);
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    localStorage.setItem('rd_settings', JSON.stringify(settings));
  }, [settings]);

  const handleScoreSubmit = (score) => {
    if (score > highest) {
      setHighest(score);
      localStorage.setItem('rd_highest', String(score));
    }
  };

  const startGame = (mode) => {
    setGameMode(mode);
    setScreen('game');
  };

  const goMenu = () => setScreen('menu');

  return (
    <div className="relative min-h-screen w-full bg-black text-white overflow-hidden">
      {screen === 'menu' && (
        <>
          <HeroSpline />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/80" />
          <MainMenu
            highest={highest}
            onStartEndless={() => startGame('Endless')}
            onStartTimed={() => startGame('Timed')}
            onOpenGarage={() => setScreen('garage')}
            onOpenEnvs={() => setScreen('environments')}
          />
        </>
      )}

      {screen === 'garage' && (
        <SelectorsPanel
          type="garage"
          selected={settings.car}
          onBack={goMenu}
          onSelect={(car) => setSettings((s) => ({ ...s, car }))}
        />
      )}

      {screen === 'environments' && (
        <SelectorsPanel
          type="environment"
          selected={settings.environment}
          onBack={goMenu}
          onSelect={(environment) => setSettings((s) => ({ ...s, environment }))}
        />
      )}

      {screen === 'game' && (
        <GameCanvas
          gameMode={gameMode}
          car={settings.car}
          environment={settings.environment}
          onExit={goMenu}
          onSubmitScore={handleScoreSubmit}
        />
      )}

      <div className="pointer-events-none fixed bottom-2 right-2 text-[10px] opacity-70 select-none">
        Created by Manmohan | Instagram @manxpaa
      </div>
    </div>
  );
}
