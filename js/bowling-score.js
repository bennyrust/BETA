// A frame is an array of pin counts. Bonuses remain blank until known.
export function frameComplete(index, rolls) {
  if (index < 9) return rolls[0] === 10 || rolls.length === 2;
  return rolls.length === 3 || (rolls.length === 2 && rolls[0] + rolls[1] < 10);
}
export function scores(frames) {
  let total = 0, unresolved = false;
  return frames.map((rolls, i) => {
    const next = frames.slice(i + 1).flat();
    let value = null;
    if (i === 9) { if (frameComplete(i, rolls)) value = rolls.reduce((a,b)=>a+b,0); }
    else if (rolls[0] === 10) { if (next.length >= 2) value = 10 + next[0] + next[1]; }
    else if (rolls.length === 2) value = rolls[0]+rolls[1] === 10 ? (next.length ? 10+next[0] : null) : rolls[0]+rolls[1];
    if (value === null) unresolved = true;
    if (!unresolved) total += value;
    return unresolved ? null : total;
  });
}
export function freshRack(index, rolls) {
  return index < 9 ? frameComplete(index, rolls) : rolls.at(-1) === 10 || (rolls.length === 2 && rolls[0] + rolls[1] === 10);
}
export function rollLabel(rolls, n) {
  if (rolls[n] === 10) return 'X';
  if (n > 0 && rolls[n-1] !== 10 && (n === 1 || rolls[0] === 10) && rolls[n-1]+rolls[n] === 10) return '/';
  return rolls[n] === 0 ? '–' : String(rolls[n]);
}
