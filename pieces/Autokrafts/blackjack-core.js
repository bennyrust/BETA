export const portraits=['gaddafi','netanyahu','trump','putin','berlusconi','erdogan'];
export function deck(random=Math.random){const cards=[];for(const suit of ['♠','♥','♦','♣'])for(let rank=1;rank<=13;rank++)cards.push({rank,suit,portrait:portraits[(rank-1+['♠','♥','♦','♣'].indexOf(suit)*13)%6]});for(let i=cards.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}return cards;}
export function total(cards){let value=0,aces=0;for(const c of cards){value+=c.rank===1?11:Math.min(c.rank,10);if(c.rank===1)aces++;}while(value>21&&aces){value-=10;aces--;}return value;}
export function natural(cards){return cards.length===2&&total(cards)===21;}
export function outcome(player,dealer){const p=total(player),d=total(dealer);if(p>21)return 'loss';if(d>21)return 'win';if(natural(player)!==natural(dealer))return natural(player)?'win':'loss';return p===d?'push':p>d?'win':'loss';}
