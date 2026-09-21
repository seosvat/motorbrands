/* brand.js — Motorbrands · Brand profile page renderer */

(function () {
  'use strict';

  const params = new URLSearchParams(location.search);
  const brandId = params.get('id');

  if (!brandId) { showError(); return; }

  const brand = (typeof BRANDS !== 'undefined' ? BRANDS : []).find(b => b.id === brandId);
  if (!brand) { showError(); return; }

  const content = (typeof BRANDS_CONTENT !== 'undefined' ? BRANDS_CONTENT : []).find(b => b.id === brandId) || {};

  renderPage(brand, content);

  function renderPage(b, c) {
    // ── Meta & SEO ──────────────────────────────────────────────────────────
    const pageTitle = `${b.name} — Motorbrands`;
    const description = c.tagline || `Historia y ficha completa de ${b.name}`;
    document.title = pageTitle;
    document.querySelector('meta[name="description"]').content = description;

    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.href = location.origin + `/brand.html?id=${b.id}`;

    document.querySelector('meta[property="og:title"]').content = pageTitle;
    document.querySelector('meta[property="og:description"]').content = description;

    // JSON-LD
    const ld = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: b.name,
      foundingDate: String(b.founded),
      url: b.url || undefined,
      parentOrganization: b.group ? { '@type': 'Organization', name: b.group } : undefined,
      foundingLocation: b.country ? { '@type': 'Country', name: b.country } : undefined,
      description: description
    };
    document.getElementById('ld-json').textContent = JSON.stringify(ld, null, 2);

    // ── Breadcrumb ──────────────────────────────────────────────────────────
    const catLabels = { car: 'Coches', moto: 'Motos', autonomous: 'Autónomos' };
    document.getElementById('bc-category').textContent = catLabels[b.category] || b.category;
    document.getElementById('bc-name').textContent = b.name;

    // ── Logo ────────────────────────────────────────────────────────────────
    const logoWrap = document.getElementById('brand-logo-wrap');
    const catSuffix = b.category === 'car' ? 'auto' : b.category;
    const localSrc = `Assets/${b.id}-${catSuffix}.png`;
    const domain = b.url ? getDomain(b.url) : null;
    const fallbackSrc = domain ? `https://logo.clearbit.com/${domain}` : null;

    const img = document.createElement('img');
    img.alt = '';
    img.src = localSrc;
    img.className = 'brand-logo-wrap-img';
    img.style.cssText = 'width:72px;height:72px;object-fit:contain;';
    img.addEventListener('load', () => { logoWrap.classList.add('has-logo'); });
    img.addEventListener('error', function () {
      if (!this.dataset.tried && fallbackSrc) {
        this.dataset.tried = '1';
        this.src = fallbackSrc;
      } else {
        this.remove();
        document.getElementById('brand-mono').textContent = b.name.substring(0, 2).toUpperCase();
      }
    });
    logoWrap.insertBefore(img, logoWrap.firstChild);

    // ── Badges ──────────────────────────────────────────────────────────────
    const badgeCat = document.getElementById('badge-category');
    const catLabel = catLabels[b.category] || b.category;
    badgeCat.textContent = catLabel;
    badgeCat.setAttribute('data-cat', b.category);

    const badgeStatus = document.getElementById('badge-status');
    const statusLabel = b.status === 'defunct' ? 'Desaparecida' : 'Activa';
    badgeStatus.textContent = statusLabel;
    badgeStatus.setAttribute('data-status', b.status || 'active');

    // ── Name + tagline ──────────────────────────────────────────────────────
    document.getElementById('brand-name').textContent = b.name;
    document.getElementById('brand-tagline').textContent = c.tagline || '';

    // ── Stats ───────────────────────────────────────────────────────────────
    document.getElementById('stat-founded').textContent = b.founded
      ? (c.dissolved ? `${b.founded} – ${c.dissolved}` : b.founded)
      : '—';
    document.getElementById('stat-country').textContent = b.flag ? `${b.flag} ${b.country}` : (b.country || '—');
    document.getElementById('stat-hq').textContent = c.hq || b.country || '—';
    document.getElementById('stat-group').textContent = b.group || 'Independiente';

    // ── Fuels ───────────────────────────────────────────────────────────────
    const fuelLabels = { electric: 'Eléctrico', hybrid: 'Híbrido', combustion: 'Combustión', hydrogen: 'Hidrógeno' };
    const fuelWrap = document.getElementById('brand-fuels');
    (b.fuel || []).forEach(f => {
      const chip = document.createElement('span');
      chip.className = 'brand-fuel-chip';
      chip.setAttribute('data-fuel', f);
      chip.textContent = fuelLabels[f] || f;
      fuelWrap.appendChild(chip);
    });

    // ── Website link ────────────────────────────────────────────────────────
    const websiteLink = document.getElementById('brand-website-link');
    if (b.url) {
      websiteLink.href = b.url;
    } else {
      websiteLink.style.display = 'none';
    }

    // ── History ─────────────────────────────────────────────────────────────
    const historyEl = document.getElementById('brand-history');
    if (c.history) {
      c.history.split('\n\n').forEach(para => {
        if (para.trim()) {
          const p = document.createElement('p');
          p.textContent = para.trim();
          historyEl.appendChild(p);
        }
      });
    } else {
      historyEl.innerHTML = `<p style="color:var(--color-ink-3)">Contenido próximamente.</p>`;
    }

    // ── Notable facts ────────────────────────────────────────────────────────
    const notableList = document.getElementById('brand-notable');
    const notableWrap = document.getElementById('brand-notable-wrap');
    if (c.notable && c.notable.length) {
      c.notable.forEach(fact => {
        const li = document.createElement('li');
        li.textContent = fact;
        notableList.appendChild(li);
      });
    } else {
      notableWrap.style.display = 'none';
    }

    // ── Models ──────────────────────────────────────────────────────────────
    const modelsEl = document.getElementById('brand-models');
    if (c.models && c.models.length) {
      c.models.forEach(m => {
        const chip = document.createElement('span');
        chip.className = 'brand-model-chip';
        chip.textContent = m;
        modelsEl.appendChild(chip);
      });
    } else {
      modelsEl.closest('.brand-sidebar-block').style.display = 'none';
    }

    // ── Fuel detail sidebar ──────────────────────────────────────────────────
    const fuelDetail = document.getElementById('brand-fuel-detail');
    (b.fuel || []).forEach(f => {
      const row = document.createElement('div');
      row.className = 'brand-fuel-row';
      row.innerHTML = `<span class="brand-fuel-dot" data-fuel="${f}"></span>${fuelLabels[f] || f}`;
      fuelDetail.appendChild(row);
    });

    // ── Segments ────────────────────────────────────────────────────────────
    const segmentsEl = document.getElementById('brand-segments');
    const segmentsBlock = document.getElementById('brand-segments-block');
    const segLabels = {
      city: 'Urbano', compact: 'Compacto', sedan: 'Sedán', suv: 'SUV',
      pickup: 'Pickup', supercar: 'Supercar', hypercar: 'Hypercar',
      luxury: 'Lujo', commercial: 'Comercial', sport: 'Deportivo'
    };
    if (c.segments && c.segments.length) {
      c.segments.forEach(s => {
        const chip = document.createElement('span');
        chip.className = 'brand-segment-chip';
        chip.textContent = segLabels[s] || s;
        segmentsEl.appendChild(chip);
      });
    } else {
      segmentsBlock.style.display = 'none';
    }

    // ── Related brands ───────────────────────────────────────────────────────
    const grid = document.getElementById('brand-related-grid');
    const sameCat = (typeof BRANDS !== 'undefined' ? BRANDS : [])
      .filter(rb => rb.id !== b.id && rb.category === b.category)
      .sort(() => Math.random() - 0.5)
      .slice(0, 8);

    sameCat.forEach(rb => {
      const a = document.createElement('a');
      a.className = 'brand-related-card';
      a.href = `brand.html?id=${rb.id}`;

      const catSuf = rb.category === 'car' ? 'auto' : rb.category;
      const rImg = document.createElement('img');
      rImg.src = `Assets/${rb.id}-${catSuf}.png`;
      rImg.alt = '';
      rImg.className = 'brand-related-logo';
      rImg.addEventListener('error', function () {
        const domain2 = rb.url ? getDomain(rb.url) : null;
        if (!this.dataset.tried && domain2) {
          this.dataset.tried = '1';
          this.src = `https://logo.clearbit.com/${domain2}`;
        } else {
          const mono = document.createElement('div');
          mono.className = 'brand-related-mono';
          mono.textContent = rb.name.substring(0, 2).toUpperCase();
          this.replaceWith(mono);
        }
      });

      a.appendChild(rImg);
      a.appendChild(document.createTextNode(rb.name));
      grid.appendChild(a);
    });

    // ── Show page ────────────────────────────────────────────────────────────
    document.getElementById('brand-page').removeAttribute('hidden');
    document.getElementById('brand-error').setAttribute('hidden', '');
  }

  function showError() {
    document.getElementById('brand-error').removeAttribute('hidden');
    document.getElementById('brand-page').setAttribute('hidden', '');
  }

  function getDomain(url) {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return null; }
  }
})();
