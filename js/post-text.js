// A standalone // line separates posts; URLs and inline slashes remain text.
export function splitPosts(text = '') {
  const posts = [[]];
  for (const line of text.split(/\r?\n/)) {
    if (line.trim() === '//') posts.push([]);
    else posts.at(-1).push(line);
  }
  return posts.filter((lines, index) => index === 0 || lines.some(line => line.trim()));
}

export function greentext(line) {
  return line.trim() ? `>${line.replace(/^>/, '')}` : '';
}
