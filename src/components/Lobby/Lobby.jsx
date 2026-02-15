import React, { useState, useEffect } from 'react';
import { useGame } from '../../store/GameContext';
import { Users, Play, Shield, Globe, Timer, Copy, Check } from 'lucide-react';

const Lobby = () => {
  const { gameState, createRoom, joinRoom, startGame, updateSettings } = useGame();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120);

  useEffect(() => {
    if (gameState.roomCode && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [gameState.roomCode, timeLeft]);

  const handleCopy = () => {
    navigator.clipboard.writeText(gameState.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!gameState.isJoined) {
    return (
      <div className="pixel-card p-10 w-full max-w-lg border-b-8 border-r-8 border-black/40">
        <h1 className="mech-header text-5xl mb-12 text-center text-white italic drop-shadow-xl animate-in slide-in-from-top duration-500">MECH STRIKE</h1>
        <div className="space-y-8">
          {!isJoining ? (
            <>
              <div className="space-y-3">
                <label className="mech-header text-sm text-blue-300">OPERATOR_ID_REQUIRED</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value.toUpperCase())}
                  className="w-full bg-black/40 border-l-8 border-blue-500 p-4 font-mono text-blue-100 focus:bg-black/60 outline-none text-2xl tracking-[0.2em]"
                  placeholder="ID..."
                  maxLength={12}
                />
              </div>
              
              <div className="flex flex-col gap-4">
                <button 
                  onClick={() => name && createRoom(name)}
                  className="btn-retro w-full text-lg py-5 bg-blue-600 hover:bg-blue-500"
                  disabled={!name}
                >
                  INITIALIZE ROOM
                </button>
                <div className="flex items-center gap-4">
                   <div className="flex-1 h-[2px] bg-slate-700" />
                   <span className="text-[10px] text-slate-500">OR</span>
                   <div className="flex-1 h-[2px] bg-slate-700" />
                </div>
                <button 
                  onClick={() => setIsJoining(true)}
                  className="btn-retro w-full py-4 bg-slate-700 border-slate-900"
                >
                  JOIN BATTLE
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-6">
                <div>
                  <label className="mech-header text-sm text-blue-300">MISSION_CODE</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full bg-black/40 border-l-8 border-yellow-500 p-4 font-mono text-yellow-100 focus:bg-black/60 outline-none text-2xl tracking-[0.4em]"
                    placeholder="......"
                    maxLength={6}
                  />
                </div>
                <div>
                  <label className="mech-header text-sm text-blue-300">OPERATOR_ID</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value.toUpperCase())}
                    className="w-full bg-black/40 border-l-8 border-blue-500 p-4 font-mono text-blue-100 focus:bg-black/60 outline-none text-2xl tracking-[0.2em]"
                    placeholder="ID..."
                    maxLength={12}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setIsJoining(false)}
                    className="btn-retro bg-slate-700"
                  >
                    ABORT
                  </button>
                  <button 
                    onClick={() => name && code && joinRoom(name, code)}
                    className="btn-retro bg-blue-600"
                    disabled={!name || !code}
                  >
                    DEPLOY
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="pixel-card p-8 w-full max-w-4xl border-b-8 border-r-8 border-black/40 bg-[#1e293b]/90 backdrop-blur-sm">
      <div className="flex justify-between items-start mb-10 border-b-4 border-slate-700 pb-6">
        <div>
          <h2 className="mech-header text-3xl text-white mb-2 italic">MISSION: {gameState.roomCode}</h2>
          <div className="flex items-center gap-6 text-blue-300 font-mono text-xs">
            <span className="flex items-center gap-2"><Users size={14}/> {gameState.players.length}/10 UNITS</span>
            <span className="flex items-center gap-2 animate-pulse"><Timer size={14}/> {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')} UNTIL DROPSHIP DEPARTURE</span>
          </div>
        </div>
        <button 
          onClick={handleCopy}
          className="p-3 bg-slate-800 border-2 border-slate-600 hover:border-yellow-500 transition-all hover:scale-105"
        >
          {copied ? <Check size={20} className="text-green-500" /> : <Copy size={20} className="text-white" />}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-10">
        <div className="space-y-4">
          <h3 className="mech-header text-lg text-blue-400 border-l-4 border-blue-500 pl-3">ACTIVE_UNITS</h3>
          <div className="max-h-[350px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {gameState.players.map((p, i) => (
              <div key={i} className="flex items-center gap-4 bg-black/40 p-3 border-l-4 group hover:bg-white/5 transition-all" style={{ borderLeftColor: p.color || '#3b82f6' }}>
                <div className="w-4 h-4" style={{ backgroundColor: p.color || '#3b82f6' }} />
                <span className="font-mono tracking-widest flex justify-between w-full text-base items-center">
                  {p.name} 
                  {i === 0 && <span className="text-[10px] bg-slate-800 px-2 py-1 border border-slate-600 text-slate-300 italic">HOST</span>}
                </span>
              </div>
            ))}
            {[...Array(Math.max(0, 4 - gameState.players.length))].map((_, i) => (
              <div key={i} className="flex items-center gap-4 bg-black/10 p-3 border-l-4 border-slate-700 opacity-20">
                <span className="font-mono text-slate-500 text-sm italic">EMPTY_SIGNAL...</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900/80 p-6 border-l-4 border-yellow-500 shadow-xl">
            <h3 className="mech-header text-lg text-yellow-500 mb-4 italic uppercase">Mission Parameters</h3>
            
            <div className="space-y-6">
              {/* Mode Selection */}
              <div>
                <label className="text-blue-400 text-[10px] uppercase block mb-3 font-bold tracking-widest">Select Conflict Mode</label>
                <div className="flex gap-4">
                  <button 
                    disabled={!gameState.isHost}
                    className={`flex-1 py-4 text-[10px] mech-header border-2 transition-all ${gameState.gameMode === 'FFA' ? 'bg-yellow-600 border-yellow-400 text-black shadow-[0_0_20px_rgba(234,179,8,0.5)] scale-105 z-10' : 'bg-slate-800/50 border-slate-700 text-slate-500 hover:border-slate-500 hover:bg-slate-800'}`}
                    onClick={() => updateSettings('FFA', gameState.allowBots)}
                  >
                   {gameState.gameMode === 'FFA' ? '[X]' : '[ ]'} FREE-FOR-ALL
                  </button>
                  <button 
                    disabled={!gameState.isHost}
                    className={`flex-1 py-4 text-[10px] mech-header border-2 transition-all ${gameState.gameMode === 'TDM' ? 'bg-red-600 border-red-400 text-white shadow-[0_0_20px_rgba(220,38,38,0.5)] scale-105 z-10' : 'bg-slate-800/50 border-slate-700 text-slate-500 hover:border-slate-500 hover:bg-slate-800'}`}
                    onClick={() => updateSettings('TDM', gameState.allowBots)}
                  >
                   {gameState.gameMode === 'TDM' ? '[X]' : '[ ]'} TEAM DEATHMATCH
                  </button>
                </div>
              </div>

              {/* Bot Toggle */}
              <div className="pt-2 border-t border-slate-800">
                <button 
                  disabled={!gameState.isHost}
                  onClick={() => updateSettings(gameState.gameMode, !gameState.allowBots)}
                  className={`w-full py-4 px-4 border-2 flex items-center justify-between transition-all group ${gameState.allowBots ? 'border-green-500/50 bg-green-500/10' : 'border-slate-700 bg-slate-800/30'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 border-2 ${gameState.allowBots ? 'bg-green-400 border-green-200 shadow-[0_0_10px_#4ade80]' : 'border-slate-600'}`} />
                    <span className={`text-[10px] mech-header ${gameState.allowBots ? 'text-green-400' : 'text-slate-500'}`}>
                      AUTONOMOUS UNIT DEPLOYMENT (BOTS)
                    </span>
                  </div>
                  {gameState.allowBots && <span className="text-[8px] text-green-500/70 font-mono animate-pulse">ACTIVE_SIGNAL</span>}
                </button>
              </div>
            </div>
          </div>
          
          <div className="pt-4">
            {gameState.isHost ? (
              <button 
                className="w-full btn-retro py-6 text-2xl flex items-center justify-center gap-4 bg-red-600 hover:bg-red-500 border-red-900 group"
                onClick={startGame}
              >
                <div className="w-4 h-4 bg-white animate-ping rounded-full" />
                INITIATE DROP
              </button>
            ) : (
              <div className="bg-slate-800/80 p-6 text-center border-2 border-slate-700 italic font-mono text-blue-400 animate-pulse">
                WAITING FOR COMMANDER TO INITIATE DROP...
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="bg-black/40 p-3 flex justify-center items-center gap-4 border-t-2 border-slate-800">
         <Shield size={16} className="text-red-500" />
         <span className="text-[10px] font-mono text-slate-400 tracking-[3px] animate-pulse">
           CONNECTION STABLE - SECURE CHANNEL {gameState.roomCode}
         </span>
      </div>
    </div>
  );
};

export default Lobby;
