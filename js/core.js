// Independent of Three.js so queue and scheduling behavior can be tested directly.
export function prioritize(items, names) {
  const rank = new Map(names.map((name, index) => [name, index]));
  return [...items].sort((a, b) => (rank.get(a.name) ?? names.length) - (rank.get(b.name) ?? names.length));
}

export async function loadSequentially(items, load, { onLoaded, onError, signal } = {}) {
  for (const item of items) {
    if (signal?.aborted) break;
    try {
      const value = await load(item);
      await onLoaded?.(item, value);
    } catch (error) {
      onError?.(item, error);
    }
  }
}

export function createRenderScheduler(render, request = requestAnimationFrame, cancel = cancelAnimationFrame) {
  let frame = null;
  let disposed = false;
  function invalidate() {
    if (disposed || frame !== null) return;
    frame = request(() => {
      frame = null;
      if (render()) invalidate();
    });
  }
  return {
    invalidate,
    dispose() { disposed = true; if (frame !== null) cancel(frame); frame = null; },
  };
}

export function fitDistance(size, verticalFov, aspect, margin = 1.15) {
  const tangent = Math.tan(verticalFov * Math.PI / 360);
  return (Math.max(size.y / 2, size.x / (2 * aspect)) / tangent + size.z / 2) * margin;
}

export function isClick(start, end, threshold = 5) {
  return Math.hypot(end.x - start.x, end.y - start.y) <= threshold;
}

// Fetch one asset ahead while keeping decoding/GPU uploads strictly sequential.
// At most the current asset and the next asset are retained in memory.
export async function loadWithPrefetch(items, fetchItem, load, { onLoaded, onError, signal } = {}) {
  const fetchSafely = item => Promise.resolve().then(() => {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    return fetchItem(item);
  }).then(value => ({ value }), error => ({ error }));
  let pending = items.length ? fetchSafely(items[0]) : null;
  for (let i = 0; i < items.length; i++) {
    if (signal?.aborted) break;
    const fetched = await pending;
    if (signal?.aborted) break;
    pending = i + 1 < items.length ? fetchSafely(items[i + 1]) : null;
    try {
      if (fetched.error) throw fetched.error;
      const value = await load(items[i], fetched.value);
      await onLoaded?.(items[i], value);
    } catch (error) {
      if (!signal?.aborted) onError?.(items[i], error);
    }
  }
}
