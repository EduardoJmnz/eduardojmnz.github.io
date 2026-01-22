export const state = {};
const listeners = new Set();
export function setState(patch){
  Object.assign(state, patch);
  listeners.forEach(fn => fn(state));
}
export function subscribe(fn){
  listeners.add(fn);
  return () => listeners.delete(fn);
}