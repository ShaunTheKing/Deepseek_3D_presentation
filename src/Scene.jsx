import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  Billboard,
  Environment,
  Float,
  OrbitControls,
  Sparkles,
  Stars,
  Text,
  useGLTF,
  useTexture,
} from '@react-three/drei'
import { Bloom, EffectComposer, Noise, Vignette } from '@react-three/postprocessing'
import gsap from 'gsap'
import * as THREE from 'three'
import { CATALOG_BY_ID } from './catalog'
import fontUrl from '@fontsource/space-grotesk/files/space-grotesk-latin-400-normal.woff'

// Bridge so the App can trigger zoom without reaching into the Canvas.
export const controlsAPI = { zoomIn: null, zoomOut: null }

// --- Camera rig: flies (or orbits / fades) between slides. OrbitControls takes
// --- over when the flight settles; the rig resumes from wherever the user
// --- left the camera, so zoom/orbit state is never lost. -----------------------
function CameraRig({ camera, transition, active, onSettled }) {
  const { camera: cam } = useThree()
  const key = JSON.stringify(camera)
  const state = useRef(null)
  const settledRef = useRef(false)
  const onSettledRef = useRef(onSettled)
  onSettledRef.current = onSettled

  if (!state.current) {
    state.current = {
      pos: new THREE.Vector3(...camera.position),
      look: new THREE.Vector3(...camera.lookAt),
      fov: camera.fov ?? 50,
      orbit: 0,
      first: true,
    }
  }

  const target = useMemo(
    () => ({
      pos: new THREE.Vector3(...camera.position),
      look: new THREE.Vector3(...camera.lookAt),
      fov: camera.fov ?? 50,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  )

  // When the rig takes over, start from the LIVE camera (post-zoom/orbit).
  useEffect(() => {
    if (!active) return
    const s = state.current
    s.pos.copy(cam.position)
    const dir = new THREE.Vector3()
    cam.getWorldDirection(dir)
    s.look.copy(cam.position).add(dir)
    s.fov = cam.fov
  }, [active, cam])

  useEffect(() => {
    const s = state.current
    settledRef.current = false
    s.orbit = 0
    if (s.first) {
      // Snap to the first slide instead of flying in from the origin.
      cam.position.copy(target.pos)
      cam.lookAt(target.look)
      cam.fov = target.fov
      cam.updateProjectionMatrix()
      s.first = false
      settledRef.current = true
      onSettledRef.current?.()
    } else if (transition === 'orbit') {
      s.orbit = 1
    }
  }, [key, target, transition, cam])

  useFrame((_, dt) => {
    if (!active) return
    const s = state.current
    const t = Math.min(1, dt * 2.2) // framerate-independent damping
    s.pos.lerp(target.pos, t)
    s.look.lerp(target.look, t)
    s.fov += (target.fov - s.fov) * t

    // Orbit: swing around the lookAt target while settling in.
    if (s.orbit > 0.001) {
      s.orbit = Math.max(0, s.orbit - dt * 0.55)
      const dir = s.pos.clone().sub(s.look)
      dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), dt * s.orbit * 2.4)
      s.pos.copy(s.look).add(dir)
    }

    cam.position.copy(s.pos)
    cam.lookAt(s.look)
    cam.fov = s.fov
    cam.updateProjectionMatrix()

    if (
      !settledRef.current &&
      s.pos.distanceTo(target.pos) < 0.02 &&
      s.look.distanceTo(target.look) < 0.02 &&
      s.orbit < 0.02
    ) {
      settledRef.current = true
      onSettledRef.current?.() // hand control back to OrbitControls
    }
  })

  return null
}

