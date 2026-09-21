(function () {
  // Theme toggle
  const toggle = document.getElementById('theme-toggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('mb-theme', next);
    });
  }

  // Sliding pill nav
  const navLinks = document.querySelector('.nav-links');
  if (!navLinks) return;

  const indicator = document.createElement('div');
  indicator.className = 'nav-indicator';
  navLinks.prepend(indicator);

  const links = Array.from(navLinks.querySelectorAll('.nav-link'));
  const activeLink = navLinks.querySelector('.nav-link-active') || null;

  function moveIndicator(link, instant) {
    if (instant) indicator.style.transition = 'none';
    indicator.style.left  = link.offsetLeft + 'px';
    indicator.style.width = link.offsetWidth + 'px';
    indicator.style.opacity = '1';
    if (instant) {
      indicator.getBoundingClientRect(); // force reflow
      indicator.style.transition = '';
    }
  }

  // Snap to active link on load without animation
  if (activeLink) {
    moveIndicator(activeLink, true);
  } else {
    indicator.style.opacity = '0';
  }

  // Slide on click, then navigate after animation starts
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (!href || href === '#') return;
      e.preventDefault();
      moveIndicator(link, false);
      setTimeout(() => { window.location.href = href; }, 300);
    });
  });
})();
