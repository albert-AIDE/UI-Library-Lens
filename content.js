(() => {
  if (window.__uilensLoaded) return;
  window.__uilensLoaded = true;

  const ATTR = 'data-uilens';
  const STYLE_ID = 'uilens-style';
  const rules = UILENS_RULES;
  const ruleById = Object.fromEntries(rules.map((r) => [r.id, r]));
  let settings = { enabled: true, showLegend: true, libs: {} };
  let observer = null;
  let scheduled = null;
  let tooltip = null;
  let legend = null;

  const isLibOn = (r) => settings.libs[r.id] ?? !r.defaultOff;
  const isOwnUi = (el) => el.closest?.('#uilens-legend, #uilens-tooltip');

  function buildCss() {
    const parts = rules.filter(isLibOn).map((r) =>
      `[${ATTR}="${r.id}"]{outline:2px ${r.dashed ? 'dashed' : 'solid'} ${r.color} !important;outline-offset:-2px !important;}`
    );
    parts.push(
      `#uilens-tooltip{position:fixed;z-index:2147483647;pointer-events:none;background:#111827;color:#fff;font:12px/1.4 system-ui,sans-serif;padding:4px 8px;border-radius:4px;max-width:420px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:none}`,
      `#uilens-legend{position:fixed;right:12px;bottom:12px;z-index:2147483646;background:#fff;color:#111827;font:12px/1.5 system-ui,sans-serif;border:1px solid #d1d5db;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.15);padding:8px 10px;min-width:220px}`,
      `#uilens-legend .row{display:flex;align-items:center;gap:6px}`,
      `#uilens-legend .sw{width:12px;height:12px;border-radius:2px;flex:none}`,
      `#uilens-legend .n{margin-left:auto;font-variant-numeric:tabular-nums;color:#6b7280}`,
      `#uilens-legend .off{opacity:.4}`,
      `#uilens-legend b{display:block;margin-bottom:4px}`
    );
    return parts.join('\n');
  }

  function applyStyle() {
    let style = document.getElementById(STYLE_ID);
    if (!settings.enabled) { style?.remove(); return; }
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(style);
    }
    style.textContent = buildCss();
  }

  function scan() {
    scheduled = null;
    if (!settings.enabled) return;
    const claimed = new Set();
    for (const r of rules) {
      for (const cand of document.querySelectorAll(r.selector)) {
        if (isOwnUi(cand)) continue;
        const el = r.resolve ? r.resolve(cand) : cand;
        if (!el || claimed.has(el)) continue;
        claimed.add(el);
        if (el.getAttribute(ATTR) !== r.id) el.setAttribute(ATTR, r.id);
      }
    }
    for (const el of document.querySelectorAll(`[${ATTR}]`)) {
      if (!claimed.has(el)) el.removeAttribute(ATTR);
    }
    renderLegend();
  }

  const scheduleScan = () => { if (!scheduled) scheduled = setTimeout(scan, 250); };

  function counts() {
    const out = {};
    for (const r of rules) out[r.id] = document.querySelectorAll(`[${ATTR}="${r.id}"]`).length;
    return out;
  }

  function renderLegend() {
    if (window.top !== window) return;
    if (!settings.enabled || !settings.showLegend) { legend?.remove(); legend = null; return; }
    if (!legend) {
      legend = document.createElement('div');
      legend.id = 'uilens-legend';
      document.body.appendChild(legend);
    }
    const c = counts();
    legend.innerHTML = '<b>UI Library Lens</b>' + rules.map((r) =>
      `<div class="row${isLibOn(r) ? '' : ' off'}"><span class="sw" style="background:${r.color}${r.dashed ? ';outline:1px dashed #6b7280' : ''}"></span>${r.label}<span class="n">${c[r.id]}</span></div>`
    ).join('');
  }

  function onMove(e) {
    if (!settings.enabled) return;
    const el = e.target.closest?.(`[${ATTR}]`);
    const r = el && ruleById[el.getAttribute(ATTR)];
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'uilens-tooltip';
      document.documentElement.appendChild(tooltip);
    }
    if (!r || !isLibOn(r)) { tooltip.style.display = 'none'; return; }
    const cls = typeof el.className === 'string' ? el.className.split(/\s+/).filter((c) => !c.startsWith('css-')).slice(0, 3).join('.') : '';
    const comp = el.getAttribute('data-uilens-comp');
    const compLabel = comp && comp !== '?' && comp.length > 2 ? ` · ${comp}` : '';
    tooltip.textContent = `${r.label}${compLabel} — <${el.tagName.toLowerCase()}${cls ? '.' + cls : ''}>`;
    tooltip.style.borderLeft = `4px solid ${r.color}`;
    tooltip.style.display = 'block';
    tooltip.style.left = Math.min(e.clientX + 12, window.innerWidth - 300) + 'px';
    tooltip.style.top = Math.min(e.clientY + 14, window.innerHeight - 30) + 'px';
  }

  function teardown() {
    observer?.disconnect(); observer = null;
    document.removeEventListener('uilens:roots', scheduleScan);
    document.removeEventListener('mousemove', onMove, true);
    for (const el of document.querySelectorAll(`[${ATTR}]`)) el.removeAttribute(ATTR);
    document.getElementById(STYLE_ID)?.remove();
    tooltip?.remove(); tooltip = null;
    legend?.remove(); legend = null;
  }

  function apply() {
    if (!settings.enabled) { teardown(); return; }
    applyStyle();
    scan();
    if (!observer) {
      observer = new MutationObserver((muts) => {
        if (muts.every((m) => isOwnUi(m.target))) return;
        scheduleScan();
      });
      observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'aria-roledescription'] });
      document.addEventListener('mousemove', onMove, true);
      document.addEventListener('uilens:roots', scheduleScan);
    }
  }

  chrome.storage.sync.get(settings, (s) => { settings = { ...settings, ...s }; apply(); });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    for (const [k, { newValue }] of Object.entries(changes)) settings[k] = newValue;
    apply();
  });
  chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
    if (msg?.type === 'uilens:counts' && window.top === window) reply({ counts: counts(), rules: rules.map(({ id, label, color, dashed, defaultOff }) => ({ id, label, color, dashed, defaultOff })) });
  });
})();
