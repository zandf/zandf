/* ============================================
   ZANDF — Content Loader
   Applies the site content saved from admin.html
   (stored in Firestore, collection "content", doc "site",
   with a localStorage fallback) onto index.html.
   Include this BEFORE js/site.js, after js/firebase.js.
   ============================================ */

(function () {
  const CONTENT_KEY = 'zandf_content';
  const CONTENT_DOC = 'site';

  function readLocalContent() {
    const raw = localStorage.getItem(CONTENT_KEY);
    if (!raw) return null;
    try {
      return migrate(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  // One-time migrations for older saved content.
  function migrate(content) {
    if (content.contact && content.contact.email === 'arkal10293@gmail.com') {
      content.contact.email = 'zandf211@gmail.com';
    }
    // Legacy image paths (project screenshots lived in assets/ before the
    // repo was reorganized into images/). Rewrite them so old saves still load.
    if (Array.isArray(content.projects)) {
      for (const p of content.projects) {
        if (p && typeof p.image === 'string') {
          p.image = p.image.replace(/^assets\//, 'images/');
        }
      }
    }
    return content;
  }

  function setText(id, value) {
    if (value === undefined || value === null || value === '') return;
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function escapeAttr(str = '') {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // Only allow safe URL schemes (blocks javascript:, data:, vbscript:, ...)
  // and same-origin relative paths. Everything else renders as "".
  function safeUrl(url) {
    const s = String(url == null ? '' : url).trim();
    if (!s) return '';
    const m = s.match(/^([a-z][a-z0-9+.-]*):/i);
    if (!m) return s; // no scheme -> relative link, safe
    const scheme = m[1].toLowerCase();
    return (scheme === 'http' || scheme === 'https' || scheme === 'mailto' || scheme === 'tel') ? s : '';
  }

  // Hero stats are stored as plain numbers in the dashboard; display them with
  // a "+" suffix (already-suffixed values pass through unchanged).
  function formatStat(value) {
    const v = String(value == null ? '' : value).trim();
    if (v === '') return v;
    return /[+\-%]/.test(v.slice(-1)) ? v : v + '+';
  }

  // Feather-style service icons (mirrors the map in dashboard.js).
  const SERVICE_ICONS = {
    store: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/><path d="M16 11V6a4 4 0 0 0-8 0v5"/>',
    layout: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>',
    monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M7 8h2M7 12h6"/>',
    menu: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="14" y2="11"/><line x1="8" y1="15" x2="12" y2="15"/>',
    code: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
    rocket: '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>',
    database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>',
    cpu: '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    globe: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>'
  };

  const SERVICE_ICON_BY_TITLE = {
    'Web Store': 'store',
    'Landing Page': 'layout',
    'Web System': 'monitor',
    'Menu': 'menu'
  };

  function serviceIconSVG(key) {
    const inner = SERVICE_ICONS[key] || SERVICE_ICONS.code;
    return `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
  }

  // Single-element rating stars: the .testimonial-stars element keeps its
  // static ★★★★★ content, and --rating-pct controls the gold/gray split.
  function applyRating(starsEl, rating) {
    const r = Math.max(0, Math.min(5, Number(rating) || 0));
    starsEl.style.setProperty('--rating-pct', `${(r / 5) * 100}%`);
  }

  // Inject f_auto (best format: WebP/AVIF) + q_auto (optimal quality) into a
  // Cloudinary image URL. Non-Cloudinary URLs are returned unchanged.
  function cloudinaryUrl(url = '') {
    const s = String(url).trim();
    if (!/res\.cloudinary\.com\/[^/]+\/image\/upload\//i.test(s)) return s;
    if (/\/(?:f_auto|q_auto)[,/]/.test(s)) return s; // already transformed
    return s.replace(/\/image\/upload\//i, '/image/upload/f_auto,q_auto/');
  }

  function socialIcon(label = '') {
    const name = label.trim().toLowerCase();
    const paths = {
      facebook: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
      instagram: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z',
      x: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
      twitter: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
      linkedin: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
      youtube: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
      whatsapp: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z',
      tiktok: 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z',
      telegram: 'M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z',
      github: 'M12 0C5.37 0 0 5.373 0 12c0 5.302 3.438 9.8 8.205 11.387.6.113.82-.26.82-.577 0-.285-.01-1.04-.015-2.04-3.338.726-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.082-.73.082-.73 1.205.085 1.84 1.238 1.84 1.238 1.07 1.834 2.807 1.304 3.492.997.108-.775.418-1.305.762-1.605-2.665-.305-5.466-1.332-5.466-5.93 0-1.31.468-2.38 1.235-3.22-.123-.303-.535-1.523.117-3.176 0 0 1.008-.322 3.3 1.23a11.5 11.5 0 0 1 3.003-.404c1.02.005 2.047.138 3.006.404 2.29-1.552 3.297-1.23 3.297-1.23.653 1.653.24 2.873.118 3.176.77.84 1.233 1.91 1.233 3.22 0 4.61-2.804 5.62-5.476 5.92.43.37.812 1.102.812 2.222 0 1.606-.015 2.898-.015 3.293 0 .32.216.694.825.576C20.565 21.796 24 17.3 24 12c0-6.627-5.373-12-12-12z',
      generic: 'M10.59 13.41c.41.39.41 1.03 0 1.42-.39.39-1.03.39-1.42 0a5.003 5.003 0 0 1 0-7.07l3.54-3.54a5.003 5.003 0 0 1 7.07 0 5.003 5.003 0 0 1 0 7.07l-1.49 1.49c.01-.82-.12-1.64-.4-2.42l.47-.48a2.982 2.982 0 0 0 0-4.24 2.982 2.982 0 0 0-4.24 0l-3.53 3.53a2.982 2.982 0 0 0 0 4.24zm2.82-4.24c.39-.39 1.03-.39 1.42 0a5.003 5.003 0 0 1 0 7.07l-3.54 3.54a5.003 5.003 0 0 1-7.07 0 5.003 5.003 0 0 1 0-7.07l1.49-1.49c-.01.82.12 1.64.4 2.43l-.47.47a2.982 2.982 0 0 0 0 4.24 2.982 2.982 0 0 0 4.24 0l3.53-3.53a2.982 2.982 0 0 0 0-4.24.973.973 0 0 1 0-1.42z'
    };
    const d = paths[name] || paths.generic;
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${d}"/></svg>`;
  }

  function applyContent(rawContent) {
    const content = migrate(rawContent || {});
    if (content.hero) {
      setText('hero-gradient-text', content.hero.gradientText);
      setText('hero-description', content.hero.description);
      setText('stat-projects', formatStat(content.hero.statProjects));
      setText('stat-clients', formatStat(content.hero.statClients));
      setText('stat-years', formatStat(content.hero.statYears));
    }

    // About
    if (content.about) {
      setText('about-gradient-text', content.about.gradientText);
      setText('about-subtitle', content.about.subtitle);
    }

    // Services — update existing cards, hide leftovers, clone the first
    // card as a template for any extra services.
    if (Array.isArray(content.services)) {
      const grid = document.querySelector('.services-grid');
      if (grid) {
        const cards = Array.from(grid.querySelectorAll('.service-card'));
        const fillCard = (card, data, i) => {
          card.style.display = data ? '' : 'none';
          if (!data) return;
          const h3 = card.querySelector('h3');
          const p = card.querySelector('p');
          const num = card.querySelector('.service-number');
          const iconEl = card.querySelector('.service-icon');
          if (h3 && data.title) h3.textContent = data.title;
          if (p && data.desc) p.textContent = data.desc;
          if (num) num.textContent = String(i + 1).padStart(2, '0');
          if (iconEl && (data.icon || SERVICE_ICON_BY_TITLE[data.title])) {
            iconEl.innerHTML = serviceIconSVG(data.icon || SERVICE_ICON_BY_TITLE[data.title]);
          }
        };

        cards.forEach((card, i) => fillCard(card, content.services[i], i));

        for (let i = cards.length; i < content.services.length; i++) {
          const clone = cards[0].cloneNode(true);
          clone.removeAttribute('id');
          fillCard(clone, content.services[i], i);
          grid.appendChild(clone);
        }
      }
    }

    // Testimonials — same strategy: update, hide leftovers, clone extras.
    if (Array.isArray(content.testimonials)) {
      const grid = document.querySelector('.testimonials-grid');
      if (grid) {
        const cards = Array.from(grid.querySelectorAll('.testimonial-card'));
        const fillCard = (card, data, i) => {
          card.style.display = data ? '' : 'none';
          if (!data) return;
          const text = card.querySelector('.testimonial-text');
          const author = card.querySelector('.testimonial-info h4');
          const role = card.querySelector('.testimonial-info p');
          const avatar = card.querySelector('.testimonial-avatar');
          const stars = card.querySelector('.testimonial-stars');
          if (stars) applyRating(stars, data.rating);
          if (text && data.text) text.textContent = `"${data.text}"`;
          if (author && data.author) author.textContent = data.author;
          if (role && data.role) role.textContent = data.role;
          if (avatar && data.author) {
            avatar.textContent = data.author.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
          }
        };

        cards.forEach((card, i) => fillCard(card, content.testimonials[i], i));

        for (let i = cards.length; i < content.testimonials.length; i++) {
          const clone = cards[0].cloneNode(true);
          clone.removeAttribute('id');
          fillCard(clone, content.testimonials[i], i);
          grid.appendChild(clone);
        }
      }
    }

    // Portfolio projects — update existing cards, hide leftovers, clone extras.
    if (Array.isArray(content.projects)) {
      const grid = document.querySelector('.portfolio-grid');
      if (grid) {
        const items = Array.from(grid.children); // each child is an <a> wrapping a .portfolio-card
        const fillItem = (anchor, data, i) => {
          anchor.style.display = data ? '' : 'none';
          if (!data) return;
          const card = anchor.querySelector('.portfolio-card');
          if (!card) return;

          if (data.url) {
            const safe = safeUrl(data.url);
            if (safe) {
              anchor.setAttribute('href', escapeAttr(safe));
              anchor.setAttribute('target', '_blank');
              anchor.setAttribute('rel', 'noopener noreferrer');
            }
          }

          const img = card.querySelector('img');
          if (img) {
            img.style.display = data.image ? '' : 'none';
            if (data.image) {
              img.src = cloudinaryUrl(data.image);
              img.alt = `${data.title || 'ZANDF project'} — project by ZANDF`;
            }
          }

          const tag = card.querySelector('.portfolio-tag');
          if (tag) tag.textContent = data.tag || '';

          const h3 = card.querySelector('h3');
          if (h3 && data.title) h3.textContent = data.title;

          const p = card.querySelector('.portfolio-overlay p');
          if (p && data.desc) p.textContent = data.desc;

          card.className = card.className.replace(/reveal-delay-\d/, `reveal-delay-${(i % 3) + 1}`);
        };

        items.forEach((anchor, i) => fillItem(anchor, content.projects[i], i));

        for (let i = items.length; i < content.projects.length; i++) {
          const clone = items[0].cloneNode(true);
          fillItem(clone, content.projects[i], i);
          grid.appendChild(clone);
        }
      }
    }

    // Contact info
    if (content.contact) {
      const emailLink = document.getElementById('cta-email');
      const phoneLink = document.getElementById('cta-phone');
      if (emailLink && content.contact.email) {
        emailLink.href = `mailto:${content.contact.email}`;
        // keep the icon, replace only the trailing text node
        emailLink.childNodes[emailLink.childNodes.length - 1].textContent = ' ' + content.contact.email;
      }
      if (phoneLink && content.contact.phone) {
        phoneLink.href = `tel:${content.contact.phone.replace(/\s+/g, '')}`;
        phoneLink.childNodes[phoneLink.childNodes.length - 1].textContent = ' ' + content.contact.phone;
      }
    }

    // Footer social links — rebuild from saved data (fall back to defaults).
    if (Array.isArray(content.socials)) {
      const wrap = document.querySelector('.footer-socials');
      if (wrap) {
        const socials = content.socials
          .filter(s => s && safeUrl(s.url))
          .map(s => ({
            label: (s.label || '').trim() || 'Social link',
            url: safeUrl(s.url)
          }));
        wrap.style.display = socials.length ? '' : 'none';
        wrap.innerHTML = socials.map(s => `
          <a href="${escapeAttr(s.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeAttr(s.label)}"
            title="${escapeAttr(s.label)}">${socialIcon(s.label)}</a>
        `).join('');
      }
    }
  }

  // Apply saved content once the DOM is ready. Source of truth is Firestore
  // (content/<CONTENT_DOC>); falls back to the localStorage cache.
  document.addEventListener('DOMContentLoaded', () => {
    const local = readLocalContent();
    const fb = window.ZANDF_FIREBASE;

    if (fb && fb.db) {
      fb.db.collection('content').doc(CONTENT_DOC).get()
        .then((snap) => {
          if (snap.exists) {
            applyContent(migrate(snap.data()));
          } else if (local) {
            applyContent(local);
          }
        })
        .catch((err) => {
          console.error('ZANDF: could not load content from Firestore:', err);
          if (local) applyContent(local);
        });
    } else if (local) {
      applyContent(local);
    }
  });
})();
