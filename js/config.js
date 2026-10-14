export const sceneObjects = [
    { name: 'Ontology vape', file: 'pieces/vapes/Ontology vape.glb', position: [-0.96, 0.814, 0.48], rotation: [-1.570796, 0, 0], scale: 1 },
    { name: 'American Empire vape', file: 'pieces/vapes/American Empire vape.glb', position: [-0.72, 0.622, -0.12], rotation: [-1.570796, 0, 0.8], scale: 1 },
    { name: 'Colonialism vape', file: 'pieces/vapes/Colonialism vape.glb', position: [-0.09, 0.759, 0.19], rotation: [-1.570796, 0, 0.8], scale: 1 },
    { name: 'Fascists vape', file: 'pieces/vapes/Fascists vape.glb', position: [0.43, 0.395, -0.78], rotation: [-1.570796, 0, 1.2], scale: 1 },

    {
      name: 'Cheese',
      file: 'pieces/Autokrafts/Cheese okay-2048.glb',
      // Preserve the embedded plate's world transform on the side table.
      position: [-0.5613453099531172, 0.5922338962554932, 0.009953362208084397],
      rotation: [0, -Math.PI / 4, 0],
      scale: 0.5
    },
    {
      name: 'Cabinet',
      file: 'pieces/cabinet/shelf-light-2048.glb',
      position: [-0.8, 0, -0.8],
      rotation: [0, Math.PI/4, 0],
      scale: 1.0
    },
    {
      name: 'Can tower',
      file: 'pieces/can-tower/Coke cans-2048.glb',
      position: [0.1, 0, -0.75],
      rotation: [0, 0, 0],
      scale: 1.0
    },
    {
      name: 'Crooks',
      file: 'pieces/crooks/Crooks good-2048.glb',
      // Figure centers are spaced 0.14 units apart along the cabinet's rotated shelf.
      position: [-0.682964, 0.700865, -0.813329],
      rotation: [0, 0, 0],
      scale: 1.0
    }, 
    {
      name: 'Rittenhouse',
      file: 'pieces/rittenhouse/Kyle good-2048.glb',
      position: [-0.785527, 0.703119, -0.690078],
      rotation: [0, 0, 0],
      scale: 1.0
    },
    {
      name: 'Luigi',
      file: 'pieces/luigi/Luigi good-2048.glb',
      position: [-0.880029, 0.695678, -0.598986],
      rotation: [0, 0, 0],
      scale: 1.0
    },
    {
      name: 'Room',
      file: 'pieces/room/Floor-2048.glb',
      position: [0, 1.3, 0],
      rotation: [0, Math.PI, 0],
      scale: 1.0
    },
    {
      name: 'Fortnite',
      file: 'pieces/fortnite/Fortnite good-2048.glb',
      position: [-0.1764, 0.734, 0.178],
      rotation: [0, 0, 0],
      scale: 0.33
    },

    {
      name: '3Dprinter',
      file: 'pieces/3dprinter/Good print table-2048.glb',
      position: [1.0, -0.1, -1.0],
      rotation: [0, 0, 0],
      scale: 1.0
    },
   
    {
      name: 'Laptop',
      file: 'pieces/laptop/Laptop better-2048.glb',
      position: [0.5, -0.6, -0.5],
      rotation: [0, -Math.PI/4, 0],
      scale: 1.0
    },
    
    {
      name: 'MTG',
      file: 'pieces/mtg/Magic good-2048.glb',
      position: [-0.99, 0.857, 0.72],
      rotation: [5 * Math.PI / 12, 0.12 + 125 * Math.PI / 180, 0],
      scale: 1.2
    },
    {
      name: 'Print',
      file: 'pieces/print/Print good-2048.glb',
      position: [0.3, 0, -0.15],
      rotation: [0, -Math.PI/2, 0],
      scale: 1.0
    },
    {
      name: 'Tetsuya',
      file: 'pieces/tetsuya/Tetsuya good-2048.glb',
      position: [-0.590189, 0.69768, -0.907555],
      rotation: [0, 0, 0],
      scale: 1.0
    },
    {
      name: 'Tissues',
      file: 'pieces/tissues/Tissues good-2048.glb',
      position: [0.085, 0.675, .13],
      rotation: [0, Math.PI/32, 0],
      scale: 1.0
    },
    {
      name: 'Toilet',
      file: 'pieces/toilet/Toilet2-2048.glb',
      position: [0, -0.4, 0],
      rotation: [0, 2*Math.PI/4, 0],
      scale: 1.0
    },
    {
      name: 'Trashcan',
      file: 'pieces/trashcan/Trashcan fine-2048.glb',
      position: [-0.25, -0.6, -1.15],
      rotation: [0, 0, 0],
      scale: 1.0
    },
    {
      name: 'Trump',
      file: 'pieces/trump/Trump-2048.glb',
      position: [1.125, 1.5, 0],
      rotation: [Math.PI/2, 0, Math.PI/2],
      scale: 1.0
    },
    {
      name: 'Window',
      file: 'pieces/window/Window okay-2048.glb',
      position: [-1.0, 0.75, 0.25],
      rotation: [0, Math.PI/2, 0],
      scale: 1.0
    },
    {
      name: 'Gold TV',
      file: 'pieces/gold-tv/Gold2-2048.glb',
      position: [1.21, 0.05, 0.35],
      rotation: [0, 0, 0], // 5*Math.PI/4
      scale: 1.8
    },
    {
      name: 'GTA with Stand',
      file: 'pieces/gta-with-stand/GTA with Stand-2048.glb',
      position: [0, -0.19, -0.65],
      rotation: [0, -Math.PI/16, 0],
      scale: 1.8
    },
    {
      name: 'GTA TV (no stand)',
      file: 'pieces/gta-with-stand/GTA TV (no stand)-2048.glb',
      position: [999, 999, 999],
      rotation: [0, 0, 0],
      scale: 1.8,
      // Loaded solely as the model shown in the GTA menu; it is not part of the room.
      menuOnly: true
    },
    {
      name: 'White TV',
      file: 'pieces/white-tv/White TV-2048.glb',
      position: [0, 1.25, -1.45],
      rotation: [Math.PI/2, 0, 0],
      scale: 1.8
    },
    {
      name: 'Side Table',
      file: 'pieces/side-table/sidetable-2048.glb',
      position: [-0.55, 0, -0.1],
      rotation: [0, -Math.PI/4, 0],
      scale: 1.0
    },
    {
      name: 'Gun',
      file: 'pieces/gun/gun-2048.glb',
      position: [0.41, 0.4, -0.9],
      rotation: [3*Math.PI/2, Math.PI/2, 0],
      scale: 0.001
    },
  ];

export const selectableNames = new Set([
'Ontology vape','American Empire vape','Colonialism vape','Fascists vape',
    'Cheese',
    'Can tower',
    'Crooks',
    'Fortnite',
    '3Dprinter',
    'Rittenhouse',
    'Laptop',
    'Luigi',
    'MTG',
    'Print',
    'Tetsuya',
    'Toilet',
    'Trump',
    'Window',
    'Gold TV',
    'GTA with Stand',
    'White TV',
    'Gun',
    'American Spirit',
    'JD',
    'Trotsky',
    'Side Table'
  ]);

export const imageObjects = [
  {name: "American Spirit", file: "pieces/american-spirit/american spirit.png", position: [-1.06, 1.5, -0.225], yaw: Math.PI/2},
  {name: "JD", file: "pieces/jd/JD.png", position: [0.6, 1.5, -1.225], yaw: 0},
  {name: "Trotsky", file: "pieces/trotsky/Trotsky.png", position: [1.1, 1.5, -0.75], yaw: -Math.PI/2},
];

export const loadPriority = ["Room", "White TV", "Window"];
export const maxPixelRatio = 2;
