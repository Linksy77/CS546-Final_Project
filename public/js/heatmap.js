(() => {
  const daySelect = document.getElementById('daySelect');
  const hourSelect = document.getElementById('hourSelect');
  const resetBtn = document.getElementById('heatmapReset');

  const metaEl = document.getElementById('heatmapMeta');
  const statusEl = document.getElementById('heatmapStatus');
  const gridEl = document.getElementById('heatmapGrid');
  const legendEl = document.getElementById('heatmapLegend');
  const tooltipEl = document.getElementById('heatmapTooltip');

  if (!gridEl || !statusEl) return;

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  let baseGrid = null;
  let baseMax = 0;

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  const hourRangeForPreset = (preset) => {
    switch (preset) {
      case 'night': return [0, 6];
      case 'morning': return [6, 12];
      case 'afternoon': return [12, 18];
      case 'evening': return [18, 24];
      default: return null;
    }
  };

  const computeMax = (grid) => {
    let m = 0;
    for (let d = 0; d < grid.length; d++) {
      for (let h = 0; h < grid[d].length; h++) {
        if (grid[d][h] > m) m = grid[d][h];
      }
    }
    return m;
  };

  const formatHour = (h) => {
    const suffix = h < 12 ? 'am' : 'pm';
    const hr12 = h % 12 === 0 ? 12 : h % 12;
    return `${hr12}${suffix}`;
  };

  const buildFilteredGrid = () => {
    if (!baseGrid) return { grid: null, max: 0, visibleDays: null, visibleHours: null };

    const selectedDayRaw = (daySelect?.value ?? 'all').trim();
    const selectedDay =
      selectedDayRaw === 'all' ? null : clamp(parseInt(selectedDayRaw, 10), 0, 6);

    const preset = (hourSelect?.value ?? 'all').trim();
    const range = hourRangeForPreset(preset); 
    const out = Array.from({ length: 7 }, (_, d) => Array(24).fill(0));

    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        if (selectedDay !== null && d !== selectedDay) {
          out[d][h] = 0;
          continue;
        }

        if (range && !(h >= range[0] && h < range[1])) {
          out[d][h] = 0;
          continue;
        }

        out[d][h] = baseGrid[d][h] || 0;
      }
    }

    const max = computeMax(out);
    return {
      grid: out,
      max,
      selectedDay,
      range
    };
  };

  const colorStrength = (value, max) => {
    if (!max || max <= 0) return 0;
    return value / max;
  };

  const renderLegend = (max) => {
    if (!legendEl) return;
    legendEl.textContent = '';

    const steps = 5;
    const items = [];

    for (let i = 0; i <= steps; i++) {
      const t = i / steps; // 0..1
      const v = Math.round(t * max);
      items.push({ t, v });
    }

    const wrap = document.createElement('div');
    wrap.className = 'legend-steps';

    for (const item of items) {
      const row = document.createElement('div');
      row.className = 'legend-step';

      const swatch = document.createElement('span');
      swatch.className = 'legend-swatch';
      swatch.style.opacity = String(0.15 + 0.85 * item.t);

      const label = document.createElement('span');
      label.className = 'legend-label';
      label.textContent = `${item.v}`;

      row.appendChild(swatch);
      row.appendChild(label);
      wrap.appendChild(row);
    }

    legendEl.appendChild(wrap);
  };

  const hideTooltip = () => {
    if (!tooltipEl) return;
    tooltipEl.hidden = true;
    tooltipEl.textContent = '';
  };

  const showTooltip = (evt, text) => {
    if (!tooltipEl) return;
    tooltipEl.hidden = false;
    tooltipEl.textContent = text;

    const padding = 12;
    const x = evt.clientX + padding;
    const y = evt.clientY + padding;

    tooltipEl.style.left = `${x}px`;
    tooltipEl.style.top = `${y}px`;
  };

  const renderGrid = () => {
    const filtered = buildFilteredGrid();
    if (!filtered.grid) return;

    const { grid, max, selectedDay, range } = filtered;
    if (statusEl) statusEl.style.display = 'none';

    if (metaEl) {
      const dayText = selectedDay === null ? 'All days' : DAYS[selectedDay];
      const timeText = range ? `${formatHour(range[0])}–${formatHour(range[1] % 24)}` : 'All hours';

      let total = 0;
      for (let d = 0; d < 7; d++) for (let h = 0; h < 24; h++) total += grid[d][h];

      metaEl.textContent = `${dayText} • ${timeText} • ${total.toLocaleString()} complaints shown`;
    }

    renderLegend(max);

    gridEl.textContent = '';

    const table = document.createElement('div');
    table.className = 'heatmap-grid';

    for (let d = 0; d < 7; d++) {
      const row = document.createElement('div');
      row.className = 'heatmap-row';

      const dayLabel = document.createElement('div');
      dayLabel.className = 'heatmap-day';
      dayLabel.textContent = DAYS[d];
      row.appendChild(dayLabel);

      const cells = document.createElement('div');
      cells.className = 'heatmap-cells';

      const isDimDay = selectedDay !== null && d !== selectedDay;

      for (let h = 0; h < 24; h++) {
        const v = grid[d][h] || 0;

        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'heatmap-cell';
        if (isDimDay) cell.classList.add('is-dim');
        if (range && !(h >= range[0] && h < range[1])) cell.classList.add('is-dim');

        const t = colorStrength(v, max);
        cell.style.opacity = String(0.12 + 0.88 * t);

        cell.setAttribute('aria-label', `${DAYS[d]} ${formatHour(h)}: ${v} complaints`);
        cell.dataset.day = String(d);
        cell.dataset.hour = String(h);
        cell.dataset.count = String(v);

        cell.addEventListener('mouseenter', (e) => {
          const txt = `${DAYS[d]} • ${formatHour(h)} • ${v.toLocaleString()} complaints`;
          showTooltip(e, txt);
        });
        cell.addEventListener('mousemove', (e) => {
          const txt = `${DAYS[d]} • ${formatHour(h)} • ${v.toLocaleString()} complaints`;
          showTooltip(e, txt);
        });
        cell.addEventListener('mouseleave', () => hideTooltip());

        cells.appendChild(cell);
      }

      row.appendChild(cells);
      table.appendChild(row);
    }

    gridEl.appendChild(table);
  };

  const load = async () => {
    try {
      if (statusEl) {
        statusEl.textContent = 'Loading heat map…';
        statusEl.style.display = '';
      }
      if (metaEl) metaEl.textContent = '';

      const res = await fetch('/api/heatmap-time', { headers: { Accept: 'application/json' } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to load heatmap.');
      if (!data.grid || !Array.isArray(data.grid) || data.grid.length !== 7) {
        throw new Error('Heatmap data format is invalid.');
      }

      baseGrid = data.grid;
      baseMax = typeof data.max === 'number' ? data.max : computeMax(baseGrid);

      renderGrid();
    } catch (e) {
      if (statusEl) {
        statusEl.textContent = e?.message || 'Failed to load heat map.';
        statusEl.style.display = '';
      }
    }
  };

  if (daySelect) {
    daySelect.addEventListener('change', () => {
      renderGrid();
    });
  }

  if (hourSelect) {
    hourSelect.addEventListener('change', () => {
      renderGrid();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (daySelect) daySelect.value = 'all';
      if (hourSelect) hourSelect.value = 'all';
      hideTooltip();
      renderGrid();
    });
  }

  window.addEventListener('scroll', hideTooltip, { passive: true });
  window.addEventListener('click', (e) => {
    if (!(e.target && e.target.classList && e.target.classList.contains('heatmap-cell'))) {
      hideTooltip();
    }
  });

  document.addEventListener('DOMContentLoaded', load);
  if (document.readyState !== 'loading') load();
})();
