import { useState, useEffect, useCallback, useRef } from 'react'

interface Mole {
  id: number
  isUp: boolean
  isHit: boolean
}

type GameState = 'idle' | 'playing' | 'paused' | 'gameover'

const MASCOTS = ['🐹', '🐭', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁']
const HIT_SOUNDS = ['💥', '⭐', '✨', '🔥', '⚡']

function App() {
  const [gameState, setGameState] = useState<GameState>('idle')
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('whackAMoleHighScore')
    return saved ? parseInt(saved) : 0
  })
  const [timeLeft, setTimeLeft] = useState(30)
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy')
  const [lives, setLives] = useState(3)
  const molesRef = useRef<Mole[]>(Array.from({ length: 9 }, (_, i) => ({ id: i, isUp: false, isHit: false })))
  const [moles, setMoles] = useState<Mole[]>(molesRef.current)
  const [, setActiveMole] = useState<number | null>(null)
  const [showHitEffect, setShowHitEffect] = useState<{ hole: number; emoji: string } | null>(null)
  const [streak, setStreak] = useState(0)
  const [showStreak, setShowStreak] = useState(false)
  
  const moleTimerRef = useRef<number | null>(null)
  const gameTimerRef = useRef<number | null>(null)
  const streakTimeoutRef = useRef<number | null>(null)

  const getMoleSpeed = () => {
    switch (difficulty) {
      case 'easy': return 5000      // 5 seconds - very easy for kids
      case 'medium': return 3500    // 3.5 seconds
      case 'hard': return 2000      // 2 seconds
    }
  }

  const getMoleInterval = () => {
    switch (difficulty) {
      case 'easy': return 5500      // 5.5 seconds between moles
      case 'medium': return 4000    // 4 seconds
      case 'hard': return 2500      // 2.5 seconds
    }
  }

  const showRandomMole = useCallback(() => {
    if (gameState !== 'playing') return
    
    const availableHoles = molesRef.current.filter(m => !m.isUp && !m.isHit).map(m => m.id)
    if (availableHoles.length === 0) return
    
    const randomHole = availableHoles[Math.floor(Math.random() * availableHoles.length)]
    molesRef.current = molesRef.current.map(m => m.id === randomHole ? { ...m, isUp: true } : m)
    setMoles([...molesRef.current])

    // Mole goes down after speed time
    moleTimerRef.current = window.setTimeout(() => {
      molesRef.current = molesRef.current.map(m => m.id === randomHole ? { ...m, isUp: false } : m)
      setMoles([...molesRef.current])
      
      // If mole went down without being hit, lose a life
      const mole = molesRef.current.find(m => m.id === randomHole)
      if (!mole?.isHit && gameState === 'playing') {
        setLives(prev => {
          const newLives = prev - 1
          if (newLives <= 0) {
            setGameState('gameover')
          }
          return newLives
        })
        setStreak(0)
      }
    }, getMoleSpeed())
  }, [gameState])

  const startGame = () => {
    setScore(0)
    setLives(3)
    setTimeLeft(30)
    setStreak(0)
    molesRef.current = Array.from({ length: 9 }, (_, i) => ({ id: i, isUp: false, isHit: false }))
    setMoles([...molesRef.current])
    setGameState('playing')
  }

  const whackMole = (holeId: number) => {
    if (gameState !== 'playing') return
    
    const mole = molesRef.current.find(m => m.id === holeId)
    if (!mole || !mole.isUp || mole.isHit) return

    // Mark as hit
    molesRef.current = molesRef.current.map(m => m.id === holeId ? { ...m, isHit: true, isUp: false } : m)
    setMoles([...molesRef.current])

    // Calculate points
    let points = 10
    if (difficulty === 'medium') points = 15
    if (difficulty === 'hard') points = 20
    
    // Streak bonus
    const newStreak = streak + 1
    setStreak(newStreak)
    if (newStreak >= 3) {
      points += newStreak * 5
      setShowStreak(true)
      if (streakTimeoutRef.current) clearTimeout(streakTimeoutRef.current)
      streakTimeoutRef.current = window.setTimeout(() => setShowStreak(false), 1000)
    }

    setScore(prev => prev + points)
    
    // Show hit effect
    const hitEmoji = HIT_SOUNDS[Math.floor(Math.random() * HIT_SOUNDS.length)]
    setShowHitEffect({ hole: holeId, emoji: hitEmoji })
    setTimeout(() => setShowHitEffect(null), 500)

    // Clear the mole timer
    if (moleTimerRef.current) {
      clearTimeout(moleTimerRef.current)
    }

    // Show next mole after short delay
    setTimeout(() => {
      molesRef.current = molesRef.current.map(m => m.id === holeId ? { ...m, isHit: false } : m)
      setMoles([...molesRef.current])
    }, 200)
  }

  // Game timer
  useEffect(() => {
    if (gameState === 'playing') {
      gameTimerRef.current = window.setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setGameState('gameover')
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (gameTimerRef.current) clearInterval(gameTimerRef.current)
    }
  }, [gameState])

  // Mole spawning
  useEffect(() => {
    if (gameState === 'playing') {
      const spawnMole = () => {
        showRandomMole()
      }
      spawnMole()
      const interval = setInterval(spawnMole, getMoleInterval())
      return () => clearInterval(interval)
    }
  }, [gameState, showRandomMole])

  // Save high score
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score)
      localStorage.setItem('whackAMoleHighScore', score.toString())
    }
  }, [score, highScore])

  // Cleanup
  useEffect(() => {
    return () => {
      if (moleTimerRef.current) clearTimeout(moleTimerRef.current)
      if (gameTimerRef.current) clearInterval(gameTimerRef.current)
      if (streakTimeoutRef.current) clearTimeout(streakTimeoutRef.current)
    }
  }, [])

  const resetGame = () => {
    setGameState('idle')
    setScore(0)
    setLives(3)
    setTimeLeft(30)
    setStreak(0)
    setMoles(Array.from({ length: 9 }, (_, i) => ({ id: i, isUp: false, isHit: false })))
    setActiveMole(null)
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <div className="max-w-2xl mx-auto text-center mb-6">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 drop-shadow-lg">
          🎯 Whack-a-Mole! 🎯
        </h1>
        <p className="text-white/90 text-lg">Smash the moles to score points!</p>
      </div>

      {/* Stats Bar */}
      <div className="max-w-2xl mx-auto bg-white/20 backdrop-blur rounded-2xl p-4 mb-6">
        <div className="flex justify-around items-center flex-wrap gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-white">{score}</div>
            <div className="text-white/80 text-sm">Score</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-300">{highScore}</div>
            <div className="text-white/80 text-sm">Best</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-white">{timeLeft}s</div>
            <div className="text-white/80 text-sm">Time</div>
          </div>
          <div className="text-center">
            <div className="flex gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <span key={i} className="text-2xl">{i < lives ? '❤️' : '🖤'}</span>
              ))}
            </div>
            <div className="text-white/80 text-sm">Lives</div>
          </div>
        </div>
        
        {/* Streak indicator */}
        {showStreak && (
          <div className="text-center mt-2">
            <span className="text-2xl font-bold text-yellow-300 animate-bounce">
              🔥 {streak} Streak! 🔥
            </span>
          </div>
        )}
      </div>

      {/* Game Area */}
      {gameState === 'idle' && (
        <div className="max-w-2xl mx-auto bg-white/30 backdrop-blur rounded-3xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-6">Choose Difficulty:</h2>
          <div className="flex justify-center gap-4 mb-8 flex-wrap">
            <button
              onClick={() => setDifficulty('easy')}
              className={`px-6 py-3 rounded-xl font-bold text-lg transition-all ${
                difficulty === 'easy' 
                  ? 'bg-green-500 text-white scale-110 shadow-lg' 
                  : 'bg-white/50 text-white hover:bg-white/70'
              }`}
            >
              🟢 Easy
            </button>
            <button
              onClick={() => setDifficulty('medium')}
              className={`px-6 py-3 rounded-xl font-bold text-lg transition-all ${
                difficulty === 'medium' 
                  ? 'bg-yellow-500 text-white scale-110 shadow-lg' 
                  : 'bg-white/50 text-white hover:bg-white/70'
              }`}
            >
              🟡 Medium
            </button>
            <button
              onClick={() => setDifficulty('hard')}
              className={`px-6 py-3 rounded-xl font-bold text-lg transition-all ${
                difficulty === 'hard' 
                  ? 'bg-red-500 text-white scale-110 shadow-lg' 
                  : 'bg-white/50 text-white hover:bg-white/70'
              }`}
            >
              🔴 Hard
            </button>
          </div>
          
          <button
            onClick={startGame}
            className="px-10 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-2xl font-bold rounded-2xl hover:scale-105 transition-all shadow-xl btn-hover"
          >
            🎮 START GAME!
          </button>
        </div>
      )}

      {gameState === 'playing' && (
        <div className="max-w-2xl mx-auto">
          {/* Game Grid */}
          <div className="grid grid-cols-3 gap-4 md:gap-6">
            {moles.map((mole) => (
              <div
                key={mole.id}
                className="relative aspect-square bg-gradient-to-b from-amber-700 to-amber-900 rounded-full p-4 shadow-inner"
                style={{
                  boxShadow: 'inset 0 10px 20px rgba(0,0,0,0.3), 0 5px 15px rgba(0,0,0,0.2)'
                }}
              >
                {/* Hole */}
                <div className="absolute inset-4 bg-gradient-to-b from-black to-amber-950 rounded-full" />
                
                {/* Mole - only show when up! */}
                {mole.isUp && !mole.isHit && (
                  <button
                    onClick={() => whackMole(mole.id)}
                    className="absolute inset-0 flex items-center justify-center text-5xl md:text-6xl mole-pop hover:scale-110 transition-transform cursor-pointer"
                  >
                    {MASCOTS[mole.id % MASCOTS.length]}
                  </button>
                )}

                {/* Hit effect */}
                {mole.isHit && (
                  <div className="absolute inset-0 flex items-center justify-center text-4xl animate-bounce">
                    💥
                  </div>
                )}

                {/* Hit Effect Emoji */}
                {showHitEffect?.hole === mole.id && (
                  <div className="absolute inset-0 flex items-center justify-center text-4xl animate-bounce">
                    {showHitEffect.emoji}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pause Button */}
          <div className="text-center mt-6">
            <button
              onClick={() => setGameState('paused')}
              className="px-6 py-2 bg-white/30 text-white font-bold rounded-xl hover:bg-white/40"
            >
              ⏸️ Pause
            </button>
          </div>
        </div>
      )}

      {gameState === 'paused' && (
        <div className="max-w-2xl mx-auto bg-white/30 backdrop-blur rounded-3xl p-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">⏸️ Paused</h2>
          <p className="text-white/90 text-xl mb-6">Current Score: {score}</p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => setGameState('playing')}
              className="px-8 py-3 bg-green-500 text-white text-xl font-bold rounded-xl hover:scale-105 transition-all"
            >
              ▶️ Resume
            </button>
            <button
              onClick={resetGame}
              className="px-8 py-3 bg-red-500 text-white text-xl font-bold rounded-xl hover:scale-105 transition-all"
            >
              🏠 Menu
            </button>
          </div>
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="max-w-2xl mx-auto bg-white/30 backdrop-blur rounded-3xl p-8 text-center">
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="text-4xl font-bold text-white mb-2">Game Over!</h2>
          <p className="text-2xl text-white mb-2">Final Score: <span className="font-bold text-yellow-300">{score}</span></p>
          {score >= highScore && score > 0 && (
            <p className="text-xl text-green-300 mb-4">🎉 New High Score! 🎉</p>
          )}
          <p className="text-white/70 mb-6">Best Score: {highScore}</p>
          
          <button
            onClick={startGame}
            className="px-10 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-2xl font-bold rounded-2xl hover:scale-105 transition-all shadow-xl btn-hover"
          >
            🔄 Play Again!
          </button>
          
          <button
            onClick={resetGame}
            className="block mx-auto mt-4 text-white/70 hover:text-white"
          >
            🏠 Back to Menu
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="text-center mt-8 text-white/60 text-sm">
        <p>Tap the moles as fast as you can! 👆</p>
      </div>
    </div>
  )
}

export default App