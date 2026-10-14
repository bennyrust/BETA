from PIL import Image,ImageDraw,ImageFilter
from pathlib import Path
import numpy as np,json,math
p=Path('/private/tmp/tv-dinner-poc');o=p/'site/assets'
# Rectify an unoccupied tray graphic from the front camera. Its hidden/cropped edge is inferred.
a=Image.open(p/'Front view_0.jpg');src=np.array([[641,464],[925,378],[1293,431],[977,554]],float);dst=np.array([[0,0],[0,511],[511,511],[511,0]],float)
A=[];B=[]
for (x,y),(u,v) in zip(dst,src):A.extend([[x,y,1,0,0,0,-u*x,-u*y],[0,0,0,x,y,1,-v*x,-v*y]]);B.extend([u,v])
h=np.linalg.solve(A,B);poster=a.transform((512,512),Image.Transform.PERSPECTIVE,h,Image.Resampling.BICUBIC)
top=Image.open(p/'Top view_0.jpg').crop((260,55,938,695)).resize((768,768));top.paste(poster.resize((658,574)),(55,65));top.save(o/'tray-top.jpg',quality=90)
a.crop((530,512,920,604)).resize((768,160)).save(o/'tray-edge.jpg',quality=88)
Image.open(p/'Top view_0.jpg').crop((945,100,1245,620)).resize((512,512)).save(o/'concrete.jpg',quality=88)
Image.open(p/'Rear view_0.jpg').crop((820,206,970,327)).resize((256,192)).save(o/'screen.jpg',quality=88)
# Sampled material swatches; keep them small to avoid needless GPU texture memory.
a=Image.open(p/'site/evidence/profile/000.jpg');a.crop((560,144,630,192)).resize((128,128)).save(o/'shirt.jpg',quality=86);a.crop((600,330,715,365)).resize((128,128)).save(o/'skin.jpg',quality=86)
# Profile image joints -> an explicitly inferred sagittal-plane body, with manually assigned lateral separation.
j=json.loads((p/'site/evidence/pose-profile.json').read_text()); frames=[]
def to3(pt,x):u,v=pt[0]*1280,pt[1]*720;return [x,(615-v)/460,(u-720)/460]
mapj={'hipL':('left_upLeg_joint',.14),'kneeL':('left_leg_joint',.18),'ankleL':('left_foot_joint',.18),'shoulderL':('left_shoulder_1_joint',.17),'elbowL':('left_forearm_joint',.21),'wristL':('left_hand_joint',.21),'shoulderR':('right_shoulder_1_joint',-.17),'elbowR':('right_forearm_joint',-.18),'wristR':('right_hand_joint',-.16),'neck':('neck_1_joint',0),'nose':('head_joint',0),'ear':('left_ear_joint',0)}
for i,(f,people) in enumerate(sorted(j.items())):
 pts=people[0];joints={key:to3(pts[name],x) for key,(name,x) in mapj.items()};joints['hipL']=[.14,.56,0];joints['hipR']=[-.14,.56,0];joints['kneeL']=[.20,.54,-.42];joints['kneeR']=[-.20,.54,-.42];joints['ankleL']=[.20,.13,-.38];joints['ankleR']=[-.20,.13,-.38];frames.append({'time':i*.25,'joints':joints})
# Smooth detector jitter with a short symmetric kernel; never extrapolate a full-sequence timeline.
for key in mapj:
 arr=np.array([f['joints'][key] for f in frames]); smooth=np.stack([np.convolve(np.pad(arr[:,c],(1,1),mode='edge'),[.25,.5,.25],mode='valid') for c in range(3)],1)
 for f,v in zip(frames,smooth):f['joints'][key]=[round(float(x),5) for x in v]
# Cup measured manually in the profile image at 1 s intervals, bottom and top center; lateral position checked in overhead.
cups=[[385,286,398,207],[383,273,410,203],[386,268,419,206],[390,270,423,209],[391,280,416,220],[402,315,412,252],[417,338,420,272],[416,338,420,273],[416,338,420,273]]
for f in frames:
 t=f['time'];a0=min(7,int(t));mix=t-a0;vals=np.array(cups[a0])*(1-mix)+np.array(cups[a0+1])*mix
 f['cupBottom']=to3([vals[0]/1280,vals[1]/720],-.15);f['cupTop']=to3([vals[2]/1280,vals[3]/720],-.15)
(o/'motion.json').write_text(json.dumps({'method':'Apple Vision 2D profile joints, smoothed; manually inferred depth and fixed occluded lower body; manual cup keyframes. NOT triangulated motion capture.','duration':8,'fps':4,'frames':frames},indent=2))
(o/'scene.json').write_text(json.dumps({'units':'meters','room':{'width':5.55625,'depth':6.7437,'height':3.25,'heightStatus':'inferred from photographs'},'segment':{'editStart':180,'duration':8,'offsets':{'front':440.90,'profile':450.97,'rear':192.42,'top':-6.95},'accuracy':'local audio envelope correlation plus visual checks; not frame-genlocked'},'cameras':{'front':{'position':[1.5,1.32,-1.4],'target':[0,.65,-.30],'fov':35},'profile':{'position':[5,1.24,-.25],'target':[0,.55,-.25],'fov':17.8},'rear':{'position':[-.33,1.70,2.8],'target':[0,1.10,-1.3],'fov':29},'top':{'position':[0,2.80,-.70],'target':[0,0,-.70],'fov':32,'up':[0,0,-1]}},'cameraStatus':'Manually estimated, uncalibrated intrinsics/extrinsics. Camera matching is diagnostic, not a validated photogrammetric solve.'},indent=2))
