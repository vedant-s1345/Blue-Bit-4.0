import { useEffect, useRef } from 'react'

export default function SpaceBackground() {
  const ref = useRef()

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)
    const W = () => canvas.width, H = () => canvas.height

    // ── Dense star field ────────────────────────────────────────────────────
    const stars = Array.from({ length: 520 }, () => ({
      x: Math.random(), y: Math.random(),
      r: Math.random() * 1.5 + 0.1,
      o: Math.random() * 0.8 + 0.1,
      dt: Math.random() * 0.01 + 0.002,
      color: Math.random() > 0.92 ? (Math.random() > 0.5 ? '#bfdbfe' : '#fde68a') : '#ffffff',
    }))

    // ── Asteroids ───────────────────────────────────────────────────────────
    const mkAsteroid = () => {
      const side = Math.floor(Math.random() * 4)
      let x, y, vx, vy
      const spd = 0.03 + Math.random() * 0.07
      if (side === 0)      { x = Math.random(); y = -0.05; vx = (Math.random()-.5)*.015; vy = spd }
      else if (side === 1) { x = 1.05; y = Math.random(); vx = -spd; vy = (Math.random()-.5)*.015 }
      else if (side === 2) { x = Math.random(); y = 1.05; vx = (Math.random()-.5)*.015; vy = -spd }
      else                 { x = -0.05; y = Math.random(); vx = spd; vy = (Math.random()-.5)*.015 }
      return {
        x, y, vx: vx/100, vy: vy/100,
        r: 4 + Math.random() * 13,
        rot: Math.random() * Math.PI * 2,
        rotV: (Math.random() - .5) * 0.013,
        pts: Array.from({ length: 8 }, () => ({
          a: Math.random() * Math.PI * 2,
          d: 0.5 + Math.random() * 0.5,
        })).sort((a, b) => a.a - b.a),
        breaking: false, breakAlpha: 1,
      }
    }
    const asteroids = Array.from({ length: 7 }, mkAsteroid)

    // ── Lasers ──────────────────────────────────────────────────────────────
    const lasers = []
    const LASER_COLORS = ['#22d3ee','#f87171','#a78bfa','#34d399','#60a5fa','#fb923c']
    const mkLaser = () => {
      const fromLeft = Math.random() > .5
      const color = LASER_COLORS[Math.floor(Math.random() * LASER_COLORS.length)]
      const angle = (Math.random() - .5) * 0.18 // slight angle variance
      const spd = 16 + Math.random() * 10
      return {
        x: fromLeft ? -10 : W() + 10,
        y: H() * (.08 + Math.random() * .84),
        vx: fromLeft ? spd : -spd,
        vy: (Math.random() - .5) * 1.5,
        len: 55 + Math.random() * 90,
        color, alpha: 1,
        width: 1.2 + Math.random() * 1.2,
        glow: 6 + Math.random() * 8,
      }
    }

    // ── Explosions ──────────────────────────────────────────────────────────
    const explosions = []
    const mkExplosion = (x, y, color) => ({
      x, y, color, t: 0,
      pts: Array.from({ length: 12 }, () => ({
        vx: (Math.random() - .5) * 3.5,
        vy: (Math.random() - .5) * 3.5,
        r: .8 + Math.random() * 2.2,
      })),
    })

    // ── Shooting stars ──────────────────────────────────────────────────────
    const shootingStars = []
    const mkShootingStar = () => ({
      x: Math.random() * W(),
      y: Math.random() * H() * .55,
      vx: 11 + Math.random() * 9,
      vy: 3 + Math.random() * 3,
      len: 70 + Math.random() * 90,
      alpha: 1,
    })

    // ── One launch rocket on mount ───────────────────────────────────────────
    const rocket = {
      x: W() * (.25 + Math.random() * .5),
      y: H() + 50, vy: -(2.6 + Math.random() * .8),
      alpha: 0, done: false, trail: [],
    }

    const drawRocket = (rx, ry, alpha) => {
      ctx.save(); ctx.globalAlpha = alpha; ctx.translate(rx, ry)
      ctx.beginPath(); ctx.moveTo(0,-18); ctx.lineTo(-7,8); ctx.lineTo(7,8); ctx.closePath()
      ctx.fillStyle='#e2e8f0'; ctx.fill()
      ctx.beginPath(); ctx.moveTo(0,-18); ctx.lineTo(-5,-10); ctx.lineTo(5,-10); ctx.closePath()
      ctx.fillStyle='#f87171'; ctx.fill()
      ctx.beginPath(); ctx.arc(0,-4,3.5,0,Math.PI*2)
      ctx.fillStyle='#38bdf8'; ctx.shadowColor='#38bdf8'; ctx.shadowBlur=7; ctx.fill(); ctx.shadowBlur=0
      ctx.beginPath(); ctx.moveTo(-7,8); ctx.lineTo(-14,16); ctx.lineTo(-3,8); ctx.closePath()
      ctx.fillStyle='#6366f1'; ctx.fill()
      ctx.beginPath(); ctx.moveTo(7,8); ctx.lineTo(14,16); ctx.lineTo(3,8); ctx.closePath()
      ctx.fillStyle='#6366f1'; ctx.fill()
      ctx.restore()
    }

    let laserTimer = 0, shootTimer = 0, astTimer = 0
    let af

    const draw = () => {
      const w = W(), h = H()
      ctx.clearRect(0, 0, w, h)

      // Stars
      stars.forEach(s => {
        s.o += (Math.random()-.5)*s.dt; s.o = Math.max(.05,Math.min(.95,s.o))
        ctx.beginPath(); ctx.arc(s.x*w, s.y*h, s.r, 0, Math.PI*2)
        ctx.fillStyle = s.color === '#ffffff' ? `rgba(255,255,255,${s.o})` : s.color + Math.round(s.o*255).toString(16).padStart(2,'0')
        ctx.fill()
      })

      // Asteroids
      astTimer++
      if (astTimer > 200 && asteroids.length < 10) { asteroids.push(mkAsteroid()); astTimer = 0 }
      for (let i = asteroids.length-1; i >= 0; i--) {
        const a = asteroids[i]
        a.x += a.vx; a.y += a.vy; a.rot += a.rotV
        if (a.breaking) { a.breakAlpha -= 0.05; if (a.breakAlpha <= 0) { asteroids.splice(i,1); continue } }
        if (!a.breaking && Math.random() < 0.0004) { a.breaking = true; explosions.push(mkExplosion(a.x*w, a.y*h, '#f97316')) }
        const ox = a.x*w, oy = a.y*h
        if (ox < -80 || ox > w+80 || oy < -80 || oy > h+80) { asteroids.splice(i,1); continue }
        ctx.save(); ctx.globalAlpha = a.breakAlpha * 0.5
        ctx.translate(ox, oy); ctx.rotate(a.rot)
        ctx.beginPath()
        a.pts.forEach((p,j) => {
          const px = Math.cos(p.a)*a.r*p.d, py = Math.sin(p.a)*a.r*p.d
          j===0 ? ctx.moveTo(px,py) : ctx.lineTo(px,py)
        })
        ctx.closePath()
        ctx.fillStyle='#374151'; ctx.strokeStyle='#6b7280'; ctx.lineWidth=.8
        ctx.fill(); ctx.stroke()
        ctx.restore()
      }

      // Lasers — more frequent, more visible
      laserTimer++
      if (laserTimer > 18 + Math.random() * 28) { lasers.push(mkLaser()); laserTimer = 0 }
      for (let i = lasers.length-1; i >= 0; i--) {
        const l = lasers[i]
        l.x += l.vx; l.y += l.vy; l.alpha -= 0.012
        if (l.alpha <= 0 || l.x < -300 || l.x > w+300) { lasers.splice(i,1); continue }
        ctx.save(); ctx.globalAlpha = l.alpha * 0.85
        // Core beam
        const grad = ctx.createLinearGradient(l.x, l.y, l.x - Math.sign(l.vx)*l.len, l.y - Math.sign(l.vx)*(l.vy/l.vx)*l.len)
        grad.addColorStop(0, l.color); grad.addColorStop(1, 'transparent')
        ctx.beginPath(); ctx.moveTo(l.x, l.y)
        ctx.lineTo(l.x - Math.sign(l.vx)*l.len, l.y - Math.sign(l.vx)*(l.vy/Math.abs(l.vx))*l.len)
        ctx.strokeStyle = grad; ctx.lineWidth = l.width
        ctx.shadowColor = l.color; ctx.shadowBlur = l.glow; ctx.stroke()
        // Bright outer glow pass
        ctx.lineWidth = l.width * 2.5; ctx.globalAlpha = l.alpha * 0.2
        ctx.shadowBlur = l.glow * 2; ctx.stroke(); ctx.shadowBlur = 0
        // Tip
        ctx.globalAlpha = l.alpha * 0.9
        ctx.beginPath(); ctx.arc(l.x, l.y, l.width+.8, 0, Math.PI*2)
        ctx.fillStyle = '#fff'; ctx.shadowColor = l.color; ctx.shadowBlur = 10; ctx.fill()
        ctx.restore()
        if (Math.random() < 0.006) explosions.push(mkExplosion(l.x, l.y, l.color))
      }

      // Explosions
      for (let i = explosions.length-1; i >= 0; i--) {
        const e = explosions[i]; e.t++
        if (e.t > 20) { explosions.splice(i,1); continue }
        const prog = e.t/20
        ctx.save(); ctx.globalAlpha = (1-prog)*0.9
        e.pts.forEach(p => {
          ctx.beginPath(); ctx.arc(e.x+p.vx*e.t, e.y+p.vy*e.t, p.r*(1-prog*.5), 0, Math.PI*2)
          ctx.fillStyle = e.color; ctx.fill()
        })
        ctx.restore()
      }

      // Shooting stars
      shootTimer++
      if (shootTimer > 70 + Math.random()*100) { shootingStars.push(mkShootingStar()); shootTimer=0 }
      for (let i = shootingStars.length-1; i >= 0; i--) {
        const s = shootingStars[i]
        s.x += s.vx; s.y += s.vy; s.alpha -= 0.028
        if (s.alpha <= 0) { shootingStars.splice(i,1); continue }
        ctx.save(); ctx.globalAlpha = s.alpha * 0.9
        const g = ctx.createLinearGradient(s.x,s.y,s.x-s.vx*8,s.y-s.vy*8)
        g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(1,'transparent')
        ctx.beginPath(); ctx.moveTo(s.x,s.y); ctx.lineTo(s.x-s.len*(s.vx/14),s.y-s.len*(s.vy/14))
        ctx.strokeStyle=g; ctx.lineWidth=1.5; ctx.shadowColor='#fff'; ctx.shadowBlur=4; ctx.stroke()
        ctx.restore()
      }

      // Launch rocket
      if (!rocket.done) {
        rocket.alpha = Math.min(1, rocket.alpha+0.045); rocket.y += rocket.vy
        rocket.trail.push({ x: rocket.x, y: rocket.y, a: rocket.alpha })
        if (rocket.trail.length > 32) rocket.trail.shift()
        rocket.trail.forEach((tp, ti) => {
          const p = ti/rocket.trail.length
          ctx.beginPath(); ctx.arc(tp.x+(Math.random()-.5)*3, tp.y+15, (1-p)*6, 0, Math.PI*2)
          ctx.fillStyle = `rgba(251,146,60,${p*tp.a*.75})`; ctx.fill()
          if (p > .6) {
            ctx.beginPath(); ctx.arc(tp.x+(Math.random()-.5)*5, tp.y+20, (1-p)*3.5, 0, Math.PI*2)
            ctx.fillStyle = `rgba(253,224,71,${p*tp.a*.45})`; ctx.fill()
          }
        })
        drawRocket(rocket.x, rocket.y, rocket.alpha)
        if (rocket.y < -60) rocket.done = true
      }

      af = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(af); window.removeEventListener('resize', resize) }
  }, [])

  return <canvas ref={ref} style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none' }} />
}
