// ponytail: single source of truth for API base URL
// Override via localStorage.setItem('emulatorjs_api_base', 'https://your-worker.workers.dev')
// or set EMULATORJS_API_BASE before this script loads.
window.EMULATORJS_API_BASE =
  localStorage.getItem('emulatorjs_api_base') ||
  (typeof EMULATORJS_API_BASE !== 'undefined' ? EMULATORJS_API_BASE : 'https://emulatorjs-cf.alphatsui.workers.dev');
