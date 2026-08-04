// Fallback deck — renders without an API key and demonstrates every schema
// feature: text, primitives, glb catalog assets, 3D charts, AI image
// backgrounds, all three transitions, and notes for narration.
export const DECK = {
  title: 'The Solar System',
  slides: [
    {
      title: 'Our Solar System',
      notes: 'Welcome to a cinematic 3D tour of our solar system.',
      camera: { position: [0, 2.6, 9.5], lookAt: [0, 0.6, 0], fov: 50 },
      objects: [
        { type: 'text', content: 'The Solar System', position: [0, 2.6, 0], fontSize: 1.1, color: '#ffffff', billboard: true },
        { type: 'primitive', shape: 'sphere', position: [0, 0.6, 0], scale: [1.6, 1.6, 1.6], color: '#ffb703', emissive: '#ff8800', metalness: 0.1, roughness: 0.4 },
        { type: 'primitive', shape: 'plane', position: [0, -0.9, 0], rotation: [-Math.PI / 2, 0, 0], scale: [14, 9, 1], color: '#0d1424', metalness: 0.4, roughness: 0.8 },
      ],
      transition: 'fly',
    },
    {
      title: 'Inner Planets',
      notes: 'Four rocky worlds orbit close to the Sun.',
      camera: { position: [0, 2.4, 7.5], lookAt: [0, 0.5, 0], fov: 50 },
      objects: [
        { type: 'text', content: 'Inner Planets', position: [0, 2.4, 0], fontSize: 1, color: '#ffffff', billboard: true },
        { type: 'primitive', shape: 'sphere', position: [-3.2, 0.5, 0], scale: [0.5, 0.5, 0.5], color: '#b08968', roughness: 0.9 },
        { type: 'primitive', shape: 'sphere', position: [-1.2, 0.5, 0], scale: [0.7, 0.7, 0.7], color: '#f4d58d', roughness: 0.8 },
        { type: 'primitive', shape: 'sphere', position: [1.1, 0.5, 0], scale: [0.75, 0.75, 0.75], color: '#5e9bdb', roughness: 0.6 },
        { type: 'primitive', shape: 'sphere', position: [3.1, 0.5, 0], scale: [0.55, 0.55, 0.55], color: '#d16d5a', roughness: 0.85 },
      ],
      transition: 'orbit',
    },
    {
      title: 'Gas Giants',
      notes: 'Jupiter and Saturn, the giants with rings.',
      camera: { position: [-1.5, 2.2, 8.5], lookAt: [0.6, 0.6, 0], fov: 50 },
      objects: [
        { type: 'text', content: 'Gas Giants', position: [-1.2, 2.6, 0], fontSize: 1, color: '#ffffff', billboard: true },
        { type: 'primitive', shape: 'sphere', position: [1.8, 0.6, 0], scale: [1.4, 1.4, 1.4], color: '#e0b06b', roughness: 0.6 },
        { type: 'primitive', shape: 'torus', position: [1.8, 0.6, 0], rotation: [Math.PI / 2.4, 0, 0.4], scale: [1.4, 1.4, 1], color: '#c8b08a', metalness: 0.3, roughness: 0.7 },
        { type: 'primitive', shape: 'sphere', position: [-2.3, 0.5, 0], scale: [1.05, 1.05, 1.05], color: '#c4906a', roughness: 0.7 },
      ],
      transition: 'fly',
    },
    {
      title: 'Planets by Size',
      notes: 'Jupiter is over eleven times wider than Earth. This chart shows the planets in Earth diameters.',
      camera: { position: [0, 2.4, 8.2], lookAt: [0, 1.1, 0], fov: 50 },
      objects: [
        { type: 'image', prompt: 'deep space nebula, purple and blue, cinematic', position: [0, 1.8, -8], scale: [16, 9, 1], opacity: 0.45 },
        { type: 'text', content: 'Planets by Size', position: [0, 3.4, 0], fontSize: 0.85, color: '#ffffff', billboard: true },
        {
          type: 'chart',
          data: [
            { label: 'Mercury', value: 0.38 },
            { label: 'Mars', value: 0.53 },
            { label: 'Venus', value: 0.95 },
            { label: 'Earth', value: 1 },
            { label: 'Neptune', value: 3.88 },
            { label: 'Uranus', value: 4 },
            { label: 'Saturn', value: 9.45 },
            { label: 'Jupiter', value: 11.21 },
          ],
          position: [0, 0.3, 0],
          scale: [1.02, 1.02, 1.02],
        },
      ],
      transition: 'fade',
    },
    {
      title: 'Into the Unknown',
      notes: 'Robotic explorers have visited every planet in the solar system, and some have already left it far behind.',
      camera: { position: [-1.2, 2.4, 8.5], lookAt: [0.4, 0.9, 0], fov: 50 },
      objects: [
        { type: 'image', prompt: 'alien planet horizon, foggy, cinematic', position: [0, 1.8, -8], scale: [16, 9, 1], opacity: 0.5 },
        { type: 'text', content: 'Into the Unknown', position: [-2.4, 2.3, 0], fontSize: 0.9, color: '#ffffff', billboard: true },
        { type: 'glb', assetId: 'sci-fi-helmet', position: [2.3, 0.8, 0], scale: 1.15 },
        { type: 'primitive', shape: 'plane', position: [0, -0.2, 0], rotation: [-Math.PI / 2, 0, 0], scale: [12, 8, 1], color: '#0b101c', metalness: 0.4, roughness: 0.8 },
      ],
      transition: 'fade',
    },
  ],
}
