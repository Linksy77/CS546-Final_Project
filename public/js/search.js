(() => {
  const init = () => {
    const homeDropdown = document.getElementById('descFilterHeader');
    const searchForm = document.getElementById('searchForm');

    const getSelectedDescriptionFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      return (params.get('description') || '').trim();
    };

    const loadHomeDropdown = async () => {
      if (!homeDropdown) return;

      const desiredValue = getSelectedDescriptionFromUrl() || (homeDropdown.value || '').trim();

      try {
        homeDropdown.disabled = true;
        homeDropdown.innerHTML = '<option value="">Loading…</option>';

        const res = await fetch('/api/descriptions?limit=50', {
          headers: { Accept: 'application/json' }
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to load descriptions.');

        const items = Array.isArray(data.descriptions) ? data.descriptions : [];

        homeDropdown.innerHTML = '';

        const allOpt = document.createElement('option');
        allOpt.value = '';
        allOpt.textContent = 'All';
        homeDropdown.appendChild(allOpt);

        for (const item of items) {
          const opt = document.createElement('option');
          opt.value = item.description || '';
          opt.textContent = `${item.description || 'Unknown'} (${item.count || 0})`;
          homeDropdown.appendChild(opt);
        }

        if (desiredValue) {
          homeDropdown.value = desiredValue;
          if (homeDropdown.value !== desiredValue) {
            homeDropdown.value = '';
          }
        } else {
          homeDropdown.value = '';
        }
      } catch {
        homeDropdown.innerHTML = '<option value="">All</option>';
      } finally {
        homeDropdown.disabled = false;
      }
    };

    if (homeDropdown && !searchForm) {
      homeDropdown.addEventListener('change', () => {
        const val = (homeDropdown.value || '').trim();
        if (!val) {
          window.location.assign('/');
        } else {
          window.location.assign(`/?description=${encodeURIComponent(val)}`);
        }
      });

      loadHomeDropdown();
    }

    if (searchForm) {
      const clearBtn = document.getElementById('clearSearch');
      const errorEl = document.getElementById('searchError');

      const setError = (msg) => {
        if (errorEl) errorEl.textContent = msg || '';
      };

      clearBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.assign('/search');
      });

      searchForm.addEventListener('submit', (e) => {
        const input = document.getElementById('q');
        const q = (input?.value || '').trim();

        if (q.length < 2) {
          e.preventDefault();
          setError('Please enter at least 2 characters to search.');
          return;
        }
        if (q.length > 80) {
          e.preventDefault();
          setError('Search query is too long (max 80 characters).');
        }
      });
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