// --- Error boundary: one failing asset/effect must never blank the app ----------
class LoadBoundary extends React.Component {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

// --- Nebula background: large back-side sphere, cheap gradient shader -----------
function NebulaBackground() {
  const meshRef = useRef()
  useFrame((_, dt) => {
    if (meshRef.current) meshRef.current.rotation.y += dt * 0.004
  })
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[30, 32, 24]} />
      <shaderMaterial
        side={THREE.BackSide}
        depthWrite={false}
        uniforms={{
          uTop: { value: new THREE.Color('#0b1230') },
          uMid: { value: new THREE.Color('#141b3d') },
          uBottom: { value: new THREE.Color('#060810') },
        }}
        vertexShader={`
          varying vec3 vPos;
          void main() {
            vPos = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`}
        fragmentShader={`
          varying vec3 vPos;
          uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uBottom;
          void main() {
            float t = normalize(vPos).y * 0.5 + 0.5;
            vec3 col = mix(uBottom, uMid, smoothstep(0.0, 0.55, t));
            col = mix(col, uTop, smoothstep(0.55, 1.0, t));
            float band = 0.5 + 0.5 * sin(vPos.x * 0.35 + vPos.z * 0.28);
            col += vec3(0.025, 0.012, 0.055) * band;
            gl_FragColor = vec4(col, 1.0);
          }`}
      />
    </mesh>
  )
}

// --- GSAP staggered entrance: objects scale in when their slide activates ------
function Entrance({ delay, children }) {
  const ref = useRef()
  useEffect(() => {
    const g = ref.current
    if (!g) return
    g.scale.setScalar(0.001)
    const tween = gsap.to(g.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration: 0.65,
      ease: 'back.out(1.3)',
      delay,
    })
    return () => tween.kill() // no leaked tweens when decks regenerate
  }, [delay])
  return <group ref={ref}>{children}</group>
}

// --- Objects ---------------------------------------------------------------------
function TextObject({ obj }) {
  const text = (
    <Text
      position={obj.position}
      fontSize={obj.fontSize}
      color={obj.color ?? '#ffffff'}
      maxWidth={12}
      anchorX="center"
      anchorY="middle"
      font={fontUrl}
      letterSpacing={0.03}
    >
      {obj.content}
    </Text>
  )
  return (
    <Float speed={1.4} rotationIntensity={0.12} floatIntensity={0.5}>
      {obj.billboard ? <Billboard>{text}</Billboard> : text}
    </Float>
  )
}

function PrimitiveObject({ obj }) {
  const geometry = {
    box: <boxGeometry />,
    sphere: <sphereGeometry />,
    torus: <torusGeometry args={[0.6, 0.16, 24, 64]} />,
    plane: <planeGeometry />,
  }[obj.shape]

  return (
    <mesh
      position={obj.position}
      rotation={obj.rotation ?? [0, 0, 0]}
      scale={obj.scale ?? [1, 1, 1]}
    >
      {geometry}
      {/* Physical material: clearcoat sheen on metallic "hero" objects. */}
      <meshPhysicalMaterial
        color={obj.color}
        metalness={obj.metalness ?? 0.2}
        roughness={obj.roughness ?? 0.5}
        emissive={obj.emissive ?? '#000000'}
        emissiveIntensity={obj.emissive ? 0.6 : 0}
        clearcoat={obj.metalness >= 0.4 ? 0.45 : 0.05}
        clearcoatRoughness={0.4}
      />
    </mesh>
  )
}

// Normalize any GLB to ~1.4 units tall, then apply the AI's scale multiplier.
function useNormalizedScale(scene, obj) {
  return useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene)
    const size = box.getSize(new THREE.Vector3())
    const max = Math.max(size.x, size.y, size.z, 1e-6)
    return (1.4 / max) * (obj.scale ?? 1)
  }, [scene, obj.scale])
}

function GlbObject({ obj }) {
  const entry = CATALOG_BY_ID[obj.assetId]
  const { scene } = useGLTF(entry.url)
  const scale = useNormalizedScale(scene, obj)
  return (
    <primitive
      object={scene}
      position={obj.position}
      rotation={obj.rotation ?? [0, 0, 0]}
      scale={scale}
    />
  )
}

