import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { useGame } from '../../store/GameContext';

const GameEngine = () => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const { gameState, setGameState, addKill, reportKill, broadcastMove, weapons } = useGame();
  
  // Refs for game state that updates every frame
  const playerRef = useRef({ x: 400, y: 300, angle: 0, speed: 3.5 });
  const bulletsRef = useRef([]);
  const botsRef = useRef([]);
  const keysRef = useRef({});
  const gameStateRef = useRef(gameState);
  
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 600 });
  
  // Sync gameState to ref
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);
  
  // Helper: Find a spawn point not inside an obstacle
  const findSafeSpawn = useCallback((obstacles, w, h) => {
    let x, y, colliding;
    let attempts = 0;
    do {
      x = 50 + Math.random() * (w - 100);
      y = 50 + Math.random() * (h - 100);
      colliding = (obstacles || []).some(obs => 
        x > obs.x - 20 && x < obs.x + obs.w + 20 &&
        y > obs.y - 20 && y < obs.y + obs.h + 20
      );
      attempts++;
    } while (colliding && attempts < 100);
    return { x, y };
  }, []);

  // Obstacles - Synchronized from Host via context
  const mapObstacles = gameState.mapObstacles || [];

  // Handle unit initialization separately to depend on the obstacles (whether local or synced)
  useEffect(() => {
    if (mapObstacles.length > 0) {
       const playerSpawn = findSafeSpawn(mapObstacles, canvasSize.w, canvasSize.h);
       playerRef.current = { ...playerRef.current, x: playerSpawn.x, y: playerSpawn.y };

       if (gameState.allowBots) {
         botsRef.current = Array.from({ length: 8 }, (_, i) => {
           const spawn = findSafeSpawn(mapObstacles, canvasSize.w, canvasSize.h);
           const team = gameState.gameMode === 'TDM' ? (i < 4 ? 'blue' : 'red') : null;
           return {
             id: `bot_${i}`,
             x: spawn.x,
             y: spawn.y,
             color: team ? (team === 'blue' ? '#3b82f6' : '#ef4444') : `hsl(${Math.random() * 360}, 70%, 50%)`,
             name: `BOT_${i}`,
             team,
             alive: true
           };
         });
       } else {
         botsRef.current = [];
       }
    }
  }, [mapObstacles.length, canvasSize.w, canvasSize.h, findSafeSpawn, gameState.allowBots, gameState.gameMode]);

  // Controls
  useEffect(() => {
    const handleKeyDown = (e) => { keysRef.current[e.key.toLowerCase()] = true; };
    const handleKeyUp = (e) => { keysRef.current[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const localPlayerId = useMemo(() => 
    gameState.players.find(p => p.name === gameState.playerName)?.id
  , [gameState.players, gameState.playerName]);

  const weaponLevelRef = useRef(gameState.weaponLevel);
  useEffect(() => { weaponLevelRef.current = gameState.weaponLevel; }, [gameState.weaponLevel]);

  // Handle Resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        if (clientWidth > 0 && clientHeight > 0) {
          setCanvasSize({ w: clientWidth, h: clientHeight });
        }
      }
    };
    updateSize();
    const timeout = setTimeout(updateSize, 100);
    window.addEventListener('resize', updateSize);
    return () => {
      window.removeEventListener('resize', updateSize);
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const g = gameStateRef.current;
      if (g.isDead || g.isSpectator) return;
      const p = playerRef.current;
      broadcastMove(p.x, p.y, p.angle);
    }, 50); // Broadcast every 50ms
    return () => clearInterval(interval);
  }, [broadcastMove]);

  // Relocate on Respawn
  const lastDeadRef = useRef(gameState.isDead);
  useEffect(() => {
    if (lastDeadRef.current === true && gameState.isDead === false) {
      // Just respawned
      const spawn = findSafeSpawn(mapObstacles, canvasSize.w, canvasSize.h);
      playerRef.current.x = spawn.x;
      playerRef.current.y = spawn.y;
      broadcastMove(spawn.x, spawn.y, playerRef.current.angle);
    }
    lastDeadRef.current = gameState.isDead;
  }, [gameState.isDead, mapObstacles, canvasSize.w, canvasSize.h, findSafeSpawn, broadcastMove]);

  // Main Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId;

    const update = () => {
      const g = gameStateRef.current;
      if (!g.isStarted) return;

      // 1. Player Movement
      if (!g.isDead && !g.isSpectator) {
        const p = playerRef.current;
        const keys = keysRef.current;
        let dx = 0;
        let dy = 0;
        if (keys['w']) dy -= p.speed;
        if (keys['s']) dy += p.speed;
        if (keys['a']) dx -= p.speed;
        if (keys['d']) dx += p.speed;

        if (dx !== 0 || dy !== 0) {
          const newX = Math.max(20, Math.min(canvasSize.w - 20, p.x + dx));
          const newY = Math.max(20, Math.min(canvasSize.h - 20, p.y + dy));

          const isColliding = mapObstacles.some(obs => 
            newX > obs.x && newX < obs.x + obs.w &&
            newY > obs.y && newY < obs.y + obs.h
          );

          if (!isColliding) {
            p.x = newX;
            p.y = newY;
          }
        }
      }

      // 2. Bullets Update
      const weapon = weapons[weaponLevelRef.current] || weapons[0];
      bulletsRef.current = bulletsRef.current.map(b => ({
        ...b,
        x: b.x + Math.cos(b.angle) * 10,
        y: b.y + Math.sin(b.angle) * 10,
        dist: b.dist + 10
      })).filter(b => {
        if (b.dist >= (weapon?.range || 100)) return false;
        const hitWall = mapObstacles.some(obs => 
          b.x > obs.x && b.x < obs.x + obs.w &&
          b.y > obs.y && b.y < obs.y + obs.h
        );
        return !hitWall;
      });

      // 3. Bots Movement
      botsRef.current.forEach(bot => {
        if (bot.alive) {
          bot.x += (Math.random() - 0.5) * 2;
          bot.y += (Math.random() - 0.5) * 2;
        }
      });

      // 4. Collision Detection
      bulletsRef.current = bulletsRef.current.filter(bullet => {
        let bulletActive = true;
        const myTeam = g.players.find(p => p.id === localPlayerId)?.team;
        
        // Check Bots
        botsRef.current.forEach(bot => {
          if (bot.alive && bulletActive && Math.hypot(bot.x - bullet.x, bot.y - bullet.y) < 20) {
            if (g.gameMode === 'FFA' || (myTeam !== bot.team)) {
              addKill();
              bot.alive = false;
              bulletActive = false;
            }
          }
        });

        // Check Other Players
        if (bulletActive) {
          g.players.forEach(op => {
            if (op.id !== localPlayerId && !op.isDead && bulletActive && Math.hypot(op.x - bullet.x, op.y - bullet.y) < 20) {
               if (g.gameMode === 'FFA' || (myTeam !== op.team)) {
                 addKill();
                 reportKill(op.id);
                 bulletActive = false;
                 
                 // INSTANT LOCAL FEEDBACK
                 setGameState(prev => ({
                    ...prev,
                    players: (prev.players || []).map(p => 
                        p.id === op.id ? { ...p, isDead: true } : p
                    )
                 }));
               }
            }
          });
        }

        return bulletActive;
      });

      if (g.allowBots) {
        botsRef.current.forEach(bot => {
          if (!bot.alive && Math.random() < 0.005) {
            const spawn = findSafeSpawn(mapObstacles, canvasSize.w, canvasSize.h);
            bot.alive = true;
            bot.x = spawn.x;
            bot.y = spawn.y;
          }
        });
      }
    };

    // Use setInterval for logic to keep it running in background tabs
    const logicInterval = setInterval(update, 1000 / 60);

    // Use requestAnimationFrame for rendering
    const renderLoop = () => {
      draw(ctx);
      animationId = requestAnimationFrame(renderLoop);
    };
    animationId = requestAnimationFrame(renderLoop);

    const draw = (ctx) => {
      const g = gameStateRef.current;
      ctx.clearRect(0, 0, canvasSize.w, canvasSize.h);
      
      // Draw Grid
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      for (let i = 0; i < canvasSize.w; i += 40) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvasSize.h); ctx.stroke();
      }
      for (let i = 0; i < canvasSize.h; i += 40) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvasSize.w, i); ctx.stroke();
      }

      // Draw Obstacles
      mapObstacles.forEach(obs => {
        ctx.fillStyle = '#334155';
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
        
        // Caution stripes on obstacles
        ctx.strokeStyle = 'rgba(234, 179, 8, 0.2)';
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(obs.x + 4, obs.y + 4, obs.w - 8, obs.h - 8);
        ctx.setLineDash([]);
      });

      // Draw Bullets
      bulletsRef.current.forEach(b => {
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#fff';
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      });

      const p = playerRef.current;
      
      // Unit Drawing Helper
      const drawMech = (mx, my, ma, color, name, isLocal = false, team = null) => {
        ctx.save();
        ctx.translate(mx, my);
        ctx.rotate(ma);

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(-10, -10, 24, 24);

        // Mech Body
        ctx.fillStyle = color;
        ctx.fillRect(-12, -12, 24, 24);
        
        // Detail / Highlights
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(-12, -12, 24, 4);
        
        // Head / Scanner - Team based color
        if (g.gameMode === 'TDM') {
          ctx.fillStyle = team === 'blue' ? '#3b82f6' : '#ef4444';
        } else {
          ctx.fillStyle = isLocal ? '#3b82f6' : '#ef4444';
        }
        ctx.fillRect(4, -4, 6, 8);
        
        // Gun / Arm
        ctx.fillStyle = '#1a202c';
        ctx.fillRect(8, 2, 12, 6);
        
        ctx.restore();

        // Name Tag
        ctx.fillStyle = 'white';
        ctx.font = '8px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText(name, mx, my - 25);
      };

      // Bots
      botsRef.current.forEach(bot => {
        if (bot.alive) {
          drawMech(bot.x, bot.y, 0, bot.color, bot.name, false, bot.team);
        }
      });

      // Other Players
      g.players.forEach(op => {
        if (op.id !== localPlayerId && !op.isDead) {
          drawMech(op.x, op.y, op.angle, op.color || '#ef4444', op.name, false, op.team);
        }
      });

      // Local Player
      if (!g.isSpectator && !g.isDead) {
        const me = g.players.find(pl => pl.id === localPlayerId);
        const myColor = me?.color || '#4299e1';
        drawMech(p.x, p.y, p.angle, myColor, g.playerName || 'YOU', true, me?.team);
        
        // Interaction Circle
        ctx.strokeStyle = me?.team === 'red' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(66, 153, 225, 0.3)';
        ctx.setLineDash([5, 5]);
        ctx.beginPath(); ctx.arc(p.x, p.y, 40, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
      }
    };

    return () => {
      cancelAnimationFrame(animationId);
      clearInterval(logicInterval);
    };
  }, [canvasSize, weapons, mapObstacles, localPlayerId, addKill, reportKill, broadcastMove, findSafeSpawn, setGameState]);

  const handleMouseMove = useCallback((e) => {
    if (gameState.isDead || gameState.isSpectator || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    playerRef.current.angle = Math.atan2(y - playerRef.current.y, x - playerRef.current.x);
  }, [gameState.isDead, gameState.isSpectator]);

  const handleMouseDown = useCallback(() => {
    if (gameState.isDead || gameState.isSpectator) return;
    const p = playerRef.current;
    bulletsRef.current.push({ x: p.x, y: p.y, angle: p.angle, dist: 0 });
  }, [gameState.isDead, gameState.isSpectator]);

  return (
    <div 
      id="game-container" 
      ref={containerRef}
      className="relative flex-1 w-full bg-black/50 cursor-crosshair overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        width={canvasSize.w}
        height={canvasSize.h}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        className="block"
      />
      {gameState.isSpectator && (
         <div className="absolute top-4 left-1/2 -translate-x-1/2 glass-panel px-4 py-2 text-yellow-400 retro-font text-xs animate-pulse z-50">
            SPECTATING BATTLE IN PROGRESS
         </div>
      )}
    </div>
  );
};

export default GameEngine;
