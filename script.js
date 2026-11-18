
(() => {
  const progress = document.getElementById('progress');
  const menu = document.getElementById('menu');
  const nav = document.getElementById('nav');
  const topbar = document.querySelector('.topbar');

  const onScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.width = (max > 0 ? window.scrollY / max * 100 : 0) + '%';
    if (topbar) topbar.classList.toggle('scrolled', window.scrollY > 24);
    if (backTop) backTop.classList.toggle('show', window.scrollY > 550);
  };

  if (menu && nav) {
    menu.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      menu.setAttribute('aria-expanded', String(open));
      menu.textContent = open ? '×' : '☰';
    });
    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
      nav.classList.remove('open');
      menu.setAttribute('aria-expanded', 'false');
      menu.textContent = '☰';
    }));
  }

  // Add a subtle, consistent reveal rhythm to the existing approved page content.
  const revealTargets = document.querySelectorAll(
    '.section-head, .work-card, .split-image, .split-copy, .editorial-copy, .podcast-row, .page-hero > div, .page-hero > img, .content-card, .vcard, .testimonial, .list-item, .ci'
  );
  revealTargets.forEach((el, i) => {
    el.classList.add('reveal');
    if (i % 4) el.classList.add('reveal-delay-' + (i % 4));
  });

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if ('IntersectionObserver' in window && !reducedMotion) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -35px 0px' });
    revealTargets.forEach(el => observer.observe(el));
  } else {
    revealTargets.forEach(el => el.classList.add('visible'));
  }

  // Back-to-top is a real navigation aid and remains unobtrusive until needed.
  const backTop = document.createElement('button');
  backTop.className = 'back-top';
  backTop.type = 'button';
  backTop.setAttribute('aria-label', 'Back to top');
  backTop.textContent = '↑';
  document.body.appendChild(backTop);
  backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' }));

  // Keep the existing design-preview modal behavior, if a page uses it.
  document.querySelectorAll('[data-modal]').forEach(btn => btn.addEventListener('click', () => {
    const modal = document.getElementById('modal');
    const modalContent = document.getElementById('modalContent');
    if (!modal || !modalContent) return;
    modalContent.innerHTML = '<div class="modal-box"><button class="modal-close" aria-label="Close">×</button><div class="eyebrow">PREVIEW CONTENT</div><h2>Preview content</h2><p style="line-height:1.7;color:#555">This area is ready for Shauna’s approved footage, episode links, or additional details. Final media can be connected once the assets are available.</p></div>';
    modal.hidden = false;
    const close = modal.querySelector('.modal-close');
    if (close) close.onclick = () => modal.hidden = true;
    modal.onclick = e => { if (e.target === modal) modal.hidden = true; };
  }));

  document.querySelectorAll('form[data-demo]').forEach(form => form.addEventListener('submit', e => {
    e.preventDefault();
    const msg = form.querySelector('.form-message');
    if (msg) msg.textContent = 'Thanks — this is a design preview. The form will send messages once connected to a secure form service.';
  }));

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();


// ==========================================================================
// HOMEPAGE DESIGN VERSION SWITCHER & VIDEO LIGHTBOX CONTROLLER
// ==========================================================================
(() => {
  const body = document.body;
  const setVersionBtns = document.querySelectorAll('[data-set-version]');
  const toggleBtnHeader = document.getElementById('headerVersionToggle');
  const headerVersionLabel = document.getElementById('headerVersionLabel');

  const applyHomeVersion = (version) => {
    if (!body.hasAttribute('data-home-version')) return;
    const valid = version === 'classic' ? 'classic' : 'collage';
    body.setAttribute('data-home-version', valid);
    try {
      localStorage.setItem('shauna_home_version', valid);
    } catch (e) {}

    setVersionBtns.forEach(btn => {
      const isMatch = btn.getAttribute('data-set-version') === valid;
      btn.classList.toggle('active', isMatch);
      btn.setAttribute('aria-pressed', String(isMatch));
    });

    if (headerVersionLabel) {
      headerVersionLabel.textContent = valid === 'collage'
        ? 'Switch to Classic Editorial'
        : 'Switch to Warm Collage';
    }
  };

  if (body.hasAttribute('data-home-version')) {
    applyHomeVersion('classic');

    setVersionBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetVer = btn.getAttribute('data-set-version');
        applyHomeVersion(targetVer);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });

    if (toggleBtnHeader) {
      toggleBtnHeader.addEventListener('click', () => {
        const current = body.getAttribute('data-home-version') === 'classic' ? 'classic' : 'collage';
        applyHomeVersion(current === 'collage' ? 'classic' : 'collage');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }

  // Interactive Video Clip Modal for Homepage Thumbnails & Showreel
  const videoModal = document.getElementById('wcVideoModal');
  const videoPlayer = document.getElementById('wcModalVideoPlayer');
  const videoTitle = document.getElementById('wcModalVideoTitle');
  const videoClose = document.getElementById('wcModalVideoClose');

  const closeVideoModal = () => {
    if (!videoModal) return;
    videoModal.hidden = true;
    if (videoPlayer) {
      videoPlayer.pause();
      videoPlayer.removeAttribute('src');
      videoPlayer.load();
    }
  };

  document.querySelectorAll('[data-video-src]').forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      if (!videoModal || !videoPlayer) return;
      const src = trigger.getAttribute('data-video-src');
      const poster = trigger.getAttribute('data-video-poster') || '';
      const title = trigger.getAttribute('data-video-title') || 'Selected Clip';
      if (videoTitle) videoTitle.textContent = title;
      if (poster) videoPlayer.setAttribute('poster', poster);
      videoPlayer.setAttribute('src', src);
      videoModal.hidden = false;
      videoPlayer.play().catch(() => {});
    });
  });

  if (videoClose) videoClose.addEventListener('click', closeVideoModal);
  if (videoModal) {
    videoModal.addEventListener('click', (e) => {
      if (e.target === videoModal) closeVideoModal();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && videoModal && !videoModal.hidden) {
      closeVideoModal();
    }
  });
})();