const CHART_COLORS = ['#4d7cff', '#ff4d8d', '#ffb703', '#3ddc84', '#b388ff', '#26c6da']

function ChartObject({ obj }) {
  const max = Math.max(...obj.data.map((d) => d.value), 1)
  const barH = (v) => (v / max) * 2.6
  return (
    <group position={obj.position} scale={obj.scale ?? [1, 1, 1]}>
      {obj.data.map((d, i) => {
        const h = barH(d.value)
        const x = (i - (obj.data.length - 1) / 2) * 1.15
        const color = obj.color ?? CHART_COLORS[i % CHART_COLORS.length]
        return (
          <group key={i} position={[x, 0, 0]}>
            <mesh position={[0, h / 2 + 0.04, 0]}>
              <boxGeometry args={[0.8, h, 0.8]} />
              <meshStandardMaterial
                color={color}
                metalness={0.15}
                roughness={0.4}
                emissive={color}
                emissiveIntensity={0.18}
              />
            </mesh>
            <Text
              position={[0, -0.34, 0]}
              fontSize={0.28}
              color="#ffffff"
              anchorX="center"
              anchorY="top"
              maxWidth={1.6}
              font={fontUrl}
            >
              {d.label}
            </Text>
          </group>
        )
      })}
      {obj.title && (
        <Text
          position={[0, 3.15, 0]}
          fontSize={0.45}
          color="#ffffff"
          anchorX="center"
          anchorY="bottom"
          font={fontUrl}
        >
          {obj.title}
        </Text>
      )}
      <mesh
        position={[0, 0, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[(obj.data.length - 1) * 1.15 + 1.3, 2.4, 1]}
      >
        <planeGeometry />
        <meshStandardMaterial color="#0d1424" metalness={0.3} roughness={0.8} />
      </mesh>
    </group>
  )
}

function ImageObject({ obj }) {
  const texture = useTexture(imageUrl(obj.prompt))
  return (
    <mesh
      position={obj.position ?? [0, 1.6, -7]}
      rotation={obj.rotation ?? [0, 0, 0]}
      scale={obj.scale ?? [14, 7.875, 1]}
    >
      <planeGeometry />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={obj.opacity ?? 0.85}
        toneMapped={false}
      />
    </mesh>
  )
}

// Pollinations URL for an image prompt (shared by rendering and preloading).
export function imageUrl(prompt) {
  return (
    'https://image.pollinations.ai/prompt/' +
    encodeURIComponent(prompt) +
    '?width=1280&height=720&nologo=true'
  )
}

// Phase 4: warm the caches for GLBs and images in a freshly generated sub-deck,
// so the camera fly to a spliced slide never waits on network loads.
export function preloadAssets(deck) {
  for (const slide of deck.slides) {
    for (const obj of slide.objects) {
      if (obj.type === 'glb') {
        const entry = CATALOG_BY_ID[obj.assetId]
        if (entry) useGLTF.preload(entry.url)
      } else if (obj.type === 'image') {
        useTexture.preload(imageUrl(obj.prompt))
      }
    }
  }
}

function SlideObject({ obj, index }) {
  let child
  switch (obj.type) {
    case 'text':
      child = <TextObject obj={obj} />
      break
    case 'primitive':
      child = <PrimitiveObject obj={obj} />
      break
    case 'glb':
      child = (
        <LoadBoundary>
          <Suspense fallback={null}>
            <GlbObject obj={obj} />
          </Suspense>
        </LoadBoundary>
      )
      break
    case 'chart':
      child = <ChartObject obj={obj} />
      break
    case 'image':
      child = (
        <LoadBoundary>
          <Suspense fallback={null}>
            <ImageObject obj={obj} />
          </Suspense>
        </LoadBoundary>
      )
      break
    default:
      return null
  }
  // ~80ms stagger between objects when the slide activates.
  return <Entrance delay={index * 0.08}>{child}</Entrance>
}

function Slide({ slide }) {
  return (
    <group>
      {slide.objects.map((obj, i) => (
        <SlideObject key={i} obj={obj} index={i} />
      ))}
    </group>
  )
}

function WebGLFallback() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        color: 'rgba(255,255,255,0.85)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        textAlign: 'center',
        padding: 24,
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 700 }}>3D rendering unavailable</div>
      <div style={{ fontSize: 14, opacity: 0.7, maxWidth: 480 }}>
        Your browser blocked WebGL, which the 3D scene needs. Enable hardware
        acceleration (Chrome → Settings → System) or try Safari / Chrome, then
        reload.
      </div>
    </div>
  )
}

