import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Billboard, Sparkles, Stars, Text } from '@react-three/drei'
import * as THREE from 'three'

// --- Camera rig: cinematically flies (or orbits / fades) between slides ----------
function CameraRig({ camera, transition }) {
  const { camera: cam } = useThree()
  const key = JSON.stringify(camera)
  const state = useRef(null)
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

  useEffect(() => {
    const s = state.current
    if (s.first) {
      // Snap to the first slide instead of flying in from the origin.
      cam.position.copy(target.pos)
      cam.lookAt(target.look)
      cam.fov = target.fov
      cam.updateProjectionMatrix()
      s.first = false
    } else {
      s.orbit = transition === 'orbit' ? 1 : 0
    }
  }, [key, target, transition, cam])

  useFrame((_, dt) => {
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
  })

  return null
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
    >
      {obj.content}
    </Text>
  )
  return obj.billboard ? <Billboard>{text}</Billboard> : text
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
      <meshStandardMaterial
        color={obj.color}
        metalness={obj.metalness ?? 0.2}
        roughness={obj.roughness ?? 0.5}
        emissive={obj.emissive ?? '#000000'}
        emissiveIntensity={obj.emissive ? 0.6 : 0}
      />
    </mesh>
  )
}

function Slide({ slide }) {
  return (
    <group>
      {slide.objects.map((obj, i) =>
        obj.type === 'text' ? (
          <TextObject key={i} obj={obj} />
        ) : (
          <PrimitiveObject key={i} obj={obj} />
        ),
      )}
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

  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true }}
      camera={{ position: [0, 2.6, 9.5], fov: 50 }}
      fallback={<WebGLFallback />}
    >
      <color attach="background" args={['#05060a']} />
      <fog attach="fog" args={['#05060a', 14, 42]} />

      {/* Lights + glow */}
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 8, 5]} intensity={1.2} />
      <pointLight position={[-6, 3, -4]} intensity={40} decay={1.5} color="#4d7cff" />
      <pointLight position={[6, 2, 4]} intensity={30} decay={1.5} color="#ff4d8d" />

      {/* Ambience: starfield + sparkles */}
      <Stars radius={60} depth={40} count={2000} factor={3} saturation={0} fade speed={0.6} />
      <Sparkles count={120} scale={[14, 7, 14]} size={2.5} speed={0.35} opacity={0.55} color="#8ab4ff" />

      <CameraRig camera={slide.camera} transition={slide.transition} />
      <Slide slide={slide} />
    </Canvas>
  )
}
