import * as C from './vendor/cannon-es-0.20.0.js';
// SI units. Lane and rack dimensions follow USBC specifications.
export const DIM={width:1.0541,length:18.288,deck:19.156,gutter:.23495,pinHeight:.381,pinWidth:.1210564,spacing:.3048,ballRadius:.108,pinCOM:.1468};
export class BowlingPhysics {
 constructor({pinHeight=DIM.pinHeight,pinWidth=DIM.pinWidth}={}){
  this.widthRatio=pinWidth/DIM.pinWidth;this.pinHeight=pinHeight;this.heightRatio=pinHeight/DIM.pinHeight;this.pinCOM=DIM.pinCOM*this.heightRatio;
  this.world=new C.World({gravity:new C.Vec3(0,-9.81,0),allowSleep:true});this.world.solver.iterations=20;this.world.solver.tolerance=1e-7;
  const lane=new C.Material('lane'),pin=new C.Material('pin'),ball=new C.Material('ball');this.pinMaterial=pin;this.ballMaterial=ball;
  for(const [a,b,f,r] of [[lane,pin,.24,.08],[lane,ball,.012,.04],[pin,pin,.22,.42],[ball,pin,.18,.46]])this.world.addContactMaterial(new C.ContactMaterial(a,b,{friction:f,restitution:r,contactEquationStiffness:1e7,contactEquationRelaxation:4}));
  const slab=(x,y,z,w,h,d)=>{const body=new C.Body({mass:0,material:lane,shape:new C.Box(new C.Vec3(w/2,h/2,d/2))});body.position.set(x,y,z);this.world.addBody(body);};
  slab(0,-.075,-DIM.deck/2,DIM.width,.15,DIM.deck);
  for(const side of [-1,1]){slab(side*(DIM.width+DIM.gutter)/2,-.19,-DIM.deck/2,DIM.gutter,.1,DIM.deck);slab(side*(DIM.width/2+DIM.gutter+.03),.15,-18.8,.06,.5,1.5);}
  slab(0,-.35,-20,2,.15,2);this.pins=[];this.ball=null;this.rack();
 }
 rack(){if(this.ball){this.world.removeBody(this.ball);this.ball=null;}for(const p of this.pins)this.world.removeBody(p.body);this.pins=[];
  for(let row=0,id=1;row<4;row++)for(let col=0;col<=row;col++,id++){
   const body=new C.Body({mass:1.588,material:this.pinMaterial,linearDamping:.12,angularDamping:.12,sleepSpeedLimit:.025,sleepTimeLimit:.6});
   // Compound tapered profile: flat base, belly, neck, and rounded head.
   const stations=[[0,.0258],[.019,.0359],[.057,.0496],[.1143,.0605282],[.149,.058],[.184,.047],[.219,.0314],[.254,.0228],[.3,.0266],[.343,.03235],[.365,.026],[.381,.006]];
   for(let i=1;i<stations.length;i++){const [y0,r0]=stations[i-1],[y1,r1]=stations[i];body.addShape(new C.Cylinder(r1*this.widthRatio,r0*this.widthRatio,(y1-y0)*this.heightRatio,12),new C.Vec3(0,(y0+y1)/2*this.heightRatio-this.pinCOM,0));}
   body.position.set((col-row/2)*DIM.spacing,this.pinCOM+.001,-DIM.length-row*DIM.spacing*Math.sqrt(3)/2);this.world.addBody(body);this.pins.push({id,body});
  }
  // Let all ten pins settle on the deck before accepting a shot.
  for(let i=0;i<120;i++)this.world.step(1/240);
 }
 launch({position=0,angle=0,spin=0,power=50}={}){
  if(this.ball)this.world.removeBody(this.ball);
  this.ball=new C.Body({mass:6.8,material:this.ballMaterial,shape:new C.Sphere(DIM.ballRadius),linearDamping:0,angularDamping:.03,allowSleep:false});
  const speed=2.5+Math.max(0,Math.min(100,power))*.065,rad=angle*Math.PI/180;
  this.ball.position.set(Math.max(-.4,Math.min(.4,position)),DIM.ballRadius+.002,-.15);
  this.ball.velocity.set(Math.sin(rad)*speed,0,-Math.cos(rad)*speed);this.ball.angularVelocity.set(-speed/DIM.ballRadius,0,0);
  this.world.addBody(this.ball);this.spin=spin;this.time=0;this.gutter=false;this.done=false;this.quiet=0;this.passedAt=null;
 }
 step(dt=1/240){if(!this.ball||this.done)return;this.time+=dt;const b=this.ball;
  if(Math.abs(b.position.x)>DIM.width/2)this.gutter=true;
  if(this.gutter){ // A gutter ball cannot bounce back onto the deck or score through its side.
   b.collisionFilterMask=0;b.velocity.x=0;b.position.x=Math.sign(b.position.x||1)*(DIM.width/2+DIM.gutter/2);b.position.y=Math.max(-.04,b.position.y-.5*dt);b.velocity.y=0;
  }else if(b.position.z>-17.9){
   // Simplified oil transition: little early hook; drier back end grips more strongly.
   const dry=Math.max(0,Math.min(1,(-b.position.z-11)/4));
   b.velocity.x+=this.spin*(.012+.24*dry)*dt;
   const speed=Math.hypot(b.velocity.x,b.velocity.z),drag=.025+.055*dry;
   if(speed>0){const factor=Math.max(0,1-drag*dt/speed);b.velocity.x*=factor;b.velocity.z*=factor;}
  }
  this.world.step(dt);
  const passed=b.position.z<-19.5||b.position.y<-.5||this.time>11;
  if(passed&&this.passedAt===null)this.passedAt=this.time;
  if(this.passedAt!==null){const moving=this.pins.some(p=>p.body.velocity.length()>.045||p.body.angularVelocity.length()>.18);this.quiet=moving?0:this.quiet+dt;if(this.quiet>.7||this.time-this.passedAt>4)this.done=true;}
 }
 fallen(p){const up=p.body.quaternion.vmult(new C.Vec3(0,1,0));return up.y<Math.cos(Math.PI/5)||p.body.position.y<.075*this.heightRatio||Math.abs(p.body.position.x)>DIM.width/2+.08;}
 count(){return this.pins.filter(p=>this.fallen(p)).length;}
 sweep(){const down=this.pins.filter(p=>this.fallen(p));for(const p of down)this.world.removeBody(p.body);this.pins=this.pins.filter(p=>!down.includes(p));return down.map(p=>p.id);}
}
