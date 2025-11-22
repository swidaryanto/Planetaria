import React, { useState, useEffect } from 'react';

const HeroContent: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState({
    lat: 34.0522,
    lng: 118.2437,
    nodes: 8492,
    load: 42
  });

  useEffect(() => {
    setMounted(true);

    const interval = setInterval(() => {
      setStats(prev => ({
        lat: prev.lat + (Math.random() * 0.002 - 0.001),
        lng: prev.lng + (Math.random() * 0.002 - 0.001),
        nodes: Math.max(8000, Math.min(9000, prev.nodes + Math.floor(Math.random() * 20 - 10))),
        load: Math.max(30, Math.min(65, prev.load + Math.floor(Math.random() * 5 - 2)))
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative z-10 h-full flex flex-col justify-end items-center text-center px-4 select-none pointer-events-none pb-8">
      
      {/* Bottom Stats Container */}
      {/* 
          Layout Logic:
          - pb-24: Mobile (Default). High clearance for bottom logo + safe area.
          - md:pb-12: Tablet Portrait. Moderate clearance.
          - lg:pb-0: Desktop/Landscape. No extra lift needed as width allows separation.
      */}
      <div className={`w-full max-w-6xl flex justify-between items-end px-4 md:px-12 pb-24 md:pb-12 lg:pb-0 transition-all duration-1000 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        
        {/* Coordinates - Left */}
        <div className="text-left">
          <div className="text-[10px] md:text-xs text-white/40 uppercase tracking-widest mb-1">Coordinates</div>
          <div className="font-mono text-cyan-400 text-xs md:text-base">
            {stats.lat.toFixed(4)}° N <br className="md:hidden"/> {stats.lng.toFixed(4)}° W
          </div>
        </div>

        {/* Network Stats - Right */}
        <div className="flex gap-4 md:gap-12 text-right md:text-left">
          <div>
            <div className="text-[10px] md:text-xs text-white/40 uppercase tracking-widest mb-1">Nodes</div>
            <div className="font-mono text-sm md:text-xl font-bold text-white">{stats.nodes.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-[10px] md:text-xs text-white/40 uppercase tracking-widest mb-1">Load</div>
            <div className="font-mono text-sm md:text-xl font-bold text-green-400">{stats.load}%</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroContent;