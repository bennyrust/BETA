// Absolute preview rotations in Three.js coordinates (Y is vertical).
// These do not change the installation's room transforms.
export const previewOrientations = {
'Ontology vape': [0, 0, -Math.PI / 2],
'Monarchism vape': [0, 0, -Math.PI / 2],
'Colonialism vape': [0, 0, -Math.PI / 2],
'Fascists vape': [0, 0, -Math.PI / 2],
'Orientalism vape': [0, 0, -Math.PI / 2],
'Hauntology vape': [0, 0, -Math.PI / 2],
'Neoliberalism vape': [0, 0, -Math.PI / 2],
'Post-Modernism vape': [0, 0, -Math.PI / 2],
'Anti-Racism vape': [0, 0, -Math.PI / 2],
'Liberation vape': [0, 0, -Math.PI / 2],
'American Empire vape': [0, 0, -Math.PI / 2],
'Bourgeoisie vape': [0, 0, -Math.PI / 2],

  'Cheese': [Math.PI / 4, 0, 0],
  'Nyan Cat': [Math.PI / 2, 0, 0],
  'Cabinet': [0, 0, 0],
  'Coke': [0, 0, 0],
  'Can tower': [0, 0, 0],
  // Shelf figurines: turn their authored profile poses toward the viewer.
  'Crooks': [0, -Math.PI / 3, 0],
  'Rittenhouse': [0, -Math.PI / 6, 0],
  'Luigi': [0, -Math.PI / 2, 0],
  // Shallow tins: tilt enough to show the lid as well as the side label.
  'Fortnite': [Math.PI / 6, 0, 0],
  '3Dprinter': [0, 0, 0],
  // Authored pose exposes the screen; remove the room's diagonal placement.
  'Laptop': [0, 0, 0],
  'MTG': [Math.PI / 6, Math.PI, 0],
  'Print': [0, 0, 0],
  'Tetsuya': [0, -Math.PI / 6, 0],
  'Tissues': [0, 0, 0],
  // Room yaw is +90°; add a 180° turn about vertical Y to face the bowl forward.
  'Toilet': [0, 3 * Math.PI / 2, 0],
  'Trashcan': [0, 0, 0],
  // Upright authored form; discard both room X/Z rotations.
  'Trump': [0, 0, 0],
  // Left-wall +90° yaw is undone; its front now points toward preview +Z.
  'Window': [0, 0, 0],
  // Scanned faceplates lie flat and have in-plane roll; stand and level them.
  'Gold TV': [Math.PI / 2, Math.PI / 4, 0],
  'GTA with Stand': [Math.PI / 2, -Math.PI / 10, 0],
  'GTA TV (no stand)': [Math.PI / 2, -Math.PI / 10, 0],
  'White TV': [Math.PI / 2, 0, 0],
  'Side Table': [0, 0, 0],
  'Gun': [0, Math.PI / 2, Math.PI / 2],
  // All wall graphics face the viewer, independent of their wall's normal.
  'American Spirit': [0, 0, 0],
  'JD': [0, 0, 0],
  'Trotsky': [0, 0, 0],
};
