import { useEffect, useRef, useState } from 'react'
import { PALETTE, getRiskColor } from '../utils/constants.js'

// ─── Color helpers ────────────────────────────────────────────────────────────
function hexToRgb(hex) {
  const h = hex.replace('#','')
  return { r: parseInt(h.slice(0,2),16), g: parseInt(h.slice(2,4),16), b: parseInt(h.slice(4,6),16) }
}
function shade(hex, f) {
  const {r,g,b} = hexToRgb(hex)
  return `rgb(${Math.min(255,Math.round(r*f))},${Math.min(255,Math.round(g*f))},${Math.min(255,Math.round(b*f))})`
}
function rgba(hex, a) {
  const {r,g,b} = hexToRgb(hex)
  return `rgba(${r},${g},${b},${a})`
}

// ─── 3D → 2D projection with rotation ────────────────────────────────────────
// Uses a simple top-down isometric with a rotation angle around Y axis
function project(x, y, z, rotY, cx, cy, scale = 1) {
  // Rotate around Y axis
  const rx = x * Math.cos(rotY) - z * Math.sin(rotY)
  const rz = x * Math.sin(rotY) + z * Math.cos(rotY)
  // Isometric project: screen x/y
  const TILT = 0.5   // vertical compression
  const SCALE = 38 * scale
  return {
    sx: cx + rx * SCALE,
    sy: cy + rz * SCALE * TILT - y * SCALE * 0.85,
  }
}

// ─── Point-in-polygon hit test ────────────────────────────────────────────────
function pointInPoly(px, py, pts) {
  let inside = false
  for (let i=0, j=pts.length-1; i<pts.length; j=i++) {
    const xi=pts[i][0], yi=pts[i][1], xj=pts[j][0], yj=pts[j][1]
    if (((yi>py)!==(yj>py)) && (px < (xj-xi)*(py-yi)/(yj-yi)+xi)) inside = !inside
  }
  return inside
}

