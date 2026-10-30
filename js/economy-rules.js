export const TOYS=['luigi','crooks','tetsuya','rittenhouse'];
export function price(kind,quote){
 if(!['toy','vape'].includes(kind)||!Number.isFinite(quote.close)||!Number.isFinite(quote.baseClose)||quote.close<=0||quote.baseClose<=0)throw Error('Prices unavailable');
 return Math.max(1,Math.round((kind==='toy'?100:75)*quote.close/quote.baseClose));
}
export function reward(game,score){
 if(!Number.isSafeInteger(score)||score<0||!['bowling','gallery'].includes(game)||score>(game==='bowling'?300:100000))throw Error('Invalid game result');
 return game==='bowling'?score*2:Math.floor(score/100);
}
export function initialState(){return {coins:0,items:{},receipts:{},migrated:false};}
export function award(state,id,game,score){
 if(!id)throw Error('Missing game session');
 const coins=reward(game,score);if(state.receipts[id])return 0;
 state.coins+=coins;state.receipts[id]={type:'reward',game,coins};return coins;
}
export function buy(state,id,item,cost){
 if(state.receipts[id])return state.receipts[id];
 if(!id||!item||!Number.isSafeInteger(cost)||cost<1)throw Error('Invalid purchase');
 if(state.coins<cost)throw Error(`You need ${cost-state.coins} more coins. Earn coins in bowling or the shooting gallery.`);
 state.coins-=cost;state.items[item]=(state.items[item]||0)+1;
 return state.receipts[id]={type:'purchase',item,cost};
}
