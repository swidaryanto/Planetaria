import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="fixed bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 mix-blend-difference pointer-events-none select-none">
      <div className="w-2 h-2 md:w-3 md:h-3 bg-white rounded-full"></div>
      <span className="text-lg md:text-xl font-bold tracking-[0.2em] text-white uppercase font-mono animate-pulse-slow">Wdryntwrld</span>
    </header>
  );
};

export default Header;