// ─── Draw one building, returns hit polygon ───────────────────────────────────
function drawBuilding(ctx, bx, bz, w, h, color, rotY, cx, cy, scale, isSelected, isHovered, windowData, frame) {
  // 8 corners of the box: bottom-left, bottom-right, top-left, top-right
  // bx,bz = center base, h = height, w = half-width
  const hw = w
  const corners3d = [
    [-hw, 0,  -hw], [ hw, 0,  -hw], [ hw, 0,  hw], [-hw, 0,  hw],  // bottom
    [-hw, h,  -hw], [ hw, h,  -hw], [ hw, h,  hw], [-hw, h,  hw],  // top
  ].map(([x,y,z]) => project(bx+x, y, bz+z, rotY, cx, cy, scale))

  const [b0,b1,b2,b3, t0,t1,t2,t3] = corners3d
  const pts2d = (pts) => pts.map(p => [p.sx, p.sy])

  // Determine which faces are visible by checking winding
  const crossZ = (a,b,c) => (b[0]-a[0])*(c[1]-a[1]) - (b[1]-a[1])*(c[0]-a[0])

  const glow = isSelected ? 28 : isHovered ? 14 : 0

  // ── Front-left face ──
  const fl = pts2d([b3, b2, t2, t3])
  if (crossZ(fl[0],fl[1],fl[2]) < 0) {
    ctx.beginPath(); fl.forEach(([x,y],i) => i?ctx.lineTo(x,y):ctx.moveTo(x,y)); ctx.closePath()
    ctx.fillStyle = shade(color, 0.42)
    if (glow) { ctx.shadowColor=color; ctx.shadowBlur=glow }
    ctx.fill()
    if (isSelected||isHovered) { ctx.strokeStyle=rgba(color,0.7); ctx.lineWidth=1; ctx.stroke() }
    ctx.shadowBlur=0

    // Windows on front-left face
    if (windowData && h > 1.5) {
      const rows = Math.max(1, Math.floor(h * 1.4))
      const cols = 2
      for (let r=0; r<rows; r++) {
        for (let c=0; c<cols; c++) {
          if (!windowData[(r*4+c)%windowData.length]) continue
          const tr = (r+1)/(rows+1), tc = (c+1)/(cols+1)
          // bilinear interpolate on the face quad
          const wx = fl[0][0]*(1-tc)*(1-tr) + fl[1][0]*tc*(1-tr) + fl[2][0]*tc*tr + fl[3][0]*(1-tc)*tr
          const wy = fl[0][1]*(1-tc)*(1-tr) + fl[1][1]*tc*(1-tr) + fl[2][1]*tc*tr + fl[3][1]*(1-tc)*tr
          const flicker = 0.65 + Math.sin(frame*0.07 + r*1.3 + c*2.7 + bx*0.5) * 0.2
          ctx.beginPath(); ctx.rect(wx-3.5, wy-3, 7, 5.5)
          ctx.fillStyle=`rgba(253,224,71,${flicker})`
          ctx.shadowColor='rgba(253,224,71,0.8)'; ctx.shadowBlur=6; ctx.fill(); ctx.shadowBlur=0
        }
      }
    }
  }

  // ── Front-right face ──
  const fr = pts2d([b2, b1, t1, t2])
  if (crossZ(fr[0],fr[1],fr[2]) < 0) {
    ctx.beginPath(); fr.forEach(([x,y],i) => i?ctx.lineTo(x,y):ctx.moveTo(x,y)); ctx.closePath()
    ctx.fillStyle = shade(color, 0.58)
    if (glow) { ctx.shadowColor=color; ctx.shadowBlur=glow }
    ctx.fill()
    if (isSelected||isHovered) { ctx.strokeStyle=rgba(color,0.7); ctx.lineWidth=1; ctx.stroke() }
    ctx.shadowBlur=0

    if (windowData && h > 1.5) {
      const rows = Math.max(1, Math.floor(h * 1.4))
      const cols = 2
      for (let r=0; r<rows; r++) {
        for (let c=0; c<cols; c++) {
          if (!windowData[(r*4+c+2)%windowData.length]) continue
          const tr = (r+1)/(rows+1), tc = (c+1)/(cols+1)
          const wx = fr[0][0]*(1-tc)*(1-tr) + fr[1][0]*tc*(1-tr) + fr[2][0]*tc*tr + fr[3][0]*(1-tc)*tr
          const wy = fr[0][1]*(1-tc)*(1-tr) + fr[1][1]*tc*(1-tr) + fr[2][1]*tc*tr + fr[3][1]*(1-tc)*tr
          const flicker = 0.65 + Math.sin(frame*0.07 + r*1.8 + c*3.1 + bz*0.5) * 0.2
          ctx.beginPath(); ctx.rect(wx-3.5, wy-3, 7, 5.5)
          ctx.fillStyle=`rgba(253,224,71,${flicker})`
          ctx.shadowColor='rgba(253,224,71,0.8)'; ctx.shadowBlur=6; ctx.fill(); ctx.shadowBlur=0
        }
      }
    }
  }

  // ── Top face (always draw last) ──
  const top = pts2d([t3, t2, t1, t0])
  ctx.beginPath(); top.forEach(([x,y],i) => i?ctx.lineTo(x,y):ctx.moveTo(x,y)); ctx.closePath()
  ctx.fillStyle = shade(color, isSelected ? 1.1 : 0.85)
  if (glow) { ctx.shadowColor=color; ctx.shadowBlur=glow }
  ctx.fill()
  if (isSelected||isHovered) { ctx.strokeStyle=rgba(color,0.9); ctx.lineWidth=1.5; ctx.stroke() }
  ctx.shadowBlur=0

  // Rooftop beacon for selected
  if (isSelected) {
    const roofCenter = { sx: (t0.sx+t1.sx+t2.sx+t3.sx)/4, sy: (t0.sy+t1.sy+t2.sy+t3.sy)/4 }
    ctx.beginPath(); ctx.arc(roofCenter.sx, roofCenter.sy, 4, 0, Math.PI*2)
    ctx.fillStyle = color; ctx.shadowColor=color; ctx.shadowBlur=16; ctx.fill(); ctx.shadowBlur=0
  }

  // Return the full silhouette polygon for hit testing (union of all visible faces)
  const allPts = [...pts2d([b0,b1,b2,b3]), ...pts2d([t0,t1,t2,t3])]
  // Convex hull approximation — just use all 8 projected corner points
  return allPts
}

