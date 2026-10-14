const reported = new Set();
export function reportError(name, file, error) {
  console.error(`Error loading ${name} (${file}):`, error);
  const key = `${name}:${file}`;
  if (reported.has(key)) return;
  reported.add(key);
  const item = document.createElement('li');
  item.textContent = `${name}: ${file}`;
  document.getElementById('assetErrorList').appendChild(item);
  document.getElementById('assetErrors').hidden = false;
}

export function reportFatal(error) {
  reportError('Viewer', 'Unable to start the 3D viewer', error);
  document.getElementById('assetErrorTitle').textContent = 'The 3D viewer could not start.';
}
