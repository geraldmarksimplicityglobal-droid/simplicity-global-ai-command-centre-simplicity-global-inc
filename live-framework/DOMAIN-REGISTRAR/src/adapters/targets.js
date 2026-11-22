export const TARGET_ADAPTERS = Object.freeze({
  standalone: { role: "portable-package", capabilities: ["local-config", "offline-tests"], connected: false },
  github: { role: "source-control", capabilities: ["versioned-source", "pull-request-review"], connected: true },
  windows: { role: "primary-development-host", capabilities: ["node-runtime", "codex-workflow"], connected: false },
  termux: { role: "secondary-android-runtime", capabilities: ["node-runtime-if-installed", "offline-inspection"], connected: false },
  webstudio: { role: "management-interface", capabilities: ["display-api-data", "submit-approved-requests"], connected: false }
});

export function targetStatus() {
  return Object.entries(TARGET_ADAPTERS).map(([target, config]) => ({ target, ...config }));
}