// ─── Ground tile ──────────────────────────────────────────────────────────────
function drawGroundTile(ctx, gx, gz, size, color, rotY, cx, cy, scale) {
  const hw = size/2
  const corners = [[-hw,0,-hw],[hw,0,-hw],[hw,0,hw],[-hw,0,hw]]
    .map(([x,y,z]) => project(gx+x, y, gz+z, rotY, cx, cy, scale))
  ctx.beginPath()
  corners.forEach((p,i) => i?ctx.lineTo(p.sx,p.sy):ctx.moveTo(p.sx,p.sy))
  ctx.closePath()
  ctx.fillStyle = color
  ctx.strokeStyle='rgba(255,255,255,0.04)'; ctx.lineWidth=.5
  ctx.fill(); ctx.stroke()
}

// ─── Road tile ────────────────────────────────────────────────────────────────
function drawRoadTile(ctx, gx, gz, rotY, cx, cy, scale) {
  drawGroundTile(ctx, gx, gz, 3.8, 'rgba(20,28,46,0.95)', rotY, cx, cy, scale)
  // Dashed center line
  const a = project(gx, 0.02, gz-1.6, rotY, cx, cy, scale)
  const b = project(gx, 0.02, gz+1.6, rotY, cx, cy, scale)
  ctx.beginPath(); ctx.moveTo(a.sx,a.sy); ctx.lineTo(b.sx,b.sy)
  ctx.strokeStyle='rgba(250,204,21,0.25)'; ctx.lineWidth=1.2
  ctx.setLineDash([4,6]); ctx.stroke(); ctx.setLineDash([])
}

// ─── Build city data ──────────────────────────────────────────────────────────
function buildCityData(contributors) {
  if (!contributors.length) return null
  const maxC = Math.max(...contributors.map(c=>c.commits), 1)

  // Positions in a ring + center
  const POSITIONS = [
    [0, 0],
    [5, 0], [-5, 0], [0, 5], [0, -5],
    [5, 5], [-5, 5], [5, -5], [-5, -5],
  ]

  return contributors.slice(0, 8).map((c, i) => {
    const [gx, gz] = POSITIONS[i] || [i*5, 0]
    const heightFactor = c.commits / maxC
    const h = 1.2 + heightFactor * 7.5   // height in world units
    const w = 1.2 + heightFactor * 0.5   // half-width

    const totalWin = 40
    const density  = 0.3 + heightFactor * 0.55
    const windows  = Array.from({length: totalWin}, () => Math.random() < density)

    return {
      login: c.login,
      color: c.color || PALETTE[i % PALETTE.length],
      gx, gz, h, w, windows,
      commits: c.commits,
      pct: Math.round((c.commits / contributors.reduce((s,x)=>s+x.commits,0))*100),
      rank: i+1,
    }
  })
}

