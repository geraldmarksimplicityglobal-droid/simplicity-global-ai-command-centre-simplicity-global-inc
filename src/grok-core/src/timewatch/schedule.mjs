export function parseIntervalMs(value = '300') {
 const seconds = Number(value);
 if (!Number.isInteger(seconds) || seconds < 30 || seconds > 86400) throw new Error('SOURCE_SYNC_INTERVAL_SECONDS must be an integer from 30 to 86400');
 return seconds * 1000;
}
export function shouldRun(lastSuccessfulSync, now = Date.now(), intervalMs = 300000) {
 if (!lastSuccessfulSync) return true;
 const last = Date.parse(lastSuccessfulSync);
 if (!Number.isFinite(last)) return true;
 return now - last >= intervalMs;
}
export function nextRunAt(lastSuccessfulSync, intervalMs) {
 const last = Date.parse(lastSuccessfulSync);
 if (!Number.isFinite(last)) throw new Error('Invalid lastSuccessfulSync timestamp');
 return new Date(last + intervalMs).toISOString();
}
function wait(ms, signal) {
 return new Promise(resolve => {
  if (signal?.aborted) return resolve();
  const done = () => { clearTimeout(timer); signal?.removeEventListener('abort', done); resolve(); };
  const timer = setTimeout(done, ms);
  signal?.addEventListener('abort', done, {once:true});
 });
}
export async function runTimeWatcher({run, intervalMs, signal, onError = () => {}}) {
 if (typeof run !== 'function') throw new Error('run must be a function');
 if (!Number.isInteger(intervalMs) || intervalMs < 30000) throw new Error('intervalMs must be at least 30 seconds');
 while (!signal?.aborted) {
  const started = Date.now();
  try { await run(); } catch (error) { onError(error); }
  await wait(Math.max(1000, intervalMs - (Date.now() - started)), signal);
 }
}
