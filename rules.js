// Ordered by priority: the first rule that claims an element wins.
// `selector` finds candidates; optional `resolve` maps a candidate to the element to outline.
const UILENS_RULES = [
  {
    id: 'highcharts', label: 'Highcharts', color: '#8b5cf6',
    selector: '.highcharts-container',
  },
  {
    id: 'react-select', label: 'chakra-react-select', color: '#f97316',
    selector: 'input[id^="react-select-"][id$="-input"], [class*="chakra-react-select"], [class*="hostSelect__control"]',
    resolve: (el) => {
      if (el.tagName !== 'INPUT') return el;
      // Walk up from the search input to the select's outer container.
      let node = el;
      for (let i = 0; i < 6 && node.parentElement; i++) {
        node = node.parentElement;
        if (/container/i.test(node.className) || node.getAttribute('data-uilens-select') !== null) return node;
      }
      return el.parentElement?.parentElement?.parentElement || el;
    },
  },
  {
    id: 'datepicker', label: 'react-datepicker', color: '#ec4899',
    selector: '.react-datepicker-wrapper, .react-datepicker-popper, .react-datepicker',
  },
  {
    id: 'gridstack', label: 'GridStack', color: '#eab308',
    selector: '.grid-stack-item',
  },
  {
    id: 'dndkit', label: 'dnd-kit', color: '#ef4444',
    selector: '[aria-roledescription="sortable"], [aria-roledescription="draggable"]',
  },
  {
    id: 'legacy-uikit', label: 'Legacy ui-kit', color: '#2563eb',
    selector: [
      'button', 'input', 'dropdown', 'radio', 'bannerBar', 'modal', 'checkbox', 'selectTrigger',
      'spin', 'propertyList', 'pill', 'tile', 'anchor', 'inlineTextInput',
    ].map((c) => `[class*="uikit-${c}"]`).join(', '),
  },
  {
    id: 'chakra', label: 'Chakra UI (named component)', color: '#14b8a6',
    selector: '[class*="chakra-"]',
  },
  {
    id: 'chakra-primitive', label: 'Chakra primitive (Box/Flex/Stack)', color: '#5eead4',
    selector: '[class^="css-"], [class*=" css-"]', dashed: true, defaultOff: true,
  },
  {
    // Catch-all for interactive/structural elements no library claimed: in-house
    // ui-common (`UI.*`), common/src/component/app, and plain JSX styled with LESS.
    id: 'inhouse', label: 'No library (in-house / plain)', color: '#6b7280',
    // [data-uilens-comp] = root DOM node of a React component (set by react-roots.js).
    selector: '[data-uilens-comp], button, a[href], input, select, textarea, table, [role="tab"], [role="tablist"], [role="button"], [role="menu"], [role="dialog"], [role="listbox"], [role="combobox"], [role="switch"], [role="checkbox"], [role="radio"], [role="slider"]',
    dashed: true,
    // Skip nodes rendered internally by libraries whose roots we already outline.
    resolve: (el) => (el.closest('.highcharts-container, .react-datepicker, .react-datepicker-popper, [id^="react-select-"][id$="-listbox"], [data-uilens="react-select"]') ? null : el),
  },
];
