import { useState, useEffect, useCallback, useRef } from 'react'

interface Mole {
  id: number
  isUp: boolean
  isHit: boolean
  type: 'normal' | 'bonus' | 'powerup'
  powerupType?: 'shield' | 'extratime' | 'doublepoints'
  accessory?: string
  face?: string
}

type GameState = 'idle' | 'playing' | 'paused' | 'gameover' | 'bonus'

// Fun mole faces and accessories
const MOLE_FACES = ['😜', '🤪', '🤓', '😎', '🥳', '😋', '🤩', '😇', '🦁']
const ACCESSORIES = ['🎩', '👑', '🎀', '🧢', '👓', '🎧', '🎒', '🕶️', '']

// Shared audio context for sound effects
let audioCtx: AudioContext | null = null

const getAudioContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  return audioCtx
}

// Funny sound effects using Web Audio API
const playSound = (type: 'pop' | 'hit' | 'miss' | 'gameover' | 'score' | 'bonus' | 'powerup' | 'combo') => {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    
    switch (type) {
      case 'pop': {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.setValueAtTime(300, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1)
        gain.gain.setValueAtTime(0.3, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.1)
        break
      }
      case 'bonus': {
        const notes = [523, 659, 784, 1047]
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.type = 'sine'
          osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1)
          gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.1)
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.1 + 0.15)
          osc.start(ctx.currentTime + i * 0.1)
          osc.stop(ctx.currentTime + i * 0.1 + 0.15)
        })
        break
      }
      case 'powerup': {
        const notes = [400, 500, 600, 700, 800]
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.type = 'triangle'
          osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08)
          gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.08)
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.08 + 0.1)
          osc.start(ctx.currentTime + i * 0.08)
          osc.stop(ctx.currentTime + i * 0.08 + 0.1)
        })
        break
      }
      case 'hit': {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'square'
        osc.frequency.setValueAtTime(200, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.15)
        gain.gain.setValueAtTime(0.3, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.15)
        break
      }
      case 'combo': {
        const notes = [523, 659, 784]
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.type = 'sine'
          osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1)
          gain.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.1)
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.1 + 0.15)
          osc.start(ctx.currentTime + i * 0.1)
          osc.stop(ctx.currentTime + i * 0.1 + 0.15)
        })
        break
      }
      case 'miss': {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(400, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3)
        gain.gain.setValueAtTime(0.2, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.3)
        break
      }
      case 'gameover': {
        const notes = [400, 350, 300, 200]
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.type = 'sine'
          osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.2)
          gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.2)
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.2 + 0.2)
          osc.start(ctx.currentTime + i * 0.2)
          osc.stop(ctx.currentTime + i * 0.2 + 0.2)
        })
        break
      }
      case 'score': {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(500, ctx.currentTime)
        osc.frequency.setValueAtTime(700, ctx.currentTime + 0.1)
        gain.gain.setValueAtTime(0.2, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.2)
        break
      }
    }
  } catch (e) {
    // Audio not supported
  }
}

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
  const [hasShield, setHasShield] = useState(false)
  const [doublePoints, setDoublePoints] = useState(false)
  const [bonusMode, setBonusMode] = useState(false)
  const [bonusTimeLeft, setBonusTimeLeft] = useState(0)
  const [combo, setCombo] = useState(0)
  const [showCombo, setShowCombo] = useState(false)
  const [showPowerupNotification, setShowPowerupNotification] = useState<string | null>(null)
  const [totalMolesHit, setTotalMolesHit] = useState(0)
  const [molesMissed, setMolesMissed] = useState(0)
  
  const molesRef = useRef<Mole[]>(Array.from({ length: 9 }, (_, i) => ({ 
    id: i, 
    isUp: false, 
    isHit: false, 
    type: 'normal',
    accessory: '',
    face: MOLE_FACES[i]
  })))
  const [moles, setMoles] = useState<Mole[]>(molesRef.current)
  
  const moleTimerRef = useRef<number | null>(null)
  const gameTimerRef = useRef<number | null>(null)
  const comboTimeoutRef = useRef<number | null>(null)

  const getMoleSpeed = useCallback(() => {
    if (bonusMode) return 800 // Fast in bonus mode!
    switch (difficulty) {
      case 'easy': return 5000
      case 'medium': return 3500
      case 'hard': return 2000
    }
  }, [difficulty, bonusMode])

  const getMoleInterval = useCallback(() => {
    if (bonusMode) return 1000 // Fast spawn in bonus mode!
    switch (difficulty) {
      case 'easy': return 5500
      case 'medium': return 4000
      case 'hard': return 2500
    }
  }, [difficulty, bonusMode])

  const showPowerupNotificationFn = (text: string) => {
    setShowPowerupNotification(text)
    setTimeout(() => setShowPowerupNotification(null), 2000)
  }

  const showRandomMole = useCallback(() => {
    if (gameState !== 'playing' && gameState !== 'bonus') return
    
    const availableHoles = molesRef.current.filter(m => !m.isUp && !m.isHit).map(m => m.id)
    if (availableHoles.length === 0) return
    
    const randomHole = availableHoles[Math.floor(Math.random() * availableHoles.length)]
    
    // Random mole type
    let moleType: Mole['type'] = 'normal'
    let powerupType: Mole['powerupType'] | undefined
    let accessory = ''
    
    const random = Math.random()
    if (bonusMode) {
      // In bonus mode, all are bonus moles!
      moleType = 'bonus'
    } else if (random < 0.15) {
      // 15% chance for powerup
      moleType = 'powerup'
      const powerups: Mole['powerupType'][] = ['shield', 'extratime', 'doublepoints']
      powerupType = powerups[Math.floor(Math.random() * powerups.length)]
    } else if (random < 0.25) {
      // 10% chance for bonus mole
      moleType = 'bonus'
    }
    
    // Random face and accessory
    const face = MOLE_FACES[randomHole % MOLE_FACES.length]
    if (moleType !== 'normal' || Math.random() < 0.3) {
      accessory = ACCESSORIES[randomHole % ACCESSORIES.length]
    }
    
    molesRef.current = molesRef.current.map(m => 
      m.id === randomHole ? { ...m, isUp: true, type: moleType, powerupType, accessory, face } : m
    )
    setMoles([...molesRef.current])
    playSound(moleType === 'bonus' ? 'bonus' : moleType === 'powerup' ? 'powerup' : 'pop')

    moleTimerRef.current = window.setTimeout(() => {
      molesRef.current = molesRef.current.map(m => m.id === randomHole ? { ...m, isUp: false } : m)
      setMoles([...molesRef.current])
      
      const mole = molesRef.current.find(m => m.id === randomHole)
      if (!mole?.isHit && (gameState === 'playing' || gameState === 'bonus')) {
        // Only lose life in normal mode, not bonus mode
        if (!bonusMode) {
          if (hasShield) {
            setHasShield(false)
            showPowerupNotificationFn('🛡️ Shield used!')
          } else {
            playSound('miss')
            setLives(prev => {
              const newLives = prev - 1
              if (newLives <= 0) {
                playSound('gameover')
                setGameState('gameover')
              }
              return newLives
            })
            setCombo(0)
            setMolesMissed(prev => prev + 1)
          }
        }
      }
    }, getMoleSpeed())
  }, [gameState, difficulty, hasShield, bonusMode, getMoleSpeed])

  const startGame = () => {
    setScore(0)
    setLives(3)
    setTimeLeft(30)
    setCombo(0)
    setHasShield(false)
    setDoublePoints(false)
    setBonusMode(false)
    setTotalMolesHit(0)
    setMolesMissed(0)
    molesRef.current = Array.from({ length: 9 }, (_, i) => ({ 
      id: i, 
      isUp: false, 
      isHit: false, 
      type: 'normal',
      accessory: '',
      face: MOLE_FACES[i]
    }))
    setMoles([...molesRef.current])
    setGameState('playing')
  }

  const whackMole = (holeId: number) => {
    if (gameState !== 'playing' && gameState !== 'bonus') return
    
    const mole = molesRef.current.find(m => m.id === holeId)
    if (!mole || !mole.isUp || mole.isHit) return

    // Mark as hit
    molesRef.current = molesRef.current.map(m => m.id === holeId ? { ...m, isHit: true, isUp: false } : m)
    setMoles([...molesRef.current])

    // Handle powerups and bonus
    if (mole.type === 'powerup' && mole.powerupType) {
      playSound('powerup')
      switch (mole.powerupType) {
        case 'shield':
          setHasShield(true)
          showPowerupNotificationFn('🛡️ Shield activated!')
          break
        case 'extratime':
          setTimeLeft(prev => prev + 10)
          showPowerupNotificationFn('⏰ +10 seconds!')
          break
        case 'doublepoints':
          setDoublePoints(true)
          showPowerupNotificationFn('⚡ Double points!')
          setTimeout(() => setDoublePoints(false), 10000)
          break
      }
    } else if (mole.type === 'bonus') {
      playSound('bonus')
      // Trigger bonus round!
      setBonusMode(true)
      setBonusTimeLeft(5)
      showPowerupNotificationFn('⭐ BONUS ROUND! ⭐')
      playSound('bonus')
    } else {
      playSound('hit')
    }

    // Calculate points
    let points = mole.type === 'bonus' ? 50 : mole.type === 'powerup' ? 25 : 10
    if (difficulty === 'medium') points = Math.floor(points * 1.5)
    if (difficulty === 'hard') points = points * 2
    if (doublePoints) points = points * 2
    
    // Combo bonus
    const newCombo = combo + 1
    setCombo(newCombo)
    setTotalMolesHit(prev => prev + 1)
    
    if (newCombo >= 5) {
      points += newCombo * 5
      setShowCombo(true)
      playSound('combo')
      if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current)
      comboTimeoutRef.current = window.setTimeout(() => setShowCombo(false), 1500)
    }

    setScore(prev => prev + points)
    playSound('score')

    if (moleTimerRef.current) {
      clearTimeout(moleTimerRef.current)
    }

    setTimeout(() => {
      molesRef.current = molesRef.current.map(m => m.id === holeId ? { ...m, isHit: false, type: 'normal' } : m)
      setMoles([...molesRef.current])
    }, 200)
  }

  // Game timer
  useEffect(() => {
    if (gameState === 'playing') {
      gameTimerRef.current = window.setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            // Check for bonus round trigger
            if (score >= 100 && !bonusMode) {
              setBonusMode(true)
              setBonusTimeLeft(5)
              playSound('bonus')
              return 30 // Reset time for bonus
            }
            playSound('gameover')
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
  }, [gameState, score, bonusMode])

  // Bonus mode timer
  useEffect(() => {
    if (bonusMode && gameState === 'playing') {
      const timer = setInterval(() => {
        setBonusTimeLeft(prev => {
          if (prev <= 1) {
            setBonusMode(false)
            playSound('pop')
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [bonusMode, gameState])

  // Mole spawning
  useEffect(() => {
    if (gameState === 'playing' || gameState === 'bonus') {
      const spawnMole = () => {
        showRandomMole()
      }
      spawnMole()
      const interval = setInterval(spawnMole, getMoleInterval())
      return () => clearInterval(interval)
    }
  }, [gameState, showRandomMole, getMoleInterval])

  // Save high score
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score)
      localStorage.setItem('whackAMoleHighScore', score.toString())
    }
  }, [score, highScore])

  useEffect(() => {
    return () => {
      if (moleTimerRef.current) clearTimeout(moleTimerRef.current)
      if (gameTimerRef.current) clearInterval(gameTimerRef.current)
      if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current)
    }
  }, [])

  const resetGame = () => {
    setGameState('idle')
    setScore(0)
    setLives(3)
    setTimeLeft(30)
    setCombo(0)
    setBonusMode(false)
    setTotalMolesHit(0)
    setMolesMissed(0)
    setHasShield(false)
    setDoublePoints(false)
    molesRef.current = Array.from({ length: 9 }, (_, i) => ({ 
      id: i, 
      isUp: false, 
      isHit: false, 
      type: 'normal',
      accessory: '',
      face: MOLE_FACES[i]
    }))
  }

  // Get emoji for mole display
  const getMoleEmoji = (mole: Mole) => {
    if (mole.isHit) return '😵'
    if (mole.type === 'bonus') return '⭐'
    if (mole.type === 'powerup' && mole.powerupType) {
      return mole.powerupType === 'shield' ? '🛡️' : mole.powerupType === 'extratime' ? '⏰' : '⚡'
    }
    return mole.face || MOLE_FACES[mole.id % MOLE_FACES.length]
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <div className="max-w-2xl mx-auto text-center mb-4">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 drop-shadow-lg">
          🎯 Whack-a-Mole! 🎯
        </h1>
        <p className="text-white/90 text-lg">Smash the moles to score points!</p>
      </div>

      {/* Powerup Notifications */}
      {showPowerupNotification && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
          <div className="bg-white/90 backdrop-blur rounded-2xl px-8 py-4 shadow-2xl animate-bounce text-2xl font-bold text-purple-600">
            {showPowerupNotification}
          </div>
        </div>
      )}

      {/* Combo Display */}
      {showCombo && (
        <div className="fixed top-1/4 left-1/2 transform -translate-x-1/2 z-40">
          <div className="text-4xl font-bold text-yellow-300 animate-bounce drop-shadow-lg">
            🔥 SUPER COMBO! x{combo}! 🔥
          </div>
        </div>
      )}

      {/* Stats Bar */}
      <div className="max-w-2xl mx-auto bg-white/20 backdrop-blur rounded-2xl p-4 mb-4">
        <div className="flex justify-around items-center flex-wrap gap-3">
          <div className="text-center">
            <div className="text-3xl font-bold text-white">{score}</div>
            <div className="text-white/80 text-sm">Score</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-300">{highScore}</div>
            <div className="text-white/80 text-sm">Best</div>
          </div>
          <div className="text-center">
            <div className={`text-3xl font-bold ${bonusMode ? 'text-purple-300 animate-pulse' : 'text-white'}`}>
              {bonusMode ? `${bonusTimeLeft}s ⭐` : `${timeLeft}s`}
            </div>
            <div className="text-white/80 text-sm">{bonusMode ? 'Bonus!' : 'Time'}</div>
          </div>
          <div className="text-center">
            <div className="flex gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <span key={i} className="text-2xl">{i < lives ? '❤️' : '🖤'}</span>
              ))}
              {hasShield && <span className="text-2xl">🛡️</span>}
            </div>
            <div className="text-white/80 text-sm">Lives</div>
          </div>
          {doublePoints && (
            <div className="text-center">
              <div className="text-2xl animate-pulse">⚡2x</div>
              <div className="text-white/80 text-sm">Points</div>
            </div>
          )}
          {combo > 0 && (
            <div className="text-center">
              <div className="text-2xl">🔥 x{combo}</div>
              <div className="text-white/80 text-sm">Combo</div>
            </div>
          )}
        </div>
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
            className="px-10 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-2xl font-bold rounded-2xl hover:scale-105 transition-all shadow-xl"
          >
            🎮 START GAME!
          </button>
          
          <p className="text-white/70 mt-4 text-sm">
            💡 Tip: Hit ⭐ for BONUS rounds! | Hit 🛡️⏰⚡ for power-ups!
          </p>
        </div>
      )}

      {(gameState === 'playing' || gameState === 'bonus') && (
        <div className="max-w-2xl mx-auto">
          {bonusMode && (
            <div className="text-center mb-4">
              <span className="bg-purple-500 text-white px-6 py-2 rounded-full text-xl font-bold animate-pulse">
                ⭐ BONUS ROUND! ⭐
              </span>
            </div>
          )}
          
          <div className="grid grid-cols-3 gap-4 md:gap-6">
            {moles.map((mole) => (
              <div
                key={mole.id}
                className="relative aspect-square bg-gradient-to-b from-amber-700 to-amber-900 rounded-full p-4 shadow-inner"
                style={{
                  boxShadow: 'inset 0 10px 20px rgba(0,0,0,0.3), 0 5px 15px rgba(0,0,0,0.2)'
                }}
              >
                <div className="absolute inset-4 bg-gradient-to-b from-black to-amber-950 rounded-full" />
                
                {mole.isUp && !mole.isHit && (
                  <button
                    onClick={() => whackMole(mole.id)}
                    className="absolute inset-0 flex items-center justify-center text-5xl md:text-6xl animate-bounce hover:scale-110 transition-transform cursor-pointer"
                  >
                    <span className="relative">
                      {getMoleEmoji(mole)}
                      {mole.accessory && (
                        <span className="absolute -top-2 -right-2 text-2xl">{mole.accessory}</span>
                      )}
                    </span>
                  </button>
                )}

                {mole.isHit && (
                  <div className="absolute inset-0 flex items-center justify-center text-4xl animate-bounce">
                    💥
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="text-center mt-6 flex justify-center gap-4">
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
          <p className="text-white/70 mb-4">Best Score: {highScore}</p>
          
          {/* Fun Stats */}
          <div className="bg-white/20 rounded-xl p-4 mb-6">
            <p className="text-white mb-2">📊 You did great!</p>
            <p className="text-white/80 text-sm">🎯 Moles hit: {totalMolesHit}</p>
            <p className="text-white/80 text-sm">💨 Moles escaped: {molesMissed}</p>
            <p className="text-white/80 text-sm">🔥 Best combo: {combo}</p>
          </div>
          
          <button
            onClick={startGame}
            className="px-10 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-2xl font-bold rounded-2xl hover:scale-105 transition-all shadow-xl"
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

      <div className="text-center mt-8 text-white/60 text-sm">
        <p>Tap the moles as fast as you can! 👆</p>
      </div>
    </div>
  )
}

export default App