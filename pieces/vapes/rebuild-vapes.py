import bpy,bmesh,numpy as np,math,json,hashlib
from pathlib import Path
from mathutils import Matrix,Vector
ROOT=Path(__file__).resolve().parent
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False);bpy.ops.import_scene.gltf(filepath=str(ROOT/'Breeze good.glb'))
o=next(o for o in bpy.context.scene.objects if o.type=='MESH');a=np.array([tuple(o.matrix_world@v.co) for v in o.data.vertices]);mid=(a.min(0)+a.max(0))/2;print('BOUNDS',a.min(0),a.max(0),'TRANSFORM',o.matrix_world)
cov=np.cov(a[:,:2].T);val,vec=np.linalg.eigh(cov);axis=vec[:,np.argmax(val)];angle=math.atan2(axis[1],axis[0]);print('ANGLE',angle)
scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE';scene.render.resolution_x=700;scene.render.resolution_y=700;scene.render.resolution_percentage=100;scene.world.color=(.3,.3,.3);scene.view_settings.view_transform='Standard'
normal=Vector((math.sin(angle),-math.cos(angle),0));center=Vector(mid);bpy.ops.object.camera_add(location=center+normal*.7);cam=bpy.context.object;cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=.34;scene.camera=cam
bpy.ops.object.light_add(type='AREA',location=center+normal*.5+Vector((0,0,.4)));bpy.context.object.data.energy=10;bpy.context.object.data.size=.4

o=next(o for o in bpy.context.scene.objects if o.type=='MESH')
def signature():return hashlib.sha256(repr(([tuple(v.co) for v in o.data.vertices],[tuple(p.vertices) for p in o.data.polygons])).encode()).hexdigest()
# Moderate scan cleanup: weld export seams, then blend halfway toward a
# two-pass local smooth. Keep the scan topology and its larger irregularities.
bm=bmesh.new();bm.from_mesh(o.data)
bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=0.000001)
original_positions={v:v.co.copy() for v in bm.verts}
for _ in range(2):
 bmesh.ops.smooth_vert(bm,verts=[v for v in bm.verts if not v.is_boundary],factor=.5,use_axis_x=True,use_axis_y=True,use_axis_z=True)
for v,co in original_positions.items():v.co=co.lerp(v.co,.5)
# Cut actual edges at the printed label boundary rather than selecting whole
# triangles across it. This removes the saw-tooth border without a flat decal.
for axis,value in [(0,-.025),(0,.022),(2,.018),(2,.234)]:
 point=Vector((0,0,0));point[axis]=value;normal=Vector((0,0,0));normal[axis]=1
 bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=0.0000001,plane_co=point,plane_no=normal,clear_inner=False,clear_outer=False)
bmesh.ops.triangulate(bm,faces=list(bm.faces))
bm.normal_update();bm.to_mesh(o.data);bm.free();o.data.update()
before=signature();original=o.data.uv_layers.active.name;mat=o.data.materials[0];node=mat.node_tree.nodes.new('ShaderNodeUVMap');node.uv_map=original
for n in mat.node_tree.nodes:
 if n.type=='TEX_IMAGE':mat.node_tree.links.new(node.outputs['UV'],n.inputs['Vector'])
uv=o.data.uv_layers.new(name='Flavor print');uv.active_render=True;o.data.uv_layers.active=uv
label=bpy.data.materials.new('Flavor label');label.use_nodes=True;bs=label.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.85;bs.inputs['Specular'].default_value=.2;tex=label.node_tree.nodes.new('ShaderNodeTexImage');tex.extension='EXTEND';label.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color']);o.data.materials.append(label)
for p in o.data.polygons:
 p.material_index=1 if abs(p.normal.y)>.2 and -.025<p.center.x<.022 and .018<p.center.z<.234 else 0
 for li in p.loop_indices:
  co=o.data.vertices[o.data.loops[li].vertex_index].co;uv.data[li].uv=((co.z-.018)/.216,.5+(1 if p.normal.y>0 else -1)*(co.x+.0015)/.047)
source=bpy.data.images.load(str(ROOT/'woke breezes 2.png'));pixels=np.array(source.pixels[:],dtype=np.float32).reshape(1280,1280,4)
# Object transform sets the same room size and front direction; cleaned mesh coordinates remain consistent across flavors.
center=Vector((-.001627,.004443,.146721));o.matrix_world=Matrix.Scale(.12/.27680686,4)@Matrix.Rotation(math.pi,4,'Z')@Matrix.Translation(-center)
scene=bpy.context.scene;cam=scene.camera;cam.location=(0,-.25,0);cam.rotation_euler=(-cam.location).to_track_quat('-Z','Y').to_euler();cam.rotation_euler.rotate_axis('Z',math.pi/2);cam.data.ortho_scale=.15;scene.render.resolution_x=900;scene.render.resolution_y=450
for light in [x for x in scene.objects if x.type=='LIGHT']:light.location=(.08,-.2,.12);light.data.energy=2;light.data.size=.2
names=['Ontology','Monarchism','Colonialism','Fascists','Orientalism','Hauntology','Neoliberalism','Post-Modernism','Anti-Racism','Liberation','American Empire','Bourgeoisie']
for i,name in enumerate(names):
 x=80+(i%2)*614;y=88+round((i//2)*205.2);crop=pixels[1280-y-83:1280-y,x:x+437].copy();im=bpy.data.images.new(name+' artwork',width=437,height=83);im.pixels.foreach_set(crop.ravel());im.pack();tex.image=im;o.name=name+' vape'
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.export_scene.gltf(filepath=str(ROOT/(name+' vape.glb')),export_format='GLB',use_selection=True)
 if i==0:scene.render.filepath='/tmp/good-flavor.png';bpy.ops.render.render(write_still=True)
assert signature()==before,'Geometry changed'
print('VERIFIED shared cleaned scan mesh:',len(o.data.vertices),'vertices',len(o.data.polygons),'faces',before)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'Vapes.blend'))
p=ROOT/'files.json';entries=json.loads(p.read_text())
for e in entries:
 f=ROOT/e['file']
 if f.exists():e['size']=f.stat().st_size
if not any(e['file']=='Breeze good.glb' for e in entries):entries.append(dict(name='Breeze good.glb',file='Breeze good.glb',size=(ROOT/'Breeze good.glb').stat().st_size))
p.write_text(json.dumps(entries,indent=2)+'\n')