// ─── Smoke particle ───────────────────────────────────────────────────────────
class Smoke {
  constructor(sx, sy) { this.sx=sx; this.sy=sy; this.vx=(Math.random()-.5)*.4; this.vy=-(Math.random()*.9+.4); this.life=1; this.r=2.5 }
  tick() { this.sx+=this.vx; this.sy+=this.vy; this.life-=0.014; this.r+=0.05 }
  draw(ctx) {
    ctx.beginPath(); ctx.arc(this.sx,this.sy,this.r,0,Math.PI*2)
    ctx.fillStyle=`rgba(148,163,184,${this.life*.22})`; ctx.fill()
  }
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function RepoCity({ contributors, fileList, collabEdges, commits, repoInfo }) {
  const canvasRef  = useRef()
  const afRef      = useRef()
  const stateRef   = useRef({
    rotY:     0,          // current rotation angle
    rotSpeed: 0.003,      // auto-rotate speed
    dragging: false,
    lastX:    0,
    manualRot: 0,         // accumulated manual rotation
    frame:    0,
    smoke:    [],
    hitZones: [],         // [{login, poly}]
  })
  const [selected, setSelected] = useState(null)
  const [hovered,  setHovered]  = useState(null)
  const [timeIdx,  setTimeIdx]  = useState(100)
  const hoveredRef  = useRef(null)
  const selectedRef = useRef(null)

  const W = 780, H = 800
  const CX = W / 2, CY = H * .52

  const cityData = useRef(null)
  useEffect(() => { cityData.current = buildCityData(contributors) }, [contributors])

  // Keep refs in sync
  useEffect(() => { hoveredRef.current  = hovered  }, [hovered])
  useEffect(() => { selectedRef.current = selected }, [selected])

  // ── Main render loop ──────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')
    const S = stateRef.current

    const draw = () => {
      const city = cityData.current
      S.frame++

      // Auto-rotate (pauses while dragging)
      if (!S.dragging) S.rotY += S.rotSpeed
      const rotY = S.rotY

      ctx.clearRect(0, 0, W, H)

      // Sky
      const sky = ctx.createLinearGradient(0,0,0,H)
      sky.addColorStop(0,'#020617'); sky.addColorStop(.6,'#0f172a'); sky.addColorStop(1,'#1e1b4b')
      ctx.fillStyle=sky; ctx.fillRect(0,0,W,H)

      // Sky nebula
      const neb = ctx.createRadialGradient(CX,H*.15,0,CX,H*.15,260)
      neb.addColorStop(0,'rgba(99,102,241,0.07)'); neb.addColorStop(1,'transparent')
      ctx.fillStyle=neb; ctx.fillRect(0,0,W,H)

      // Stars in sky (static, small)
      if (!draw._stars) draw._stars = Array.from({length:70},()=>({x:Math.random()*W,y:Math.random()*H*.42,r:Math.random()*.7+.2,o:Math.random()}))
      draw._stars.forEach(s=>{
        s.o+=(Math.random()-.5)*.01; s.o=Math.max(.05,Math.min(.75,s.o))
        ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fillStyle=`rgba(255,255,255,${s.o})`; ctx.fill()
      })

      // Ground plane
      const gnd = ctx.createLinearGradient(0,H*.44,0,H)
      gnd.addColorStop(0,'#0f172a'); gnd.addColorStop(1,'#060b18')
      ctx.fillStyle=gnd; ctx.fillRect(0,H*.44,W,H*.56)
      // Horizon glow
      const hor = ctx.createLinearGradient(0,H*.40,0,H*.52)
      hor.addColorStop(0,'transparent'); hor.addColorStop(.5,'rgba(99,102,241,0.09)'); hor.addColorStop(1,'transparent')
      ctx.fillStyle=hor; ctx.fillRect(0,H*.40,W,H*.12)

      if (!city) { afRef.current=requestAnimationFrame(draw); return }

      const cutoff = Math.floor(timeIdx/100 * city.length)
      const SCALE  = 1.0

      // Sort buildings back-to-front based on rotated depth
      const sortKey = b => b.gx * Math.sin(rotY) + b.gz * Math.cos(rotY)
      const sorted  = [...city].sort((a,b) => sortKey(b) - sortKey(a))

      // Ground tiles first
      sorted.forEach(b => {
        const tileColor = b.rank-1 <= cutoff ? rgba(b.color, 0.14) : 'rgba(15,23,42,0.6)'
        drawGroundTile(ctx, b.gx, b.gz, b.w*2+0.6, tileColor, rotY, CX, CY, SCALE)
      })

      // Roads between center and ring buildings
      city.slice(1).forEach(b => {
        const steps = Math.ceil(Math.max(Math.abs(b.gx), Math.abs(b.gz)) / 2)
        for (let s=1; s<steps; s++) {
          const rx = b.gx * s/steps, rz = b.gz * s/steps
          drawRoadTile(ctx, rx, rz, rotY, CX, CY, SCALE)
        }
      })

      // Collaboration beams (below buildings)
      ;(collabEdges||[]).slice(0,5).forEach(e => {
        const a = city.find(b=>b.login===e.from), b2 = city.find(b=>b.login===e.to)
        if (!a||!b2) return
        const str = e.strength / Math.max(...(collabEdges||[]).map(x=>x.strength),1)
        const pa = project(a.gx, a.h*.5, a.gz, rotY, CX, CY, SCALE)
        const pb = project(b2.gx, b2.h*.5, b2.gz, rotY, CX, CY, SCALE)
        const t = ((S.frame*.01 + e.strength*.4)%1)
        const mx = pa.sx+(pb.sx-pa.sx)*t, my = pa.sy+(pb.sy-pa.sy)*t
        ctx.beginPath(); ctx.moveTo(pa.sx,pa.sy); ctx.lineTo(pb.sx,pb.sy)
        ctx.strokeStyle=`rgba(99,102,241,${str*.1})`; ctx.lineWidth=.8; ctx.stroke()
        ctx.beginPath(); ctx.arc(mx,my,2.5,0,Math.PI*2)
        ctx.fillStyle=`rgba(167,139,250,${str*.65})`
        ctx.shadowColor='#a78bfa'; ctx.shadowBlur=5; ctx.fill(); ctx.shadowBlur=0
      })

      // Buildings
      S.hitZones = []
      sorted.forEach(b => {
        const visible = b.rank-1 <= cutoff
        if (!visible) {
          // Ghost
          ctx.save(); ctx.globalAlpha=.1
          drawBuilding(ctx, b.gx, b.gz, b.w, b.h, b.color, rotY, CX, CY, SCALE, false, false, null, S.frame)
          ctx.restore(); return
        }
        const isSel = selectedRef.current === b.login
        const isHov = hoveredRef.current  === b.login
        const poly  = drawBuilding(ctx, b.gx, b.gz, b.w, b.h, b.color, rotY, CX, CY, SCALE, isSel, isHov, b.windows, S.frame)
        S.hitZones.push({ login: b.login, poly })

        // Name tag
        const top = project(b.gx, b.h+0.4, b.gz, rotY, CX, CY, SCALE)
        ctx.font = isSel ? "bold 11px 'JetBrains Mono',monospace" : "9px 'JetBrains Mono',monospace"
        ctx.textAlign='center'; ctx.textBaseline='middle'
        ctx.fillStyle = isSel ? b.color : 'rgba(148,163,184,0.65)'
        if (isSel) { ctx.shadowColor=b.color; ctx.shadowBlur=8 }
        ctx.fillText(b.login, top.sx, top.sy)
        if (isSel) {
          ctx.font="9px 'JetBrains Mono',monospace"; ctx.fillStyle='rgba(148,163,184,0.8)'; ctx.shadowBlur=0
          ctx.fillText(`${b.commits}c · ${b.pct}%`, top.sx, top.sy+13)
        }
        ctx.shadowBlur=0

        // Chimney smoke (top 3)
        if (b.rank <= 3 && S.frame % 7 === 0) {
          const chimney = project(b.gx+(Math.random()-.5)*b.w*.5, b.h+0.1, b.gz+(Math.random()-.5)*b.w*.5, rotY, CX, CY, SCALE)
          S.smoke.push(new Smoke(chimney.sx, chimney.sy))
        }
      })

      // Smoke
      S.smoke = S.smoke.filter(s=>s.life>0)
      S.smoke.forEach(s=>{ s.tick(); s.draw(ctx) })

      // Legend panel
      ctx.save()
      const legendH = contributors.length * 20 + 36
      ctx.fillStyle='rgba(2,6,23,0.6)'; ctx.strokeStyle='rgba(255,255,255,0.07)'; ctx.lineWidth=1
      ctx.beginPath(); ctx.roundRect(12,12,162,legendH,10); ctx.fill(); ctx.stroke()
      ctx.font="8px 'JetBrains Mono',monospace"; ctx.textAlign='left'; ctx.fillStyle='#475569'
      ctx.fillText('◈ CONTRIBUTORS', 22, 28)
      contributors.slice(0,8).forEach((c,i) => {
        ctx.beginPath(); ctx.arc(22,44+i*20,5,0,Math.PI*2); ctx.fillStyle=c.color; ctx.fill()
        ctx.fillStyle='#94a3b8'; ctx.font="10px 'JetBrains Mono',monospace"
        ctx.fillText(c.login, 33, 48+i*20)
        ctx.fillStyle='#334155'; ctx.font="9px 'JetBrains Mono',monospace"
        ctx.fillText(`${c.commits}c`, 132, 48+i*20)
      })
      // Rotation hint
      ctx.fillStyle='#1e293b'; ctx.font="8px 'JetBrains Mono',monospace"
      ctx.fillText('drag to rotate', 22, legendH+6)
      ctx.restore()

      afRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(afRef.current)
  }, [contributors, collabEdges, timeIdx])

