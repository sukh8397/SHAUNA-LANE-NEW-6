
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

// ==========================================================================
// 3D SCROLL TESTIMONIALS CONTROLLER (AUTO-ROTATING, ARROWS, FILTERS & 3D TILT)
// ==========================================================================
(() => {
  document.querySelectorAll('.t3d-section').forEach(section => {
    const track = section.querySelector('.t3d-track');
    const prevBtn = section.querySelector('.t3d-arrow.prev');
    const nextBtn = section.querySelector('.t3d-arrow.next');
    const filterBtns = section.querySelectorAll('.t3d-filter-btn');
    const cards = section.querySelectorAll('.t3d-card');

    if (!track) return;

    const getScrollAmount = () => {
      const card = track.querySelector('.t3d-card:not(.hidden)');
      const step = card ? card.offsetWidth + 12 : 240;
      return window.innerWidth < 680 ? step * 2 : step;
    };

    let isPaused = false;
    let autoScrollInterval = null;
    let pauseTimer = null;

    const advance = (dir = 1) => {
      const step = getScrollAmount();
      const maxScroll = track.scrollWidth - track.clientWidth;
      if (maxScroll <= 5) return;

      if (dir > 0) {
        if (track.scrollLeft >= maxScroll - 16) {
          track.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          track.scrollBy({ left: step, behavior: 'smooth' });
        }
      } else {
        if (track.scrollLeft <= 16) {
          track.scrollTo({ left: maxScroll, behavior: 'smooth' });
        } else {
          track.scrollBy({ left: -step, behavior: 'smooth' });
        }
      }
    };

    const startAutoScroll = () => {
      stopAutoScroll();
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      autoScrollInterval = setInterval(() => {
        if (isPaused) return;
        if (section.offsetParent === null) return;
        if (section.querySelector('.t3d-card.expanded')) return;
        advance(1);
      }, 3500);
    };

    const stopAutoScroll = () => {
      if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
        autoScrollInterval = null;
      }
    };

    const pauseTemporarily = (duration = 4500) => {
      isPaused = true;
      if (pauseTimer) clearTimeout(pauseTimer);
      pauseTimer = setTimeout(() => {
        isPaused = false;
      }, duration);
    };

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        advance(-1);
        pauseTemporarily(5000);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        advance(1);
        pauseTemporarily(5000);
      });
    }

    // Pause on hover
    section.addEventListener('mouseenter', () => { isPaused = true; });
    section.addEventListener('mouseleave', () => { isPaused = false; });

    // Touch interaction for mobile
    track.addEventListener('touchstart', () => { isPaused = true; }, { passive: true });
    track.addEventListener('touchend', () => { pauseTemporarily(4000); }, { passive: true });

    // Page visibility
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stopAutoScroll();
      } else {
        startAutoScroll();
      }
    });

    startAutoScroll();

    if (filterBtns.length > 0 && cards.length > 0) {
      filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          filterBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const filter = btn.getAttribute('data-filter') || 'all';

          cards.forEach(card => {
            const cat = card.getAttribute('data-category') || '';
            if (filter === 'all' || cat === filter || (filter === 'entertainment' && (cat === 'comedy' || cat === 'film' || cat === 'spark'))) {
              card.classList.remove('hidden');
            } else {
              card.classList.add('hidden');
            }
          });

          track.scrollTo({ left: 0, behavior: 'smooth' });
          pauseTemporarily(3000);
        });
      });
    }

    // Toggle card expansion on tap/click to read full quote if clamped
    cards.forEach(card => {
      card.addEventListener('click', (e) => {
        if (window.getSelection && window.getSelection().toString().length > 0) return;
        card.classList.toggle('expanded');
        if (card.classList.contains('expanded')) {
          isPaused = true;
        } else {
          pauseTemporarily(3000);
        }
      });

      card.addEventListener('mousemove', (e) => {
        if (card.classList.contains('expanded')) return;
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -5;
        const rotateY = ((x - centerX) / centerX) * 5;
        card.style.transform = `perspective(1000px) translateY(-5px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  });
})();
