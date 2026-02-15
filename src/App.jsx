import React from 'react'
import { GameProvider, useGame } from './store/GameContext'
import Lobby from './components/Lobby/Lobby'
import GameEngine from './components/Game/GameEngine'
import Hud from './components/Game/Hud'
import VictoryScreen from './components/Game/VictoryScreen'

const AppContent = () => {
  const { gameState } = useGame()

  return (
    <div className="scanlines w-full h-full flex flex-col items-center justify-center bg-[#050505] relative overflow-hidden">
      {gameState.winner && <VictoryScreen />}
      
      {!gameState.isStarted ? (
        <div className="w-full max-w-4xl max-h-[90vh] overflow-auto p-4 flex items-center justify-center">
          <Lobby />
        </div>
      ) : (
        <div className="relative w-full h-full max-w-[95vw] max-h-[90vh] mx-auto my-auto border-4 border-[#1e293b] shadow-2xl bg-black rounded-sm overflow-hidden flex flex-col">
          <GameEngine />
          <Hud />
        </div>
      )}
      
      {/* Dynamic Background Accents */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
    </div>
  )
}

function App() {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  )
}

export default App
