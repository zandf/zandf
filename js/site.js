/* ============================================
   ZANDF Website — Interactive JavaScript
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  // ——— Preloader: stays up until the latest content has been fetched from
  // ——— Firebase (content-loader.js / policy.js dispatch "zandf:content-ready"),
  // ——— so visitors never see stale/default data. Safety timeout as fallback.
  const preloader = document.getElementById('preloader');
  const hidePreloader = () => {
    if (!preloader || preloader.classList.contains('hidden')) return;
    preloader.classList.add('hidden');
    setTimeout(() => preloader.remove(), 600);
  };
  document.addEventListener('zandf:content-ready', hidePreloader);
  setTimeout(hidePreloader, 10000); // safety fallback so it never gets stuck

  // ——— rAF throttle: coalesce high-frequency events into one per frame ———
  const rafThrottle = (fn) => {
    let pending = false;
    return (...args) => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        fn(...args);
      });
    };
  };

  // ——— Navbar scroll effect ———
  const navbar = document.getElementById('navbar');
  let navSettleTimer;
  const onScroll = rafThrottle(() => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
    // Drop backdrop-filter while scrolling (it repaints the backdrop every
    // frame); restore it ~120ms after scrolling stops.
    navbar.classList.add('scrolling');
    clearTimeout(navSettleTimer);
    navSettleTimer = setTimeout(() => navbar.classList.remove('scrolling'), 120);
  });
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ——— Mobile nav toggle ———
  const hamburger = document.getElementById('navHamburger');
  const navLinks = document.getElementById('navLinks');

  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navLinks.classList.toggle('open');
    document.body.style.overflow = navLinks.classList.contains('open') ? 'hidden' : '';
  });

  // Close mobile nav when a link is clicked
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      navLinks.classList.remove('open');
      document.body.style.overflow = '';
    });
  });

  // ——— Scroll-reveal animations ———
  const revealElements = document.querySelectorAll('.reveal');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -60px 0px'
  });

  revealElements.forEach(el => revealObserver.observe(el));

  // ——— Counter animation for hero stats ———
  const animateCounter = (element, target, suffix = '') => {
    const duration = 2000;
    const startTime = performance.now();
    const startVal = 0;

    const step = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out expo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.floor(startVal + (target - startVal) * eased);
      element.textContent = current + suffix;

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  };

  // Observe hero stats section
  const heroStats = document.querySelector('.hero-stats');
  if (heroStats) {
    let statsAnimated = false;
    const statsObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !statsAnimated) {
          statsAnimated = true;
          // Animate each stat to its value on the page (set by content-loader
          // or the hardcoded HTML), preserving the suffix like "+".
          const animateStat = (id, fallback) => {
            const el = document.getElementById(id);
            if (!el) return;
            const m = el.textContent.trim().match(/^([\d,]+(?:\.[\d]+)?)\s*([^\d\s]*)$/);
            if (!m) { animateCounter(el, fallback, '+'); return; }
            animateCounter(el, parseFloat(m[1].replace(/,/g, '')), m[2] || '+');
          };
          animateStat('stat-projects', 150);
          animateStat('stat-clients', 80);
          animateStat('stat-years', 8);
        }
      });
    }, { threshold: 0.5 });
    statsObserver.observe(heroStats);
  }

  // ——— Smooth scrolling for all anchor links ———
  const scrollOffset = () => {
    const nav = document.getElementById('navbar');
    return (nav ? nav.offsetHeight : 0) + 16;
  };

  const smoothScrollTo = (targetY) => {
    const startY = window.scrollY;
    const distance = targetY - startY;
    if (Math.abs(distance) < 2) return;

    const duration = Math.min(650, Math.max(350, Math.abs(distance) * 0.35));
    const startTime = performance.now();
    const easeInOutCubic = (t) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const step = (now) => {
      const t = Math.min((now - startTime) / duration, 1);
      window.scrollTo(0, startY + distance * easeInOutCubic(t));
      if (t < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  };

  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (targetId === '#') return;
      e.preventDefault();
      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        const targetY = targetEl.getBoundingClientRect().top + window.scrollY - scrollOffset();
        smoothScrollTo(Math.max(targetY, 0));
      }
    });
  });

  // ——— Parallax effect on hero background ———
  const heroBg = document.querySelector('.hero-bg img');
  if (heroBg) {
    const updateParallax = rafThrottle(() => {
      const scrolled = window.scrollY;
      if (scrolled < window.innerHeight) {
        heroBg.style.transform = `translateY(${scrolled * 0.3}px) scale(1.05)`;
      }
    });
    window.addEventListener('scroll', updateParallax, { passive: true });
  }

  // ——— Tilt effect on service cards ———
  const tiltCards = document.querySelectorAll('.service-card');
  tiltCards.forEach(card => {
    const onTiltMove = rafThrottle((e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -4;
      const rotateY = ((x - centerX) / centerX) * 4;

      card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;
    });

    card.addEventListener('mousemove', onTiltMove);

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });

  // ——— Active nav link highlighting ———
  const sections = document.querySelectorAll('section[id]');
  const navAnchors = document.querySelectorAll('.nav-links a:not(.nav-cta)');

  let activeNavId = '';
  const highlightNav = () => {
    const scrollPos = window.scrollY + 120;
    let currentId = '';
    // Compute bounds live (getBoundingClientRect) instead of caching offsetTop,
    // so nav highlighting stays correct with content-visibility:auto sections
    // whose layout is skipped until they scroll into view.
    for (const section of sections) {
      const rect = section.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      const bottom = top + rect.height;
      if (scrollPos >= top && scrollPos < bottom) {
        currentId = section.getAttribute('id');
        break;
      }
    }
    if (currentId === activeNavId) return;
    activeNavId = currentId;
    navAnchors.forEach(a => {
      a.style.color = a.getAttribute('href') === `#${currentId}` ? 'var(--teal-300)' : '';
    });
  };

  window.addEventListener('resize', rafThrottle(highlightNav), { passive: true });
  window.addEventListener('scroll', rafThrottle(highlightNav), { passive: true });
  highlightNav();

  // ——— Cursor glow on CTA container ———
  // Drives a ::before overlay via CSS custom properties so mousemove only
  // updates two values instead of repainting a large background gradient.
  const ctaContainer = document.querySelector('.cta-container');
  if (ctaContainer) {
    const onCtaMove = rafThrottle((e) => {
      const rect = ctaContainer.getBoundingClientRect();
      ctaContainer.style.setProperty('--glow-x', `${e.clientX - rect.left}px`);
      ctaContainer.style.setProperty('--glow-y', `${e.clientY - rect.top}px`);
    });

    ctaContainer.addEventListener('mousemove', onCtaMove);
  }
  // ——— EmailJS contact form (Get in Touch section) ———
  // 1. Create a free account at https://www.emailjs.com
  // 2. Add an Email Service (Gmail, Outlook, etc.) -> get your SERVICE_ID
  // 3. Create an Email Template with variables: from_name, from_email, phone, service, message -> get your TEMPLATE_ID
  // 4. Get your PUBLIC_KEY from Account > General
  // 5. Put the values in .env and run `node scripts/build-config.js` to
  //    regenerate js/config.js (the values below are the fallback).
  const emailjsCfg = (typeof window.ZANDF_CONFIG !== 'undefined' && window.ZANDF_CONFIG.emailjs) || {};
  const EMAILJS_PUBLIC_KEY = emailjsCfg.publicKey || 'fbuOgEHLQGag4oAZf';
  const EMAILJS_SERVICE_ID = emailjsCfg.serviceId || 'zandf';
  const EMAILJS_TEMPLATE_ID = emailjsCfg.templateId || 'template_0j2vnfh';

  // Load EmailJS lazily — injected only when the contact form is near the
  // viewport or receives focus, so the ~90KB script never blocks first paint.
  let emailjsLoaded = false;
  const loadEmailJS = () => new Promise((resolve, reject) => {
    if (window.emailjs) {
      if (!emailjsLoaded) { emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY }); emailjsLoaded = true; }
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
    s.async = true;
    s.onload = () => {
      emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
      emailjsLoaded = true;
      resolve();
    };
    s.onerror = () => reject(new Error('EmailJS failed to load'));
    document.head.appendChild(s);
  });

  // Persist the message to Firestore (collection "messages") alongside the
  // EmailJS send. Fire-and-forget: the form success state does not depend on it.
  const saveMessageToFirestore = () => {
    const fb = window.ZANDF_FIREBASE;
    if (!fb || !fb.db) return Promise.resolve();
    return fb.db.collection('messages').add({
      name: (document.getElementById('from_name').value || '').trim(),
      email: emailField.value.trim(),
      phone: phoneField.value.trim(),
      service: (document.getElementById('service').value || '').trim(),
      message: (document.getElementById('message').value || '').trim(),
      createdAt: fb.FieldValue.serverTimestamp()
    }).catch((error) => {
      console.error('ZANDF: could not save message to Firestore:', error);
    });
  };

  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    // Warm the EmailJS script as the contact section scrolls into view.
    if ('IntersectionObserver' in window) {
      const warmupObserver = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          loadEmailJS().catch(() => {});
          warmupObserver.disconnect();
        }
      }, { rootMargin: '600px 0px' });
      warmupObserver.observe(contactForm.closest('section') || contactForm);
    }
    contactForm.addEventListener('focusin', () => { loadEmailJS().catch(() => {}); });
    const formStatus = document.getElementById('formStatus');
    const submitBtn = document.getElementById('contact-submit');
    const submitBtnText = submitBtn.querySelector('.btn-text');

    const emailField = document.getElementById('from_email');
    const phoneField = document.getElementById('phone');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^(?:\+?20|0020|0)?1[0125][0-9]{8}$/;

    const setFieldError = (field, message) => {
      const group = field.closest('.form-group');
      group.classList.toggle('invalid', !!message);
      if (message) {
        formStatus.textContent = message;
        formStatus.className = 'form-status error';
        formStatus.dataset.field = field.id;
      }
    };

    const clearFieldError = (field) => {
      field.closest('.form-group').classList.remove('invalid');
      if (formStatus.dataset.field === field.id) {
        formStatus.textContent = '';
        formStatus.className = 'form-status';
        delete formStatus.dataset.field;
      }
    };

    [emailField, phoneField].forEach((field) => {
      field.addEventListener('input', () => clearFieldError(field));
    });

    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();

      formStatus.textContent = '';
      formStatus.className = 'form-status';

      const email = emailField.value.trim();
      const phone = phoneField.value.trim().replace(/[\s()-]/g, '');

      let firstInvalid = null;

      if (!emailRegex.test(email)) {
        setFieldError(emailField, 'Please enter a valid email address (e.g. name@company.com).');
        firstInvalid = emailField;
      } else {
        clearFieldError(emailField);
      }

      if (phone !== '' && !phoneRegex.test(phone)) {
        setFieldError(phoneField, 'Please enter a valid phone number (e.g. 01223285381 or +20 122 328 5381).');
        firstInvalid = firstInvalid || phoneField;
      } else {
        clearFieldError(phoneField);
      }

      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }

      submitBtn.disabled = true;
      submitBtnText.textContent = 'Sending...';

      loadEmailJS()
        .then(() => emailjs.sendForm(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, contactForm))
        .then(() => saveMessageToFirestore())
        .then(() => {
          formStatus.textContent = 'Thanks! Your message has been sent — we\'ll be in touch soon.';
          formStatus.classList.add('success');
          contactForm.reset();
        })
        .catch((error) => {
          formStatus.textContent = 'Something went wrong. Please try again or email us directly.';
          formStatus.classList.add('error');
          console.error('EmailJS error:', error);
        })
        .finally(() => {
          submitBtn.disabled = false;
          submitBtnText.textContent = 'Send Message';
        });
    });
  }
  // ——— Year auto-update ———
  const yearEl = document.querySelector('.footer-bottom p');
  if (yearEl) {
    yearEl.innerHTML = yearEl.innerHTML.replace('2026', new Date().getFullYear());
  }

});