// --- Scene -----------------------------------------------------------------------
export default function Scene({ slide }) {
  const webglOK = (() => {
    try {
      const c = document.createElement('canvas')
      return !!(c.getContext('webgl2') || c.getContext('webgl'))
    } catch {
      return false
    }
  })()

  if (!webglOK) return <WebGLFallback />

  // freeLook: OrbitControls own the camera; transitions lock them and the rig flies.
  const [freeLook, setFreeLook] = useState(false)
  const controlsRef = useRef()
  const slideRef = useRef(slide)

  useEffect(() => {
    if (slideRef.current !== slide) {
      slideRef.current = slide
      setFreeLook(false) // lock controls; CameraRig takes over from live pose
    }
  }, [slide])

  useEffect(() => {
    controlsAPI.zoomIn = () => controlsRef.current?.zoomIn(0.6)
    controlsAPI.zoomOut = () => controlsRef.current?.zoomOut(0.6)
  }, [])

  const handleSettled = useCallback(() => setFreeLook(true), [])

  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true }}
      camera={{ position: [0, 2.6, 9.5], fov: 50 }}
      fallback={<WebGLFallback />}
    >
      <color attach="background" args={['#070b18']} />
      <fog attach="fog" args={['#0b1122', 14, 40]} />

      {/* Background depth: tinted nebula + starfield + sparkles */}
      <NebulaBackground />
      <Stars radius={60} depth={40} count={2000} factor={3} saturation={0} fade speed={0.6} />
      <Sparkles count={120} scale={[14, 7, 14]} size={2.5} speed={0.35} opacity={0.55} color="#8ab4ff" />

      {/* Lights + IBL reflections (Environment fails gracefully offline) */}
      <ambientLight intensity={0.2} />
      <directionalLight position={[4, 8, 5]} intensity={0.7} />
      <pointLight position={[-6, 3, -4]} intensity={35} decay={1.5} color="#4d7cff" />
      <pointLight position={[6, 2, 4]} intensity={28} decay={1.5} color="#ff4d8d" />
      <LoadBoundary>
        <Suspense fallback={null}>
          <Environment preset="night" />
        </Suspense>
      </LoadBoundary>

      <CameraRig
        camera={slide.camera}
        transition={slide.transition}
        active={!freeLook}
        onSettled={handleSettled}
      />

      {/* Free look: orbit + zoom between transitions. Zoom clamps keep the
          camera out of objects and in the scene. */}
      <OrbitControls
        ref={controlsRef}
        enabled={freeLook}
        enablePan={false}
        enableRotate
        enableZoom
        minDistance={2.5}
        maxDistance={50}
        minPolarAngle={0.08}
        maxPolarAngle={Math.PI / 2.05}
        target={slide.camera.lookAt}
        enableDamping
        dampingFactor={0.08}
        makeDefault
      />

      <Slide slide={slide} />

      {/* Cinematic post — composer failures fall back to the plain scene */}
      <LoadBoundary>
        <Suspense fallback={null}>
          <EffectComposer multisampling={4}>
            <Bloom
              mipmapBlur
              intensity={0.85}
              luminanceThreshold={0.85}
              luminanceSmoothing={0.3}
              radius={0.75}
            />
            <Vignette offset={0.28} darkness={0.8} />
            <Noise premultiply opacity={0.035} />
          </EffectComposer>
        </Suspense>
      </LoadBoundary>
    </Canvas>
  )
}
