// Runs in the page's MAIN world: React fiber expandos on DOM nodes are invisible to
// the isolated content-script world. Marks the first DOM element rendered by each
// React function/class component with `data-uilens-comp="<ComponentName>"`.
(() => {
  if (window.__uilensRootsLoaded) return;
  window.__uilensRootsLoaded = true;

  const ATTR = 'data-uilens-comp';
  const HOST = 5; // React 18 HostComponent tag
  const COMPOSITE = new Set([0, 1, 11, 14, 15]); // Function, Class, ForwardRef, Memo, SimpleMemo
  let fiberKey = null;
  let scheduled = null;

  const getFiber = (el) => {
    if (!fiberKey) fiberKey = Object.keys(el).find((k) => k.startsWith('__reactFiber$')) || null;
    return fiberKey ? el[fiberKey] : undefined;
  };

  const nameOf = (type) => {
    if (!type) return '';
    if (typeof type === 'function') return type.displayName || type.name || '';
    return type.displayName || nameOf(type.render) || nameOf(type.type) || '';
  };

  // Walk up to the nearest host fiber; if a composite sits in between, this element is
  // that component's root DOM node. Return the outermost composite's name in the gap.
  const componentFor = (fiber) => {
    let name = null;
    for (let f = fiber.return; f && f.tag !== HOST && f.tag !== 3; f = f.return) {
      if (COMPOSITE.has(f.tag)) name = nameOf(f.type) || name || '?';
    }
    return name;
  };

  function scan() {
    scheduled = null;
    const seen = new Set();
    for (const el of document.body ? document.body.getElementsByTagName('*') : []) {
      if (el.id === 'uilens-legend' || el.id === 'uilens-tooltip' || el.closest('#uilens-legend')) continue;
      const fiber = getFiber(el);
      if (!fiber) continue;
      const name = componentFor(fiber);
      if (name === null) continue;
      seen.add(el);
      if (el.getAttribute(ATTR) !== name) el.setAttribute(ATTR, name);
    }
    for (const el of document.querySelectorAll(`[${ATTR}]`)) if (!seen.has(el)) el.removeAttribute(ATTR);
    document.dispatchEvent(new Event('uilens:roots'));
  }

  const schedule = () => { if (!scheduled) scheduled = setTimeout(scan, 300); };
  new MutationObserver((muts) => {
    if (muts.every((m) => m.target.id === 'uilens-legend' || m.target.closest?.('#uilens-legend'))) return;
    schedule();
  }).observe(document.documentElement, { childList: true, subtree: true });
  schedule();
})();
