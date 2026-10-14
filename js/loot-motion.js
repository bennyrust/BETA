export const SHAKE_SECONDS=.95, FLIGHT_SECONDS=1.05, SETTLE_SECONDS=.75;
export function lootPose(elapsed){
 const flight=Math.max(0,Math.min(1,(elapsed-SHAKE_SECONDS)/FLIGHT_SECONDS));
 const settle=Math.max(0,elapsed-SHAKE_SECONDS-FLIGHT_SECONDS);
 const bounce=settle<SETTLE_SECONDS?Math.abs(Math.sin(settle*12))*Math.exp(-settle*5)*.18:0;
 return {flight,x:-1.05+2.15*flight,y:elapsed<SHAKE_SECONDS?1.1:(1-flight)*1.1+4*3.2*flight*(1-flight)+bounce,z:flight*1.35,
 wobble:settle>0&&settle<SETTLE_SECONDS?Math.sin(settle*19)*Math.exp(-settle*5)*.16:0,
 done:elapsed>=SHAKE_SECONDS+FLIGHT_SECONDS+SETTLE_SECONDS};
}
