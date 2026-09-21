(function () {
  // Theme toggle — handles all .theme-toggle buttons
  document.querySelectorAll('.theme-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('mb-theme', next);
    });
  });

  // Hamburger menu
  const hamburger = document.getElementById('nav-hamburger');
  const navLinksMenu = document.getElementById('nav-links-menu');
  if (hamburger && navLinksMenu) {
    hamburger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = navLinksMenu.classList.toggle('nav-open');
      hamburger.setAttribute('aria-expanded', isOpen);
    });
    document.addEventListener('click', (e) => {
      if (!navLinksMenu.contains(e.target) && e.target !== hamburger) {
        navLinksMenu.classList.remove('nav-open');
        hamburger.setAttribute('aria-expanded', 'false');
      }
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
