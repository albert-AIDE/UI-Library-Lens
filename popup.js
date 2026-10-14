const defaults = { enabled: true, showLegend: true, libs: {} };

chrome.storage.sync.get(defaults, async (settings) => {
  const enabled = document.getElementById('enabled');
  const showLegend = document.getElementById('showLegend');
  enabled.checked = settings.enabled;
  showLegend.checked = settings.showLegend;
  enabled.onchange = () => chrome.storage.sync.set({ enabled: enabled.checked });
  showLegend.onchange = () => chrome.storage.sync.set({ showLegend: showLegend.checked });

  let counts = {};
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const res = await chrome.tabs.sendMessage(tab.id, { type: 'uilens:counts' });
    counts = res?.counts || {};
  } catch {
    // Content script is not injected on this tab (non-Mist page).
  }

  const libs = document.getElementById('libs');
  for (const r of UILENS_RULES) {
    const row = document.createElement('label');
    row.className = 'row';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = settings.libs[r.id] ?? !r.defaultOff;
    cb.onchange = () => {
      settings.libs = { ...settings.libs, [r.id]: cb.checked };
      chrome.storage.sync.set({ libs: settings.libs });
    };
    const sw = document.createElement('span');
    sw.className = 'sw';
    sw.style.background = r.color;
    const n = document.createElement('span');
    n.className = 'n';
    n.textContent = counts[r.id] ?? '–';
    row.append(cb, sw, document.createTextNode(r.label), n);
    libs.appendChild(row);
  }
});
