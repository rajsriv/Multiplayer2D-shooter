import React from 'react';
import { Trophy, Home, RotateCcw } from 'lucide-react';
import { useGame } from '../../store/GameContext';

const VictoryScreen = () => {
  const { gameState, setGameState, weapons } = useGame();

  const handleRestart = () => {
    setGameState({
      playerName: '',
      roomCode: null,
      isJoined: false,
      players: [],
      gameMode: 'FFA',
      isStarted: false,
      roomExpiry: null,
      kills: 0,
      weaponLevel: 0,
      isDead: false,
      respawnTime: 0,
      teamKills: { red: 0, blue: 0 },
      winner: null
    });
  };

  const isTeamWin = gameState.winner === 'BLUE TEAM' || gameState.winner === 'RED TEAM';
  // Find the current player's team. Default to 'blue' if not found or in FFA.
  const myTeam = gameState.players.find(p => p.name === gameState.playerName)?.team || 'blue';
  // Determine if the current player's team won (for team modes) or if the player themselves won (for FFA)
  const didIWin = isTeamWin ? (gameState.winner.toLowerCase().startsWith(myTeam)) : (gameState.winner === gameState.playerName);
  
  // Get the weapon object for the current weapon level
  const weapon = weapons[gameState.weaponLevel];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="mech-panel w-full max-w-2xl border-4 border-blue-500 bg-[#0f172a] shadow-[0_0_50px_rgba(59,130,246,0.5)] p-10 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
        
        <div className="text-center space-y-8 relative z-10">
          <div className="space-y-2">
            <h1 className="mech-header text-6xl text-white italic tracking-tighter animate-pulse drop-shadow-[0_0_20px_#fff]">
              {isTeamWin ? 'MISSION COMPLETE' : 'DOMINATION COMPLETE'}
            </h1>
            <p className="text-blue-400 font-mono text-[10px] tracking-[0.5em] uppercase">Tactical Resolution achieved</p>
          </div>

          <div className="py-6 border-y-2 border-slate-800 space-y-4">
            <div className={`mech-header text-4xl ${didIWin ? 'text-green-500' : 'text-red-500'} italic`}>
              {gameState.winner} {isTeamWin ? 'VICTORIOUS' : 'WINS'}
            </div>
            {isTeamWin && (
              <div className="text-slate-400 text-xs font-mono">
                {didIWin ? "YOUR SQUAD SECURED THE PERIMETER." : "OPPOSING FORCES HAVE TAKEN THE ARENA."}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-8 max-w-md mx-auto">
            <div className="bg-slate-900/50 p-4 border-l-4 border-blue-500">
              <div className="text-[#94a3b8] text-[10px] uppercase mb-1">Total Neutralizations</div>
              <div className="text-3xl text-white mech-header leading-none">{gameState.kills}</div>
            </div>
            <div className="bg-slate-900/50 p-4 border-r-4 border-blue-500 text-right">
              <div className="text-[#94a3b8] text-[10px] uppercase mb-1">Weapon Mastery</div>
              <div className="text-xl text-blue-400 mech-header leading-none">{weapon?.name.toUpperCase() || 'RECRUIT'}</div>
            </div>
          </div>

          <button 
            onClick={() => window.location.reload()}
            className="group relative mt-10 py-4 px-12 bg-blue-600 hover:bg-blue-500 transition-all transform hover:scale-105"
          >
            <span className="text-white mech-header text-xl italic tracking-widest">RETURN TO BASE</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default VictoryScreen;
