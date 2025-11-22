import React from 'react';
import Header from './components/Header';
import HeroContent from './components/HeroContent';
import PlanetCanvas from './components/PlanetCanvas';

const App: React.FC = () => {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      {/* Background Interactive Layer */}
      <PlanetCanvas />

      {/* UI Layer */}
      <div className="relative z-10 w-full h-full flex flex-col">
        <Header />
        <main className="flex-grow relative">
          <HeroContent />
        </main>
      </div>
      
      {/* Vignette Overlay */}
      <div className="absolute inset-0 pointer-events-none z-20 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)]"></div>
    </div>
  );
};

export default App;