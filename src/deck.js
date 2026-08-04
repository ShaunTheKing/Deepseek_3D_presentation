// Fallback deck — renders without an API key and demonstrates every schema feature.
// The LLM-generated decks (src/generator.js) follow the exact same shape.
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
      title: 'Beyond the Planets',
      notes: 'Robotic explorers and the distant belt of ice and rock.',
      camera: { position: [0, 3.2, 9], lookAt: [0, 0.2, 0], fov: 50 },
      objects: [
        { type: 'text', content: 'Explorers & the Frontier', position: [0, 2.6, 0], fontSize: 0.95, color: '#ffffff', billboard: true },
        { type: 'primitive', shape: 'box', position: [0, 0.9, 0], rotation: [0.3, 0.5, 0.1], scale: [1, 1.6, 1], color: '#9db4c0', metalness: 0.7, roughness: 0.25 },
        { type: 'primitive', shape: 'sphere', position: [2.6, 0.6, 0.8], scale: [0.5, 0.5, 0.5], color: '#7a8b99', roughness: 0.9 },
        { type: 'primitive', shape: 'sphere', position: [-2.7, 0.4, -0.6], scale: [0.4, 0.4, 0.4], color: '#8d99a6', roughness: 0.9 },
        { type: 'primitive', shape: 'plane', position: [0, -0.3, 0], rotation: [-Math.PI / 2, 0, 0], scale: [12, 8, 1], color: '#0b101c', metalness: 0.4, roughness: 0.8 },
      ],
      transition: 'fade',
    },
  ],
}