  // ── Mouse interaction ─────────────────────────────────────────────────────
  const getHit = (clientX, clientY) => {
    const canvas = canvasRef.current; if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const mx = (clientX - rect.left) * (W / rect.width)
    const my = (clientY - rect.top)  * (H / rect.height)
    const S = stateRef.current
    // Check hit zones in reverse (front-to-back)
    for (let i = S.hitZones.length-1; i >= 0; i--) {
      const hz = S.hitZones[i]
      if (pointInPoly(mx, my, hz.poly)) return hz.login
    }
    return null
  }

  const onMouseDown = (e) => {
    stateRef.current.dragging = true
    stateRef.current.lastX = e.clientX
    e.preventDefault()
  }
  const onMouseMove = (e) => {
    const S = stateRef.current
    if (S.dragging) {
      const dx = e.clientX - S.lastX
      S.rotY += dx * 0.008
      S.rotY = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, S.rotY))  // ← ADD THIS
      S.lastX = e.clientX
    } else {
      const hit = getHit(e.clientX, e.clientY)
      if (hit !== hoveredRef.current) setHovered(hit)
    }
  }
  const onMouseUp = (e) => {
    const S = stateRef.current
    const wasDrag = Math.abs(e.clientX - S.lastX) > 3
    S.dragging = false
    if (!wasDrag) {
      const hit = getHit(e.clientX, e.clientY)
      setSelected(s => s === hit ? null : hit)
    }
  }
  const onMouseLeave = () => { stateRef.current.dragging=false; setHovered(null) }

  // Touch support
  const onTouchStart = (e) => { stateRef.current.dragging=true; stateRef.current.lastX=e.touches[0].clientX }
  const onTouchMove  = (e) => {
    const S=stateRef.current; if(!S.dragging) return
    const dx=e.touches[0].clientX-S.lastX; S.rotY+=dx*0.008;
    S.rotY = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, S.rotY))  // ← ADD THIS
    S.lastX=e.touches[0].clientX
  }
  const onTouchEnd   = (e) => { stateRef.current.dragging=false }

  const sel   = contributors.find(c=>c.login===selected)
  const total = contributors.reduce((s,c)=>s+c.commits,0)

  return (
    <div>
      <div style={{textAlign:'center',marginBottom:18}}>
        <div style={{fontSize:10,letterSpacing:'0.3em',color:'#818cf8',fontFamily:"'JetBrains Mono',monospace",marginBottom:6}}>◈ REPO CITY — COMMIT SKYLINE</div>
        <p style={{color:'#334155',fontSize:11,fontFamily:"'JetBrains Mono',monospace"}}>
          Building height = commits · Windows = activity · Drag to orbit · Click a building to inspect
        </p>
      </div>

      <div style={{display:'flex',gap:20,flexWrap:'wrap',alignItems:'flex-start'}}>
        {/* Canvas */}
        <div style={{position:'relative',flex:'1 1 500px'}}>
          <canvas ref={canvasRef} width={W} height={H}
            onMouseDown={onMouseDown} onMouseMove={onMouseMove}
            onMouseUp={onMouseUp} onMouseLeave={onMouseLeave}
            onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
            style={{borderRadius:16,maxWidth:'100%',display:'block',
              border:'1px solid rgba(255,255,255,0.07)',
              cursor: hovered ? 'pointer' : 'grab',
              userSelect:'none',touchAction:'none'}}
          />
        </div>

        {/* Side panel */}
        <div style={{width:200,display:'flex',flexDirection:'column',gap:12}}>
          {sel ? (
            <div style={{background:rgba(sel.color,0.07),border:`1px solid ${rgba(sel.color,0.28)}`,borderRadius:14,padding:16}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                <div style={{width:9,height:9,borderRadius:'50%',background:sel.color,boxShadow:`0 0 7px ${sel.color}`}}/>
                <div style={{color:'#f1f5f9',fontWeight:700,fontFamily:"'JetBrains Mono',monospace",fontSize:13}}>{sel.login}</div>
              </div>
              <div style={{color:sel.color,fontFamily:"'JetBrains Mono',monospace",fontSize:22,fontWeight:800}}>{sel.commits}</div>
              <div style={{color:'#475569',fontSize:10,fontFamily:"'JetBrains Mono',monospace",marginBottom:10}}>commits · {Math.round((sel.commits/total)*100)}%</div>
              <div style={{height:3,background:'rgba(255,255,255,0.06)',borderRadius:99,overflow:'hidden',marginBottom:12}}>
                <div style={{height:'100%',width:`${Math.round((sel.commits/total)*100)}%`,background:sel.color,borderRadius:99}}/>
              </div>
              <div style={{color:'#334155',fontSize:9,fontFamily:"'JetBrains Mono',monospace",marginBottom:6,letterSpacing:'0.08em'}}>COLLABORATES WITH</div>
              {(collabEdges||[]).filter(e=>e.from===sel.login||e.to===sel.login).slice(0,3).map(e=>{
                const p=e.from===sel.login?e.to:e.from
                const pc=contributors.find(c=>c.login===p)
                return (
                  <div key={p} style={{display:'flex',alignItems:'center',gap:6,marginBottom:5}}>
                    <div style={{width:5,height:5,borderRadius:'50%',background:pc?.color||'#6366f1'}}/>
                    <span style={{fontSize:10,color:'#64748b',fontFamily:"'JetBrains Mono',monospace",flex:1}}>{p}</span>
                    <span style={{fontSize:9,color:'#475569',fontFamily:"'JetBrains Mono',monospace"}}>{e.strength}×</span>
                  </div>
                )
              })}
              <button onClick={()=>setSelected(null)} style={{marginTop:10,width:'100%',background:'transparent',border:'1px solid rgba(255,255,255,0.08)',color:'#475569',fontSize:10,padding:'5px',borderRadius:6,fontFamily:"'JetBrains Mono',monospace",cursor:'pointer'}}>× deselect</button>
            </div>
          ) : (
            <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:14,padding:16}}>
              <div style={{color:'#334155',fontSize:9,fontFamily:"'JetBrains Mono',monospace",marginBottom:12,letterSpacing:'0.1em'}}>CITY STATS</div>
              {[['Buildings',contributors.length],['Total commits',total],['Language',repoInfo?.language||'—'],['Top dev',contributors[0]?.login||'—']].map(([l,v])=>(
                <div key={l} style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                  <span style={{color:'#475569',fontSize:11,fontFamily:"'JetBrains Mono',monospace"}}>{l}</span>
                  <span style={{color:'#a5b4fc',fontFamily:"'JetBrains Mono',monospace",fontSize:11,fontWeight:700}}>{v}</span>
                </div>
              ))}
              <div style={{marginTop:12,color:'#1e293b',fontSize:9,fontFamily:"'JetBrains Mono',monospace",lineHeight:1.9}}>
                🏢 Height = commits<br/>
                💡 Windows = activity<br/>
                🔵 Beams = collaboration<br/>
                🌫 Smoke = top contributors<br/>
                ↔ Drag to orbit 360°
              </div>
            </div>
          )}

          {/* Time scrubber */}
          <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:14,padding:16}}>
            <div style={{color:'#334155',fontSize:9,fontFamily:"'JetBrains Mono',monospace",marginBottom:10,letterSpacing:'0.1em'}}>⏰ TIME TRAVEL</div>
            <input type="range" min={0} max={100} value={timeIdx}
              onChange={e=>setTimeIdx(Number(e.target.value))}
              style={{width:'100%',accentColor:'#6366f1',cursor:'pointer'}}
            />
            <div style={{display:'flex',justifyContent:'space-between',marginTop:6}}>
              <span style={{color:'#1e293b',fontSize:9,fontFamily:"'JetBrains Mono',monospace"}}>FIRST</span>
              <span style={{color:'#818cf8',fontSize:9,fontFamily:"'JetBrains Mono',monospace"}}>{timeIdx}%</span>
              <span style={{color:'#1e293b',fontSize:9,fontFamily:"'JetBrains Mono',monospace"}}>NOW</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
