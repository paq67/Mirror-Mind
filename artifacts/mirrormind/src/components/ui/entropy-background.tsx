'use client'
import { useEffect, useRef } from 'react'

export function EntropyBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const particleColor = '#ffffff'

    const resizeCanvas = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      return { w, h }
    }

    class Particle {
      x: number; y: number; size: number; order: boolean
      velocity: { x: number; y: number }
      originalX: number; originalY: number
      influence: number; neighbors: Particle[]

      constructor(x: number, y: number, order: boolean) {
        this.x = x; this.y = y; this.originalX = x; this.originalY = y
        this.size = 2; this.order = order
        this.velocity = { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2 }
        this.influence = 0; this.neighbors = []
      }

      update(w: number, h: number) {
        if (this.order) {
          const dx = this.originalX - this.x
          const dy = this.originalY - this.y
          const chaosInfluence = { x: 0, y: 0 }
          this.neighbors.forEach(neighbor => {
            if (!neighbor.order) {
              const distance = Math.hypot(this.x - neighbor.x, this.y - neighbor.y)
              const strength = Math.max(0, 1 - distance / 100)
              chaosInfluence.x += neighbor.velocity.x * strength
              chaosInfluence.y += neighbor.velocity.y * strength
              this.influence = Math.max(this.influence, strength)
            }
          })
          this.x += dx * 0.05 * (1 - this.influence) + chaosInfluence.x * this.influence
          this.y += dy * 0.05 * (1 - this.influence) + chaosInfluence.y * this.influence
          this.influence *= 0.99
        } else {
          this.velocity.x += (Math.random() - 0.5) * 0.5
          this.velocity.y += (Math.random() - 0.5) * 0.5
          this.velocity.x *= 0.95; this.velocity.y *= 0.95
          this.x += this.velocity.x; this.y += this.velocity.y
          if (this.x < w / 2 || this.x > w) this.velocity.x *= -1
          if (this.y < 0 || this.y > h) this.velocity.y *= -1
          this.x = Math.max(w / 2, Math.min(w, this.x))
          this.y = Math.max(0, Math.min(h, this.y))
        }
      }

      draw(ctx: CanvasRenderingContext2D) {
        const alpha = this.order ? 0.8 - this.influence * 0.5 : 0.8
        ctx.fillStyle = `${particleColor}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    let particles: Particle[] = []
    let animationId: number
    let time = 0

    const initializeParticles = (w: number, h: number) => {
      const spacing = 45
      const columns = Math.ceil(w / spacing)
      const rows = Math.ceil(h / spacing)
      particles = []
      for (let i = 0; i < columns; i++) {
        for (let j = 0; j < rows; j++) {
          const x = spacing * i + spacing / 2
          const y = spacing * j + spacing / 2
          particles.push(new Particle(x, y, x < w / 2))
        }
      }
    }

    const updateNeighbors = () => {
      particles.forEach(particle => {
        particle.neighbors = particles.filter(other => {
          if (other === particle) return false
          return Math.hypot(particle.x - other.x, particle.y - other.y) < 100
        })
      })
    }

    const animate = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      ctx.clearRect(0, 0, w, h)
      if (time % 30 === 0) updateNeighbors()

      particles.forEach(particle => {
        particle.update(w, h)
        particle.draw(ctx)
        particle.neighbors.forEach(neighbor => {
          const distance = Math.hypot(particle.x - neighbor.x, particle.y - neighbor.y)
          if (distance < 50) {
            const alpha = 0.2 * (1 - distance / 50)
            ctx.strokeStyle = `${particleColor}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`
            ctx.beginPath()
            ctx.moveTo(particle.x, particle.y)
            ctx.lineTo(neighbor.x, neighbor.y)
            ctx.stroke()
          }
        })
      })

      ctx.strokeStyle = `${particleColor}4D`
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.moveTo(w / 2, 0)
      ctx.lineTo(w / 2, h)
      ctx.stroke()

      ctx.font = '12px monospace'
      ctx.fillStyle = '#ffffff'
      ctx.textAlign = 'center'
      time++
      animationId = requestAnimationFrame(animate)
    }

    let resizeTimeout: NodeJS.Timeout
    const handleResize = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(() => {
        const { w, h } = resizeCanvas()
        initializeParticles(w, h)
      }, 200)
    }

    const { w, h } = resizeCanvas()
    initializeParticles(w, h)
    animate()
    window.addEventListener('resize', handleResize)
    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ width: '100vw', height: '100vh', background: '#000000' }}
    />
  )
}
