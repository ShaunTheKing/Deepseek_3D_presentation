// Curated GLB catalog (Phase 3). The AI only ever picks an assetId — it never
// invents URLs. Models are CC0 / CC BY 4.0 from Khronos glTF-Sample-Assets,
// served via jsDelivr. See README "3D model credits" for full attributions.

export const GLB_CATALOG = [
  { assetId: 'avocado', name: 'Avocado', tags: ['food', 'nature', 'fruit'], url: 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@main/Models/Avocado/glTF-Binary/Avocado.glb', license: 'CC0', attribution: 'Microsoft' },
  { assetId: 'antique-camera', name: 'Antique Camera', tags: ['camera', 'vintage', 'photography'], url: 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@main/Models/AntiqueCamera/glTF-Binary/AntiqueCamera.glb', license: 'CC0', attribution: 'Maximillan Kamps (UX3D)' },
  { assetId: 'lantern', name: 'Lantern', tags: ['street', 'light', 'vintage', 'lamp'], url: 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@main/Models/Lantern/glTF-Binary/Lantern.glb', license: 'CC0', attribution: 'sbtron; Frank Galligan (Draco)' },
  { assetId: 'water-bottle', name: 'Water Bottle', tags: ['bottle', 'drink', 'object'], url: 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@main/Models/WaterBottle/glTF-Binary/WaterBottle.glb', license: 'CC0', attribution: 'Microsoft' },
  { assetId: 'toy-car', name: 'Toy Car', tags: ['car', 'vehicle', 'toy'], url: 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@main/Models/ToyCar/glTF-Binary/ToyCar.glb', license: 'CC0', attribution: 'Guido Odendahl; Eric Chadwick' },
  { assetId: 'boom-box', name: 'Boom Box', tags: ['music', 'retro', 'electronics', 'radio'], url: 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@main/Models/BoomBox/glTF-Binary/BoomBox.glb', license: 'CC0', attribution: 'Microsoft' },
  { assetId: 'flight-helmet', name: 'Flight Helmet', tags: ['helmet', 'aviation', 'pilot', 'military'], url: 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@main/Models/FlightHelmet/glTF/FlightHelmet.gltf', license: 'CC0', attribution: 'Gary Hsu' },
  { assetId: 'barramundi-fish', name: 'Barramundi Fish', tags: ['fish', 'animal', 'ocean', 'aquatic'], url: 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@main/Models/BarramundiFish/glTF-Binary/BarramundiFish.glb', license: 'CC0', attribution: 'Microsoft' },
  { assetId: 'corset', name: 'Corset', tags: ['fashion', 'clothing', 'mannequin'], url: 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@main/Models/Corset/glTF-Binary/Corset.glb', license: 'CC0', attribution: 'Microsoft (UX3D)' },
  { assetId: 'sci-fi-helmet', name: 'Sci-Fi Helmet', tags: ['helmet', 'sci-fi', 'space', 'armor'], url: 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@main/Models/SciFiHelmet/glTF/SciFiHelmet.gltf', license: 'CC0', attribution: 'Michael Pavlovic; Norbert Nopper' },
  { assetId: 'animated-morph-cube', name: 'Animated Morph Cube', tags: ['abstract', 'shape', 'animation', 'cube'], url: 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@main/Models/AnimatedMorphCube/glTF-Binary/AnimatedMorphCube.glb', license: 'CC0', attribution: 'Microsoft' },
  { assetId: 'sheen-chair', name: 'Sheen Chair', tags: ['furniture', 'chair', 'room', 'interior'], url: 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@main/Models/SheenChair/glTF-Binary/SheenChair.glb', license: 'CC0', attribution: 'Eric Chadwick (Wayfair)' },
  { assetId: 'metal-rough-spheres', name: 'Metal-Rough Spheres', tags: ['material', 'spheres', 'abstract', 'pbr'], url: 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@main/Models/MetalRoughSpheres/glTF-Binary/MetalRoughSpheres.glb', license: 'CC BY 4.0', attribution: 'Ed Mackey (Analytical Graphics)' },
  { assetId: 'fox', name: 'Fox', tags: ['animal', 'wildlife', 'fox'], url: 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@main/Models/Fox/glTF-Binary/Fox.glb', license: 'CC BY 4.0', attribution: 'PixelMannen (model); tomkranis (rigging)' },
  { assetId: 'box', name: 'Box', tags: ['shape', 'cargo', 'simple', 'cube'], url: 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@main/Models/Box/glTF-Binary/Box.glb', license: 'CC BY 4.0', attribution: 'Cesium' },
  { assetId: 'damaged-helmet', name: 'Damaged Helmet', tags: ['helmet', 'damaged', 'battle', 'armor'], url: 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@main/Models/DamagedHelmet/glTF-Binary/DamagedHelmet.glb', license: 'CC BY 4.0', attribution: 'ctxwing' },
  { assetId: 'glam-velvet-sofa', name: 'Glam Velvet Sofa', tags: ['furniture', 'sofa', 'room', 'interior'], url: 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@main/Models/GlamVelvetSofa/glTF-Binary/GlamVelvetSofa.glb', license: 'CC BY 4.0', attribution: 'Eric Chadwick (Wayfair)' },
]

export const CATALOG_IDS = new Set(GLB_CATALOG.map((m) => m.assetId))

export const CATALOG_BY_ID = Object.fromEntries(GLB_CATALOG.map((m) => [m.assetId, m]))
