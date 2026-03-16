/**
 * SpaceBackground.jsx  v6
 * - No scanlines
 * - Faster camera drift + faster shooting stars
 * - Hero rocket cruising through the scene with engine trail
 * - Star Wars pastel neon palette
 */

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const rnd  = (a, b) => Math.random() * (b - a) + a
const rndI = (a, b) => Math.floor(rnd(a, b))
const TAU  = Math.PI * 2

const NEONS = [0x88eeff, 0xee88ff, 0xff88aa, 0xaaffcc, 0xffddaa, 0x88bbff, 0xff99cc, 0xccff88]

export default function SpaceCity3D({ style, children, onEnter }) {
  const mountRef = useRef(null)
  const rafRef   = useRef(null)

  useEffect(() => {
    const el = mountRef.current
    if (!el) return

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.setSize(el.clientWidth, el.clientHeight)
    renderer.setClearColor(0x020510, 1)
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.fog   = new THREE.FogExp2(0x020510, 0.0006)

    const camera = new THREE.PerspectiveCamera(70, el.clientWidth / el.clientHeight, 0.1, 2000)
    camera.position.set(0, 0, 0)

    scene.add(new THREE.AmbientLight(0xffffff, 0.5))
    const dirL = new THREE.DirectionalLight(0x8899ff, 1.2)
    dirL.position.set(-100, 200, 100)
    scene.add(dirL)

    // ── STARS (3 depth layers) ───────────────────────────────────────────────
    function makeStarLayer(count, radius, size, opacity) {
      const verts = []
      for (let i = 0; i < count; i++) {
        const θ = rnd(0, TAU), φ = Math.acos(2 * Math.random() - 1), r = rnd(radius * 0.55, radius)
        verts.push(r*Math.sin(φ)*Math.cos(θ), r*Math.cos(φ), r*Math.sin(φ)*Math.sin(θ))
      }
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
      const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color:0xffffff, size, sizeAttenuation:true, transparent:true, opacity }))
      scene.add(pts)
      return pts
    }
    const s1 = makeStarLayer(4500, 450, 0.85, 0.9)
    const s2 = makeStarLayer(180, 450, 1.7,  0.9)
    const s3 = makeStarLayer(700,  200, 1.2,  0.85)

    // ── NEBULA PLANES ────────────────────────────────────────────────────────
    ;[
      { p:[ 420, 110,-320], c:0x220055, s:650, op:0.28 },
      { p:[-360,  90, 370], c:0x003322, s:550, op:0.22 },
      { p:[ 110, 270, 430], c:0x440022, s:600, op:0.20 },
      { p:[-210,-160,-430], c:0x001144, s:520, op:0.25 },
      { p:[ 520, -90, 220], c:0x112200, s:460, op:0.18 },
      { p:[-430, 210,-110], c:0x330011, s:540, op:0.22 },
    ].forEach(n => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(n.s, n.s),
        new THREE.MeshBasicMaterial({ color:n.c, transparent:true, opacity:n.op, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide })
      )
      m.position.set(...n.p); m.lookAt(0,0,0); scene.add(m)
    })

    // orbital rings removed

    // ── SHOOTING STARS (faster) ──────────────────────────────────────────────
    const SHOOT_COUNT = 28
    const shootStars  = []

    function spawnShootingStar() {
      const trailLen = rndI(20, 45)
      const geo = new THREE.BufferGeometry()
      const positions = new Float32Array(trailLen * 3)
      const colors    = new Float32Array(trailLen * 3)
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3))
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ vertexColors:true, transparent:true, opacity:1, blending:THREE.AdditiveBlending, depthWrite:false }))
      scene.add(line)

      const θ = rnd(0, TAU), φ = rnd(0.15, Math.PI-0.15), r = rnd(220, 750)
      const ox = r*Math.sin(φ)*Math.cos(θ), oy = r*Math.cos(φ), oz = r*Math.sin(φ)*Math.sin(θ)
      const nx = Math.sin(φ)*Math.cos(θ), ny = Math.cos(φ), nz = Math.sin(φ)*Math.sin(θ)
      const up = Math.abs(ny) < 0.9 ? [0,1,0] : [1,0,0]
      const tx = up[1]*nz-up[2]*ny, ty = up[2]*nx-up[0]*nz, tz = up[0]*ny-up[1]*nx
      const tl = Math.sqrt(tx*tx+ty*ty+tz*tz)
      const speed = rnd(5, 14)   // faster
      const col = new THREE.Color().setHex(Math.random() > 0.45 ? 0xffffff : NEONS[rndI(0, NEONS.length)])

      return { line, positions, colors, trailLen, x:ox, y:oy, z:oz,
        vx:(tx/tl)*speed, vy:(ty/tl)*speed, vz:(tz/tl)*speed,
        color:col, age:0, life:rndI(30, 70), history:[] }
    }

    for (let i = 0; i < SHOOT_COUNT; i++) shootStars.push(spawnShootingStar())

    // ── FIGHTER SHIPS ────────────────────────────────────────────────────────
    function makeShip(team) {
      const g   = new THREE.Group()
      const col = team === 0 ? 0x1a3060 : 0x3a1010
      const nc  = team === 0 ? 0x88eeff : 0xff6644

      const bGeo = new THREE.ConeGeometry(0.48, 2.8, 5)
      bGeo.rotateX(Math.PI/2)
      g.add(new THREE.Mesh(bGeo, new THREE.MeshLambertMaterial({ color:col })))

      const wm = new THREE.MeshLambertMaterial({ color:col })
      ;[-1,1].forEach(s => {
        const w = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.07, 0.7), wm)
        w.position.set(s*1.0,0,0.1); w.rotation.z=s*-0.14; g.add(w)
      })

      const ec = new THREE.Color(nc)
      const el2 = new THREE.PointLight(ec, 2.5, 14); el2.position.set(0,0,-1.5); g.add(el2)
      const es = new THREE.Mesh(new THREE.SphereGeometry(0.14,5,5), new THREE.MeshBasicMaterial({ color:ec, blending:THREE.AdditiveBlending, transparent:true }))
      es.position.copy(el2.position); g.add(es)

      const θ=rnd(0,TAU), φ=rnd(0.2,Math.PI-0.2), r=rnd(90,260)
      g.position.set(r*Math.sin(φ)*Math.cos(θ), r*Math.cos(φ), r*Math.sin(φ)*Math.sin(θ))
      const vθ=θ+rnd(-0.4,0.4), sp=rnd(0.14,0.26)
      scene.add(g)
      return { group:g, vel:new THREE.Vector3(Math.cos(vθ)*sp, rnd(-0.02,0.02), Math.sin(vθ)*sp), engLight:el2, engSphere:es, phase:rnd(0,TAU), team, hp:3, shootT:rndI(20,80), alive:true }
    }

    const blues = Array.from({ length:8 }, () => makeShip(0))
    const reds  = Array.from({ length:8 }, () => makeShip(1))
    const allShips = [...blues, ...reds]

    // ── LASER POOL ───────────────────────────────────────────────────────────
    const LPOOL = 120, laserPool = []
    for (let i = 0; i < LPOOL; i++) {
      const isB = i < LPOOL/2
      const geo = new THREE.CylinderGeometry(0.05, 0.05, 3.5, 4); geo.rotateX(Math.PI/2)
      const mat = new THREE.MeshBasicMaterial({ color:isB?0x44bbff:0xff4422, transparent:true, opacity:0, blending:THREE.AdditiveBlending, depthWrite:false })
      const mesh = new THREE.Mesh(geo, mat); mesh.visible=false; scene.add(mesh)
      laserPool.push({ mesh, mat, vel:new THREE.Vector3(), age:0, maxAge:60, alive:false, team:isB?0:1 })
    }
    function fireLaser(origin, dir, team) {
      const s=team===0?0:LPOOL/2, e=team===0?LPOOL/2:LPOOL
      for (let i=s;i<e;i++) {
        if (!laserPool[i].alive) {
          const l=laserPool[i]; l.alive=true; l.age=0
          l.mesh.position.copy(origin); l.vel.copy(dir).normalize().multiplyScalar(2.8)
          l.mat.opacity=0.95; l.mesh.visible=true
          l.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1), dir.clone().normalize())
          return
        }
      }
    }

    // ── EXPLOSION POOL ───────────────────────────────────────────────────────
    const EPOOL=16, explPool=[]
    for (let i=0;i<EPOOL;i++) {
      const light=new THREE.PointLight(0xff6622,0,45); scene.add(light)
      const ring=new THREE.Mesh(new THREE.TorusGeometry(1,0.1,5,20), new THREE.MeshBasicMaterial({ color:0xff6622, transparent:true, opacity:0, blending:THREE.AdditiveBlending, depthWrite:false }))
      const ring2=ring.clone(); ring2.material=ring.material.clone()
      scene.add(ring); scene.add(ring2)
      explPool.push({ light, ring, ring2, alive:false, age:0 })
    }
    function spawnExplosion(pos) {
      for (let i=0;i<EPOOL;i++) {
        if (!explPool[i].alive) {
          const e=explPool[i]; e.alive=true; e.age=0
          e.light.position.copy(pos)
          e.ring.position.copy(pos);  e.ring.scale.setScalar(0.1);  e.ring.rotation.set(rnd(0,TAU),rnd(0,TAU),0)
          e.ring2.position.copy(pos); e.ring2.scale.setScalar(0.1); e.ring2.rotation.set(rnd(0,TAU),rnd(0,TAU),rnd(0,TAU))
          return
        }
      }
    }

    // ── HERO ROCKET ─────────────────────────────────────────────────────────
    const rocket = new THREE.Group()

    // nose cone
    const noseMat = new THREE.MeshLambertMaterial({ color: 0xddeeff })
    const noseGeo = new THREE.ConeGeometry(0.55, 2.2, 12)
    noseGeo.rotateX(Math.PI / 2)
    const noseMesh = new THREE.Mesh(noseGeo, noseMat)
    noseMesh.position.set(0, 0, 2.0)
    rocket.add(noseMesh)

    // main body
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0xbbccee })
    const bodyGeo = new THREE.CylinderGeometry(0.55, 0.55, 4.5, 14)
    bodyGeo.rotateX(Math.PI / 2)
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat)
    rocket.add(bodyMesh)

    // tail cone
    const tailGeo = new THREE.ConeGeometry(0.55, 1.4, 12)
    tailGeo.rotateX(-Math.PI / 2)
    const tailMesh = new THREE.Mesh(tailGeo, new THREE.MeshLambertMaterial({ color: 0x99aacc }))
    tailMesh.position.set(0, 0, -3.1)
    rocket.add(tailMesh)

    // fins (4)
    const finMat = new THREE.MeshLambertMaterial({ color: 0xee88ff, side: THREE.DoubleSide })
    ;[0, 1, 2, 3].forEach(i => {
      const shape = new THREE.Shape()
      shape.moveTo(0, 0); shape.lineTo(0, -1.4); shape.lineTo(1.5, -2.2); shape.lineTo(1.5, 0)
      const finGeo = new THREE.ShapeGeometry(shape)
      const fin = new THREE.Mesh(finGeo, finMat)
      fin.position.set(0, 0, -2.8)
      fin.rotation.z = (i / 4) * TAU
      fin.rotation.x = Math.PI / 2
      // offset outward
      fin.translateY(0.55)
      rocket.add(fin)
    })

    // window ring
    const winRingMat = new THREE.MeshBasicMaterial({ color: 0x88eeff, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.8 })
    const winRing = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.06, 6, 22), winRingMat)
    winRing.rotation.x = Math.PI / 2
    winRing.position.z = 0.8
    rocket.add(winRing)

    // porthole
    const porthole = new THREE.Mesh(
      new THREE.CircleGeometry(0.22, 12),
      new THREE.MeshBasicMaterial({ color: 0xaaddff, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.9 })
    )
    porthole.position.set(0.56, 0, 0.8)
    porthole.rotation.y = Math.PI / 2
    rocket.add(porthole)

    // engine glow (main)
    const engCol = new THREE.Color(0xff9944)
    const engLight = new THREE.PointLight(engCol, 4, 22)
    engLight.position.set(0, 0, -4.2)
    rocket.add(engLight)

    // engine flame cone
    const flameGeo = new THREE.ConeGeometry(0.5, 2.5, 10)
    flameGeo.rotateX(-Math.PI / 2)
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff7722, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.85 })
    const flameMesh = new THREE.Mesh(flameGeo, flameMat)
    flameMesh.position.set(0, 0, -5.0)
    rocket.add(flameMesh)

    // inner flame (brighter core)
    const innerFlame = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 1.8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.9 })
    )
    innerFlame.rotation.x = -Math.PI / 2
    innerFlame.position.set(0, 0, -4.6)
    rocket.add(innerFlame)

    // exhaust trail (particle-style line segments)
    const TRAIL_LEN   = 60
    const trailPos    = new Float32Array(TRAIL_LEN * 3)
    const trailColors = new Float32Array(TRAIL_LEN * 3)
    const trailGeo    = new THREE.BufferGeometry()
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3))
    trailGeo.setAttribute('color',    new THREE.BufferAttribute(trailColors, 3))
    const trailMat  = new THREE.LineBasicMaterial({ vertexColors:true, transparent:true, opacity:1, blending:THREE.AdditiveBlending, depthWrite:false })
    const trailLine = new THREE.Line(trailGeo, trailMat)
    scene.add(trailLine)
    const trailHistory = []

    // rocket flight path — figure-8 / lissajous through space
    rocket.scale.setScalar(1.8)
    scene.add(rocket)

    // ── RESIZE ───────────────────────────────────────────────────────────────
    const onResize = () => {
      camera.aspect = el.clientWidth / el.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(el.clientWidth, el.clientHeight)
    }
    window.addEventListener('resize', onResize)

    // ── LOOP ─────────────────────────────────────────────────────────────────
    const clock = new THREE.Clock()
    const _tmp  = new THREE.Vector3()
    let frame   = 0

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop)
      const t = clock.getElapsedTime()
      frame++

      // ── camera slow drift (faster than before) ───────────────────────────
      const camR   = 16
      const camSpd = 0.15
      camera.position.set(
        Math.sin(t * camSpd)          * camR,
        Math.sin(t * camSpd * 0.65)   * 5,
        Math.cos(t * camSpd)          * camR
      )
      camera.lookAt(
        Math.sin(t * 0.055) * 4,
        Math.sin(t * 0.042) * 2.5,
        0
      )

      // ── ROCKET FLIGHT ────────────────────────────────────────────────────
      // Lissajous path in 3D — sweeping arc across the scene
      const rs  = 0.9   // rocket speed
      const rx  = Math.sin(t * rs)          * 110
      const ry  = Math.sin(t * rs * 1.3)    * 40
      const rz  = Math.cos(t * rs * 0.7)    * 90

      // next point to face toward
      const nrs  = rs
      const dt2  = 0.05
      const nrx  = Math.sin((t+dt2)*nrs)       * 110
      const nry  = Math.sin((t+dt2)*nrs*1.3)   * 40
      const nrz  = Math.cos((t+dt2)*nrs*0.7)   * 90

      rocket.position.set(rx, ry, rz)
      rocket.lookAt(nrx, nry, nrz)
      // rocket native axis is +Z forward, lookAt gives -Z to target, correct:
      rocket.rotateX(-Math.PI / 2)

      // gentle roll
      rocket.rotateZ(t * 0.18)

      // engine flicker
      const fp = 0.7 + 0.3 * Math.sin(t * 18)
      flameMat.opacity   = 0.7 + 0.3 * fp
      flameMesh.scale.z  = 0.85 + 0.3 * fp
      innerFlame.scale.z = 0.8  + 0.4 * fp
      engLight.intensity = 4 * fp
      winRingMat.opacity = 0.6 + 0.4 * Math.sin(t * 2.5)

      // trail
      const exhaustWorld = rocket.localToWorld(new THREE.Vector3(0, 0, -4.5))
      trailHistory.unshift({ x:exhaustWorld.x, y:exhaustWorld.y, z:exhaustWorld.z })
      if (trailHistory.length > TRAIL_LEN) trailHistory.length = TRAIL_LEN

      for (let i = 0; i < trailHistory.length; i++) {
        const h = trailHistory[i], idx = i * 3
        trailPos[idx]   = h.x; trailPos[idx+1] = h.y; trailPos[idx+2] = h.z
        const fade  = 1 - i / trailHistory.length
        const r = fade > 0.5 ? 1 : fade * 1.8
        const g2 = fade * 0.55
        const b  = fade * 0.2
        trailColors[idx]   = r * fade
        trailColors[idx+1] = g2 * fade
        trailColors[idx+2] = b * fade
      }
      trailGeo.attributes.position.needsUpdate = true
      trailGeo.attributes.color.needsUpdate    = true
      trailGeo.setDrawRange(0, trailHistory.length)

      // ── SHOOTING STARS ────────────────────────────────────────────────────
      shootStars.forEach((ss, si) => {
        ss.age++
        ss.x += ss.vx; ss.y += ss.vy; ss.z += ss.vz
        ss.history.unshift({ x:ss.x, y:ss.y, z:ss.z })
        if (ss.history.length > ss.trailLen) ss.history.length = ss.trailLen

        for (let i = 0; i < ss.history.length; i++) {
          const h=ss.history[i], idx=i*3
          ss.positions[idx]=h.x; ss.positions[idx+1]=h.y; ss.positions[idx+2]=h.z
          const f = 1 - i/ss.history.length
          ss.colors[idx]=ss.color.r*f; ss.colors[idx+1]=ss.color.g*f; ss.colors[idx+2]=ss.color.b*f
        }
        ss.line.geometry.attributes.position.needsUpdate = true
        ss.line.geometry.attributes.color.needsUpdate    = true
        ss.line.geometry.setDrawRange(0, ss.history.length)

        const lr = ss.age/ss.life
        ss.line.material.opacity = Math.max(0, lr<0.12 ? lr/0.12 : lr>0.72 ? 1-(lr-0.72)/0.28 : 1)

        if (ss.age >= ss.life) {
          scene.remove(ss.line); ss.line.geometry.dispose()
          shootStars[si] = spawnShootingStar()
        }
      })

      // ── SHIPS ─────────────────────────────────────────────────────────────
      allShips.forEach(s => {
        if (!s.alive) return
        const enemies = s.team===0 ? reds : blues
        let nearest=null, nd=Infinity
        enemies.forEach(e => { if(!e.alive) return; const d=s.group.position.distanceTo(e.group.position); if(d<nd){nearest=e;nd=d} })

        if (nearest) { const toE=nearest.group.position.clone().sub(s.group.position).normalize(); s.vel.lerp(toE.multiplyScalar(0.22),0.022) }
        const dist=s.group.position.length()
        if(dist>280) s.vel.add(s.group.position.clone().normalize().multiplyScalar(-0.025))
        if(dist<40)  s.vel.add(s.group.position.clone().normalize().multiplyScalar( 0.025))
        s.group.position.add(s.vel)
        if(s.vel.length()>0.005){ s.group.lookAt(s.group.position.clone().add(s.vel)); s.group.rotateX(-Math.PI/2) }
        const ep=0.5+0.5*Math.sin(t*7+s.phase)
        s.engLight.intensity=ep*2.8; s.engSphere.material.opacity=0.4+0.6*ep
        s.shootT--
        if(s.shootT<=0&&nearest&&nd<120){ const dir=nearest.group.position.clone().sub(s.group.position); fireLaser(s.group.position.clone(),dir,s.team); s.shootT=rndI(15,50) }
      })

      // ── LASERS ────────────────────────────────────────────────────────────
      laserPool.forEach(l => {
        if(!l.alive) return
        l.mesh.position.add(l.vel); l.age++
        l.mat.opacity=Math.max(0, 0.95*(1-l.age/l.maxAge))
        if(l.age>=l.maxAge){ l.alive=false; l.mesh.visible=false; return }
        const targets=l.team===0?reds:blues
        targets.forEach(f => {
          if(!f.alive) return
          if(_tmp.copy(l.mesh.position).sub(f.group.position).length()<3){ l.alive=false; l.mesh.visible=false; f.hp--; if(f.hp<=0){ spawnExplosion(f.group.position.clone()); f.alive=false; scene.remove(f.group); setTimeout(()=>{ const θ2=rnd(0,TAU),φ2=rnd(0.2,Math.PI-0.2),r2=rnd(100,250); f.group.position.set(r2*Math.sin(φ2)*Math.cos(θ2),r2*Math.cos(φ2),r2*Math.sin(φ2)*Math.sin(θ2)); f.hp=3; f.alive=true; scene.add(f.group) },rndI(2000,5000)) } }
        })
      })

      // ── EXPLOSIONS ────────────────────────────────────────────────────────
      explPool.forEach(e => {
        if(!e.alive) return; e.age++
        const inv=1-e.age/45
        e.light.intensity=10*inv*inv
        e.ring.scale.setScalar(0.1+e.age*0.7);  e.ring.material.opacity=0.9*inv*inv
        e.ring2.scale.setScalar(0.1+e.age*0.45); e.ring2.material.opacity=0.7*inv*inv
        if(e.age>=45){ e.alive=false; e.light.intensity=0; e.ring.material.opacity=0; e.ring2.material.opacity=0 }
      })

      // ── RINGS ─────────────────────────────────────────────────────────────
      // rings removed

      // ── STAR DRIFT ────────────────────────────────────────────────────────
      s1.rotation.y=t*0.00015; s2.rotation.y=t*0.00028; s3.rotation.y=t*0.00045

      renderer.render(scene, camera)
    }

    loop()

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      if(el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div ref={mountRef} style={{ position:'relative', width:'100%', height:'100vh', overflow:'hidden', background:'#020510', ...style }}>

      {/* TITLE */}
      <div style={{ position:'absolute', inset:0, zIndex:10, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>

        <div style={{ fontFamily:"'Courier New',monospace", fontSize:'clamp(9px,1.1vw,13px)', letterSpacing:'0.55em', color:'rgba(136,238,255,0.6)', marginBottom:20, textTransform:'uppercase' }}>
          ── supercharge your git workflow ──
        </div>

        <div style={{ fontFamily:"'Courier New','Lucida Console',monospace", fontSize:'clamp(52px,10vw,120px)', fontWeight:900, lineHeight:1, letterSpacing:'0.04em', background:'linear-gradient(135deg,#ffffff 0%,#88eeff 28%,#ee88ff 54%,#ff99cc 78%,#ffddaa 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', filter:'drop-shadow(0 0 40px rgba(136,200,255,0.5))', marginBottom:12, userSelect:'none' }}>
          GitLens
        </div>

        <div style={{ fontFamily:"'Courier New',monospace", fontSize:'clamp(13px,1.8vw,20px)', letterSpacing:'0.35em', color:'rgba(200,180,255,0.65)', fontWeight:300, marginBottom:44, textTransform:'uppercase' }}>
          git supercharged
        </div>

        <div style={{ width:'clamp(200px,30vw,380px)', height:1, marginBottom:40, background:'linear-gradient(90deg,transparent,rgba(136,200,255,0.5),rgba(238,136,255,0.5),transparent)' }} />

        <div style={{ display:'flex', gap:'clamp(16px,3vw,36px)', marginBottom:50 }}>
          {[
            { val:'20+',  label:'FEATURES',     col:'#88eeff' },
            { val:'TEAM REBEL LOGS',  label:'',       col:'#ee88ff' },
            { val:'100%',  label:'OPEN SOURCE',  col:'#aaffcc' },
          ].map(({ val, label, col }) => (
            <div key={label} style={{ textAlign:'center', fontFamily:"'Courier New',monospace" }}>
              <div style={{ fontSize:'clamp(22px,3.5vw,38px)', fontWeight:700, color:col, filter:`drop-shadow(0 0 10px ${col})`, lineHeight:1.1 }}>{val}</div>
              <div style={{ fontSize:'clamp(8px,0.9vw,11px)', letterSpacing:'0.25em', color:'rgba(180,200,255,0.5)', marginTop:5 }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ display:'flex', gap:14, pointerEvents:'auto' }}>
          {[
            { label:'LAUNCH APP', primary:true  },
            // { label:'VIEW DOCS',    primary:false },
          ].map(({ label, primary }) => (
            <button key={label} onClick={primary ? onEnter : undefined} style={{ padding:'clamp(10px,1.2vw,14px) clamp(22px,3vw,40px)', background:primary?'rgba(136,180,255,0.14)':'transparent', border:`1px solid ${primary?'rgba(136,200,255,0.65)':'rgba(136,200,255,0.28)'}`, color:primary?'rgba(200,230,255,0.95)':'rgba(136,180,255,0.6)', fontFamily:"'Courier New',monospace", fontSize:'clamp(10px,1.1vw,13px)', letterSpacing:'0.35em', backdropFilter:'blur(10px)', transition:'all 0.22s ease', cursor:'pointer' }}
              onMouseEnter={e=>{ e.currentTarget.style.background='rgba(136,180,255,0.26)'; e.currentTarget.style.color='#fff'; e.currentTarget.style.borderColor='rgba(136,230,255,0.9)' }}
              onMouseLeave={e=>{ e.currentTarget.style.background=primary?'rgba(136,180,255,0.14)':'transparent'; e.currentTarget.style.color=primary?'rgba(200,230,255,0.95)':'rgba(136,180,255,0.6)'; e.currentTarget.style.borderColor=primary?'rgba(136,200,255,0.65)':'rgba(136,200,255,0.28)' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* vignette only — no scanlines */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:6, background:'radial-gradient(ellipse at 50% 50%, transparent 38%, rgba(2,5,16,0.7) 100%)' }} />

      {children && <div style={{ position:'absolute', inset:0, zIndex:20, pointerEvents:'auto' }}>{children}</div>}
    </div>
  )
}
