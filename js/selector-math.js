export const wrapIndex = (value, count) => ((value % count) + count) % count;
export const loopOffset = (index, position, count) => wrapIndex(index - position + count / 2, count) - count / 2;
