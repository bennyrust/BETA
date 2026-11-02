export const portraits=['gaddafi','netanyahu','trump','putin','berlusconi','erdogan'];
export const modes={easy:{moves:16,multiplier:1.5},normal:{moves:12,multiplier:2},hard:{moves:9,multiplier:3}};
export function startRound(state,id,wager,mode,random=Math.random){
 if(state.memoryRound?.status==='playing')throw Error('Finish your current round first.');
 if(!id||state.receipts[id]||!Number.isSafeInteger(wager)||wager<1||wager>10000||!modes[mode])throw Error('Choose a valid wager (1–10,000 coins).');
 if(state.coins<wager)throw Error('Not enough coins. Earn coins in bowling or the shooting gallery.');
 const cards=[...portraits,...portraits];for(let i=cards.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}
 state.coins-=wager;state.receipts[id]={type:'memory-wager',wager,mode};
 return state.memoryRound={id,wager,mode,cards,matched:[],selected:[],moves:0,status:'playing',payout:0};
}
export function flip(state,id,index){
 const g=state.memoryRound;if(!g||g.id!==id||g.status!=='playing')throw Error('This round has ended.');
 if(!Number.isInteger(index)||index<0||index>=12||g.matched.includes(index)||g.selected.includes(index))return {round:g};
 g.selected.push(index);let mismatch=null;
 if(g.selected.length===2){g.moves++;const [a,b]=g.selected;if(g.cards[a]===g.cards[b])g.matched.push(a,b);else mismatch=[a,b];g.selected=[];
 if(g.matched.length===12||g.moves>=modes[g.mode].moves){g.status=g.matched.length===12?'won':'lost';g.payout=g.status==='won'?Math.floor(g.wager*modes[g.mode].multiplier):0;state.coins+=g.payout;state.receipts[id].status=g.status;state.receipts[id].payout=g.payout;}}
 return {round:g,mismatch};
}
