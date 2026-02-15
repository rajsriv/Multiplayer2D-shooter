import React from 'react';
import { useGame } from '../../store/GameContext';
import { Crosshair, Shield, TrendingUp, Skull } from 'lucide-react';

const Hud = () => {
  const { gameState, weapons } = useGame();
  const [showLeaderboard, setShowLeaderboard] = React.useState(false);
  
  const currentWeapon = weapons[gameState.weaponLevel] || weapons[0];
  const nextWeapon = weapons[gameState.weaponLevel + 1];

  const leaderboard = [
    { name: gameState.playerName || 'YOU', kills: gameState.kills, me: true },
    ...gameState.players.filter(p => p.name !== gameState.playerName).map(p => ({ name: p.name, kills: 0 }))
  ].sort((a, b) => b.kills - a.kills);

  return (
    <div className="fixed inset-0 pointer-events-none p-2 flex flex-col justify-between z-40">
      {/* Top HUD: Mech Shooter Style */}
      <div className="flex justify-between items-start w-full">
        {/* Armor Section */}
        <div className="flex flex-col animate-in slide-in-from-left duration-300">
          <div className="flex items-end gap-2 mb-[-8px] ml-4">
            <h1 className="mech-header text-4xl text-white italic">ARMOR</h1>
            <span className="mech-header text-5xl text-white">85<span className="text-2xl opacity-70">%</span></span>
          </div>
          <div className="w-80 h-10 panel-slanted border-b-4 border-blue-900 shadow-lg flex items-center px-4">
            <div className="panel-content w-full h-4 bg-slate-900 border border-slate-700 p-[2px]">
              <div className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]" style={{width: '85%'}} />
            </div>
          </div>
        </div>

        {/* MECH / Timer Section */}
        <div className="flex flex-col items-end animate-in slide-in-from-right duration-300">
           <div className="flex items-end gap-2 mb-[-8px] mr-4">
             <h1 className="mech-header text-4xl text-white italic">MECH</h1>
             <span className="mech-header text-5xl text-white">0:52</span>
           </div>
           <div className="w-64 h-10 panel-slanted border-b-4 border-blue-900 shadow-lg flex items-center justify-end px-4 !border-l-0 !border-r-6 !transform !skew-x-[15deg]">
             <div className="panel-content w-full h-4 bg-slate-900 border border-slate-700 p-[2px] !transform !skew-x-[-15deg]">
               <div className="h-full bg-yellow-500 shadow-[0_0_10px_rgba(250,204,21,0.8)]" style={{width: '40%'}} />
             </div>
           </div>
        </div>
      </div>

      {/* Middle: Action Popups / Leaderboard Toggle */}
      <div className="flex flex-col gap-4 items-start ml-4 mt-20">
          <button 
            onClick={() => setShowLeaderboard(!showLeaderboard)}
            className="pointer-events-auto bg-black/80 p-2 border-2 border-slate-700 hover:border-blue-500 transition-colors"
          >
            <TrendingUp size={16} className="text-blue-400" />
          </button>
          
          {showLeaderboard && (
            <div className="glass-panel p-3 w-48 pointer-events-auto animate-in fade-in zoom-in duration-200">
              <div className="space-y-1">
                {leaderboard.map((item, i) => (
                  <div key={i} className={`flex justify-between items-center ${item.me ? 'text-blue-400 bg-blue-500/10' : 'text-slate-400'}`}>
                    <span className="text-[10px] terminal-font uppercase truncate w-24">{item.name}</span>
                    <span className="terminal-font text-xs">{item.kills}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
      </div>

      {/* Center: Respawn Overlay */}
      {gameState.isDead && (
        <div className="absolute inset-0 bg-red-900/40 backdrop-blur-md flex flex-col items-center justify-center animate-in zoom-in duration-300 pointer-events-auto z-50">
          <Skull size={84} className="text-white mb-6 animate-pulse" />
          <h1 className="mech-header text-6xl text-white mb-4 italic">UNIT DESTROYED</h1>
          <p className="terminal-font text-2xl text-white bg-black px-4 py-2">RESPAWNING IN {gameState.respawnTime}S</p>
        </div>
      )}

      {/* Bottom Bar: Weapon labels like the Mech Shooter corners */}
      <div className="flex justify-between items-end w-full p-4 mt-auto">
        <div className="space-y-2">
            <div className="bg-blue-600/20 border-l-4 border-blue-500 p-2 px-4 shadow-xl">
               <div className="text-[8px] text-blue-300 mb-1">STATUS</div>
               <div className="mech-header text-xl text-white">DEF+</div>
            </div>
        </div>

        <div className="space-y-2 flex flex-col items-end">
            <div className="bg-red-600/20 border-r-4 border-red-500 p-2 px-4 shadow-xl flex gap-3 items-center">
               <div className="text-right">
                  <div className="text-[8px] text-red-300 mb-1">WEAPON</div>
                  <div className="mech-header text-xl text-white">{currentWeapon.name}</div>
               </div>
               <div className="w-1 h-8 bg-red-500" />
            </div>
            <div className="bg-yellow-600/20 border-r-4 border-yellow-500 p-2 px-4 shadow-xl flex gap-3 items-center">
               <div className="text-right">
                  <div className="text-[8px] text-yellow-300 mb-1">ACTION</div>
                  <div className="mech-header text-xl text-white">READY</div>
               </div>
               <div className="w-1 h-8 bg-yellow-500" />
            </div>
        </div>
      </div>
    </div>
  );
};

export default Hud;
