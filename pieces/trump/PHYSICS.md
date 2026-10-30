# Bowling physics revision

Dimensions use metres: 18.288 m foul line to headpin, 1.0541 m width, 0.3048 m equilateral rack spacing, 0.381 m pin height, 0.1210564 m pin belly width, 0.108 m ball radius. Pin mass 1.588 kg; ball 6.8 kg. Profilo meshes retain the original GLB scale and proportions (no normalization). Lane dimensions, ball size and rack spacing remain standard independently of the sculpture. Collision profile width, height and center of mass follow the model bounds; the compound profile is an approximation of the sculpture's surface.

Cannon-es 0.20.0 is vendored with its MIT license. Real contact impulses, gravity, tilt and sleeping replace the former proximity-triggered domino logic. Integration is fixed at 240 Hz. Spin/oil response is a deliberately simplified game model, not a measured oil pattern or a reproduction of Nintendo's proprietary physics. Power sets launch speed from 2.5 to 9 m/s. No random misses or forced strikes. Starting position, angle and spin are independent. The aim guide stops at the arrows.

References consulted:
- Nintendo Wii Sports official manual (moving versus aiming, release timing, spin): https://csassets.nintendo.com/noaext/image/private/t_KA_PDF/Wii_Wii_Sports?_a=DATAg1AAZAA0
- USBC Equipment Specifications manual, pages 20, 31–32, 38: https://bowl.com/getmedia/08ef148d-c0e4-4e00-9e0d-855ba4729ad5/equipment-specs-manual.pdf
- Reference source, contact materials and Cannon architecture: https://github.com/lettier/webglbowling/blob/master/source/assets/scripts/js/index.js (consulted only; no source copied; its greater-than-one restitution values are not used).
- Cannon-es source: https://github.com/pmndrs/cannon-es

Performance: the bowling scene uses a dedicated ~24,000-triangle copy of the sculpture, retaining its native transforms and textures. The original 160,189-triangle asset remains untouched. Shadows update only when objects move; pixel ratio is capped at 1.5. Physics catch-up is capped at four substeps per display frame to prevent long frames from creating a feedback loop of extra work. Collision profiles and the 240 Hz fixed step are retained.
