/* ============================================
   ZANDF Admin — Login & Dashboard Logic
   ============================================

   Authentication is handled by Firebase Auth (email/password).
   The login is verified by Firebase — credentials never exist in
   this file. The dashboard content is stored in Firestore
   (collection "content", doc "site") and cached in localStorage
   for offline/fallback use. See firestore.rules for the
   read/write security rules.
   ============================================ */

const AUTH_KEY = 'zandf_admin_session';
const AUTH_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

const CONTENT_KEY = 'zandf_content';
const CONTENT_DOC = 'site'; // Firestore doc id inside the "content" collection

const POLICY_KEY = 'zandf_policy';
const POLICY_DOC = 'policy'; // Firestore doc id inside the "content" collection

/* Social platforms offered in the dashboard dropdown (must match the icon
   names supported in content-loader.js). */
const SOCIAL_PLATFORMS = ['Facebook', 'Instagram', 'X', 'LinkedIn', 'YouTube', 'WhatsApp', 'TikTok', 'Telegram', 'GitHub'];

/* Base URL auto-filled when a platform is chosen — the admin just types the
   username/handle (or clears the field and pastes a full link). */
const SOCIAL_URL_BASES = {
  'Facebook': 'https://www.facebook.com/share/',
  'Instagram': 'https://www.instagram.com/',
  'X': 'https://x.com/',
  'LinkedIn': 'https://www.linkedin.com/in/',
  'YouTube': 'https://www.youtube.com/@',
  'WhatsApp': 'https://wa.me/',
  'TikTok': 'https://www.tiktok.com/@',
  'Telegram': 'https://t.me/',
  'GitHub': 'https://github.com/'
};

/* Feather-style service icons (stroke SVG inner markup). Keys are stored on
   each service; content-loader.js mirrors this map to render the icons. */
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

const SERVICE_ICON_OPTIONS = ['store', 'layout', 'monitor', 'menu', 'code', 'rocket', 'database', 'cpu', 'shield', 'settings', 'message', 'globe'];

const SERVICE_ICON_LABELS = {
  store: 'Shopping cart', layout: 'Landing page', monitor: 'Web system', menu: 'Book menu',
  code: 'Code', rocket: 'Rocket', database: 'Database', cpu: 'CPU / chip',
  shield: 'Shield', settings: 'Settings', message: 'Message', globe: 'Globe'
};

/* Map default service titles to their original icons (used when old saved data
   has no icon field). */
const SERVICE_ICON_BY_TITLE = {
  'Web Store': 'store',
  'Landing Page': 'layout',
  'Web System': 'monitor',
  'Menu': 'menu'
};

/* Deep-clone the defaults (structuredClone is unsupported in some older browsers). */
function cloneDefaults() {
  return JSON.parse(JSON.stringify(DEFAULT_CONTENT));
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/* Default content mirrors what's currently hardcoded in index.html.
   Used when nothing is saved yet, and content-loader.js falls back to them
   if there's no saved content. */
const DEFAULT_CONTENT = {
  hero: {
    gradientText: 'Digital Experiences',
    description: "ZANDF delivers premium web solutions — from stunning websites to powerful applications — engineered with precision, designed with passion.",
    statProjects: '150',
    statClients: '80',
    statYears: '8'
  },
  about: {
    gradientText: 'Excellence',
    subtitle: "ZANDF is a forward-thinking web solutions agency dedicated to transforming ideas into powerful digital realities. We combine creativity, engineering rigor, and deep industry insight."
  },
  services: [
    { title: 'Web Store', desc: 'Full-featured online shops with secure checkout, product catalogs, and inventory tools — built to convert visitors into loyal customers.', icon: 'store' },
    { title: 'Landing Page', desc: 'High-impact single-page experiences designed to capture attention, communicate your value, and drive sign-ups, sales, or leads.', icon: 'layout' },
    { title: 'Web System', desc: 'Custom dashboards, admin panels, and business platforms that streamline operations and scale with your workflow.', icon: 'monitor' },
    { title: 'Menu', desc: "Beautiful digital menus for restaurants and cafés — easy to browse, mobile-friendly, and ready for WhatsApp or online ordering.", icon: 'menu' }
  ],
  projects: [
    { title: 'alban-amer', tag: 'Web Store', desc: 'A premium online marketplace built for a smooth shopping experience.', url: 'https://alban-amer-nu.vercel.app', image: 'images/alban-amer.webp' },
    { title: 'Casablanca Menu', tag: 'Menu', desc: "A premium digital menu for Minya's favorite pizza & grill — browse dishes, order online, and explore offers in Arabic and English.", url: 'https://casablanca-850e5.web.app/index.html', image: 'images/casablanca.webp' }
  ],
  testimonials: [
    { text: 'ZANDF transformed our outdated website into a modern, high-converting platform. Sales increased by 180% within the first quarter after launch.', author: 'Ahmed Khalil', role: 'CEO, TechVentures Inc.', rating: 5 },
    { text: 'Their team delivered our complex dashboard application on time and under budget. The attention to detail and code quality was exceptional.', author: 'Sara Hassan', role: 'CTO, DataStream Analytics', rating: 5 },
    { text: 'Working with ZANDF was a game-changer for our startup. They understood our vision and built a product that exceeded every expectation.', author: 'Mohamed Rami', role: 'Founder, FinFlow', rating: 5 }
  ],
  socials: [
    { label: 'Facebook', url: 'https://www.facebook.com/share/1cDTvYUpmY/' },
    { label: 'Instagram', url: 'https://www.instagram.com/zandf.1?utm_source=qr' }
  ],
  contact: {
    email: 'zandf211@gmail.com',
    phone: '01223285381'
  }
};

/* Default privacy-policy content. Mirrors the built-in defaults in policy.js
   and is used when nothing has been saved yet. */
const DEFAULT_POLICY = {
  title: 'Privacy Policy',
  intro: 'This Privacy Policy explains how ZANDF Web Solutions & Development collects, uses, and protects your information when you visit our website or use our services.',
  updatedAt: 'August 2026',
  sections: [
    {
      heading: 'Information We Collect',
      body: 'We collect information you provide through our contact form, such as your name, email address, phone number, and project details. We also collect standard usage data — like pages visited, device type, and browser — through analytics.'
    },
    {
      heading: 'How We Use Your Information',
      body: 'We use your information to respond to inquiries, deliver our services, improve our website, and communicate with you about projects. We never sell your personal data to third parties.'
    },
    {
      heading: 'Cookies & Analytics',
      body: 'Our website uses analytics services and local storage to understand how visitors use the site and to improve performance. You can disable cookies through your browser settings at any time.'
    },
    {
      heading: 'Data Security',
      body: 'We take reasonable measures to protect your information, including secure hosting and restricted access. However, no method of transmission over the internet is completely secure, and we cannot guarantee absolute security.'
    },
    {
      heading: 'Third-Party Services',
      body: 'We rely on trusted providers for email delivery, image hosting, and analytics. These providers process data in accordance with their own privacy policies.'
    },
    {
      heading: 'Your Rights',
      body: 'You may request access to, correction of, or deletion of your personal information at any time. To exercise these rights, simply contact us and we will respond promptly.'
    },
    {
      heading: 'Contact Us',
      body: 'If you have any questions about this Privacy Policy or how we handle your data, reach out to us at zandf211@gmail.com.'
    }
  ]
};

/* ---------- Auth helpers (shared by login.html & admin.html) ---------- */

/* The admin gate is client-side convenience only — Firestore rules
   (firestore.rules) are the real enforcement and require the admin
   email. The session flag below just avoids re-prompting the
   password; the dashboard also re-checks the live Firebase session. */

function getAdminEmail() {
  const fb = window.ZANDF_FIREBASE;
  return (fb && fb.adminEmail ? fb.adminEmail : '').toLowerCase();
}

function isAuthenticated() {
  const email = getAdminEmail();
  if (!email) return false;
  const raw = sessionStorage.getItem(AUTH_KEY);
  if (!raw) return false;
  try {
    const { expires, email: sessionEmail } = JSON.parse(raw);
    if (Date.now() > expires) {
      sessionStorage.removeItem(AUTH_KEY);
      return false;
    }
    // Session must be tied to the admin email, not just "signed in".
    if (String(sessionEmail || '').toLowerCase() !== email) {
      sessionStorage.removeItem(AUTH_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function setAuthenticated() {
  const email = getAdminEmail();
  sessionStorage.setItem(AUTH_KEY, JSON.stringify({ email, expires: Date.now() + AUTH_TTL_MS }));
}

function clearAuthenticated() {
  sessionStorage.removeItem(AUTH_KEY);
}

/* True when the current Firebase user is the admin account.
   Used to re-validate the live session on the dashboard (defense in
   depth against a forged session flag). */
function isAdminUser(user) {
  if (!user || !user.email) return false;
  const email = getAdminEmail();
  return email !== '' && user.email.toLowerCase() === email;
}

/* ---------- Content storage helpers ---------- */

/* Normalize raw saved data (from Firestore or localStorage) against the
   defaults so older data won't break new fields. */
function normalizeContent(parsed) {
  const stripStat = (v) => String(v == null ? '' : v).trim().replace(/\+$/, '');
  const stat = (v) => stripStat(v) || DEFAULT_CONTENT.hero.statProjects;
  const hero = {
    ...DEFAULT_CONTENT.hero,
    ...(parsed.hero || {}),
    statProjects: stat(parsed.hero && parsed.hero.statProjects),
    statClients: stat(parsed.hero && parsed.hero.statClients),
    statYears: stat(parsed.hero && parsed.hero.statYears)
  };
  return {
    hero,
    about: { ...DEFAULT_CONTENT.about, ...(parsed.about || {}) },
    services: Array.isArray(parsed.services)
      ? parsed.services.map((s) => ({ ...s, icon: s.icon || SERVICE_ICON_BY_TITLE[s.title] || 'code' }))
      : cloneDefaults().services,
    projects: Array.isArray(parsed.projects) ? parsed.projects : cloneDefaults().projects,
    testimonials: Array.isArray(parsed.testimonials)
      ? parsed.testimonials.map((t) => ({ rating: 5, ...t }))
      : cloneDefaults().testimonials,
    socials: Array.isArray(parsed.socials) ? parsed.socials : cloneDefaults().socials,
    contact: { ...DEFAULT_CONTENT.contact, ...(parsed.contact || {}) }
  };
}

function readLocalContent() {
  const raw = localStorage.getItem(CONTENT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    // One-time migration: legacy contact email -> current default
    if (parsed.contact && parsed.contact.email === 'arkal10293@gmail.com') {
      parsed.contact.email = DEFAULT_CONTENT.contact.email;
      localStorage.setItem(CONTENT_KEY, JSON.stringify(parsed));
    }
    return parsed;
  } catch {
    return null;
  }
}

/* Load site content. Source of truth is Firestore (content/<CONTENT_DOC>);
   falls back to the localStorage cache, then to defaults. If the browser has
   local content but Firestore is empty, push the local copy up once. */
async function loadContent() {
  const fb = window.ZANDF_FIREBASE;
  const local = readLocalContent();

  if (fb && fb.db) {
    try {
      const snap = await fb.db.collection('content').doc(CONTENT_DOC).get();
      if (snap.exists) {
        return normalizeContent(snap.data());
      }
      if (local) {
        // Seed Firestore from the browser cache (one-time migration).
        const seeded = normalizeContent(local);
        await fb.db.collection('content').doc(CONTENT_DOC).set(deepClone(seeded));
        return seeded;
      }
    } catch (err) {
      console.error('ZANDF: could not load content from Firestore:', err);
    }
  }

  return normalizeContent(local || cloneDefaults());
}

/* Save site content to Firestore and to the localStorage cache.
   Throws if the Firestore write is rejected, so the UI can surface the error. */
async function saveContent(content) {
  localStorage.setItem(CONTENT_KEY, JSON.stringify(content));
  const fb = window.ZANDF_FIREBASE;
  if (fb && fb.db) {
    await fb.db.collection('content').doc(CONTENT_DOC).set(deepClone(content));
  }
}

/* ---------- Policy storage helpers ---------- */

function normalizePolicy(parsed) {
  const p = parsed && typeof parsed === 'object' ? parsed : {};
  return {
    title: (p.title || DEFAULT_POLICY.title).toString(),
    intro: (p.intro || DEFAULT_POLICY.intro).toString(),
    updatedAt: (p.updatedAt || DEFAULT_POLICY.updatedAt).toString(),
    sections: Array.isArray(p.sections)
      ? p.sections.map((s) => ({
        heading: ((s && s.heading) || '').toString(),
        body: ((s && s.body) || '').toString()
      }))
      : deepClone(DEFAULT_POLICY.sections)
  };
}

function readLocalPolicy() {
  const raw = localStorage.getItem(POLICY_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/* Load the privacy policy. Source of truth is Firestore (content/<POLICY_DOC>);
   falls back to the localStorage cache, then to defaults. Seeds Firestore from
   the cache when the doc is missing. */
async function loadPolicy() {
  const fb = window.ZANDF_FIREBASE;
  const local = readLocalPolicy();

  if (fb && fb.db) {
    try {
      const snap = await fb.db.collection('content').doc(POLICY_DOC).get();
      if (snap.exists) {
        return normalizePolicy(snap.data());
      }
      if (local) {
        const seeded = normalizePolicy(local);
        await fb.db.collection('content').doc(POLICY_DOC).set(deepClone(seeded));
        return seeded;
      }
    } catch (err) {
      console.error('ZANDF: could not load policy from Firestore:', err);
    }
  }

  return normalizePolicy(local || DEFAULT_POLICY);
}

/* Save the privacy policy to Firestore and to the localStorage cache. */
async function savePolicy(policy) {
  localStorage.setItem(POLICY_KEY, JSON.stringify(policy));
  const fb = window.ZANDF_FIREBASE;
  if (fb && fb.db) {
    await fb.db.collection('content').doc(POLICY_DOC).set(deepClone(policy));
  }
}

/* Undo history: keeps the last few saved versions so "Undo" can restore the
   state that existed before the most recent "Save Changes" click. */
const HISTORY_KEY = 'zandf_content_history';
const HISTORY_MAX = 5;

function loadHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-HISTORY_MAX)));
}

/* ============================================
   LOGIN PAGE LOGIC
   ============================================ */

function initLoginPage() {
  const form = document.getElementById('loginForm');
  if (!form) return; // not on the login page

  // Already logged in? Skip straight to the dashboard.
  if (isAuthenticated()) {
          window.location.href = 'admin.html';
    return;
  }

  const statusEl = document.getElementById('loginStatus');
  const submitBtn = document.getElementById('loginSubmit');
  const pwInput = document.getElementById('password');
  const toggleBtn = document.getElementById('togglePw');

  toggleBtn.addEventListener('click', () => {
    const isPw = pwInput.type === 'password';
    pwInput.type = isPw ? 'text' : 'password';
    toggleBtn.innerHTML = isPw
      ? '<i class="fa-solid fa-eye-slash"></i>'
      : '<i class="fa-solid fa-eye"></i>';
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = pwInput.value;

    statusEl.textContent = '';
    statusEl.className = 'login-status';

    const fb = window.ZANDF_FIREBASE;
    if (!fb || !fb.auth) {
      statusEl.textContent =
        'Firebase is not configured. Set FIREBASE_* in .env and run "node scripts/build-config.js".';
      statusEl.classList.add('error');
      return;
    }

    submitBtn.disabled = true;
    statusEl.textContent = 'Signing in…';

    fb.auth.signInWithEmailAndPassword(email, password)
      .then((cred) => {
        const userEmail = ((cred.user && cred.user.email) || '').toLowerCase();
        if (fb.adminEmail && userEmail !== fb.adminEmail.toLowerCase()) {
          throw new Error('This account is not an authorized admin.');
        }
        statusEl.textContent = 'Signed in. Redirecting…';
        statusEl.classList.add('success');
        setAuthenticated();
        setTimeout(() => {
    window.location.href = 'admin.html';
        }, 400);
      })
      .catch((error) => {
        const code = error.code || '';
        const badCreds = /wrong-password|user-not-found|invalid-credential|invalid-login-credentials/i.test(code);
        statusEl.textContent = badCreds
          ? 'Incorrect email or password.'
          : (error.message || 'Sign in failed. Please try again.');
        statusEl.classList.add('error');
        form.classList.remove('shake');
        void form.offsetWidth; // restart animation
        form.classList.add('shake');
      })
      .finally(() => {
        submitBtn.disabled = false;
      });
  });
}

/* ============================================
   DASHBOARD PAGE LOGIC
   ============================================ */

async function initDashboardPage() {
  const app = document.getElementById('dashboardApp');
  const gate = document.getElementById('authGate');
  if (!app) return; // not on the dashboard page

  const fb = window.ZANDF_FIREBASE;

  // Re-validate the live Firebase session, not just the session flag.
  // currentUser may restore asynchronously, so wait for onAuthStateChanged.
  const user = await new Promise((resolve) => {
    if (!(fb && fb.auth)) return resolve(null);
    const current = fb.auth.currentUser;
    if (current) return resolve(current);
    const unsub = fb.auth.onAuthStateChanged(
      (u) => { unsub(); resolve(u); },
      () => { unsub(); resolve(null); }
    );
  });

  if (!isAdminUser(user)) {
    clearAuthenticated();
    window.location.href = 'login.html';
    return;
  }

  gate.hidden = true;
  app.hidden = false;

  let content = await loadContent();
  let policy = await loadPolicy();

  // ---- Panel switching ----
  const panelInfo = {
    'panel-hero': { title: 'Hero Section', desc: 'Edit the headline visitors see first.' },
    'panel-about': { title: 'About Section', desc: 'Tell visitors who ZANDF is.' },
    'panel-services': { title: 'Services', desc: 'Add, edit, reorder, or remove the service cards.' },
    'panel-projects': { title: 'Projects', desc: 'Add, edit, reorder, or remove portfolio projects and their images.' },
    'panel-testimonials': { title: 'Testimonials', desc: 'Add, edit, reorder, or remove client reviews and their ratings.' },
    'panel-contact': { title: 'Contact Info', desc: 'Update the email and phone shown to visitors.' },
    'panel-socials': { title: 'Social Links', desc: 'Add, edit, reorder, or remove the social links in the footer.' },
    'panel-policy': { title: 'Privacy Policy', desc: 'Edit the policy page title, intro, and sections.' }
  };

  const sidebarLinks = document.querySelectorAll('.sidebar-link');
  sidebarLinks.forEach(link => {
    link.addEventListener('click', () => {
      const targetId = link.dataset.panel;
      sidebarLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      document.getElementById(targetId).classList.add('active');
      document.getElementById('panelTitle').textContent = panelInfo[targetId].title;
      document.getElementById('panelDesc').textContent = panelInfo[targetId].desc;
    });
  });

  function serviceIconSVG(key) {
    const inner = SERVICE_ICONS[key] || SERVICE_ICONS.code;
    return `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
  }

  // ---- Render repeatable fields (services / testimonials) ----
  function renderServiceFields() {
    const wrap = document.getElementById('servicesFields');
    wrap.innerHTML = content.services.map((s, i) => `
      <div class="repeat-card" data-index="${i}">
        <div class="repeat-card-header">
          <p class="repeat-card-title">Service ${i + 1}</p>
          <div class="repeat-card-actions">
            <button type="button" class="icon-btn" data-action="move" data-dir="-1" title="Move up" ${i === 0 ? 'disabled' : ''}><i class="fa-solid fa-chevron-up"></i></button>
            <button type="button" class="icon-btn" data-action="move" data-dir="1" title="Move down" ${i === content.services.length - 1 ? 'disabled' : ''}><i class="fa-solid fa-chevron-down"></i></button>
            <button type="button" class="icon-btn danger" data-action="delete" title="Delete service"><i class="fa-solid fa-trash-can"></i></button>
          </div>
        </div>
        <div class="field-row" style="grid-template-columns:auto 1fr 2fr;">
          <div class="field-group" style="margin-bottom:0">
            <label>Preview</label>
            <div class="icon-preview" id="service_${i}_iconPreview" title="${escapeAttr(SERVICE_ICON_LABELS[s.icon] || s.icon)}">${serviceIconSVG(s.icon)}</div>
          </div>
          <div class="field-group" style="margin-bottom:0">
            <label for="service_${i}_icon">Icon</label>
            <select id="service_${i}_icon">
              ${SERVICE_ICON_OPTIONS.map(key => `
                <option value="${key}"${s.icon === key ? ' selected' : ''}>${SERVICE_ICON_LABELS[key]}</option>
              `).join('')}
            </select>
          </div>
          <div class="field-group" style="margin-bottom:0">
            <label for="service_${i}_title">Title</label>
            <input type="text" id="service_${i}_title" maxlength="40" value="${escapeAttr(s.title)}">
          </div>
        </div>
        <div class="field-group" style="margin-bottom:0">
          <label for="service_${i}_desc">Description</label>
          <textarea id="service_${i}_desc" rows="3" maxlength="220">${escapeHtml(s.desc)}</textarea>
        </div>
      </div>
    `).join('');
    updateCounts();
  }

  function renderTestimonialFields() {
    const wrap = document.getElementById('testimonialsFields');
    wrap.innerHTML = content.testimonials.map((t, i) => `
      <div class="repeat-card" data-index="${i}">
        <div class="repeat-card-header">
          <p class="repeat-card-title">Testimonial ${i + 1}</p>
          <div class="repeat-card-actions">
            <button type="button" class="icon-btn" data-action="move" data-dir="-1" title="Move up" ${i === 0 ? 'disabled' : ''}><i class="fa-solid fa-chevron-up"></i></button>
            <button type="button" class="icon-btn" data-action="move" data-dir="1" title="Move down" ${i === content.testimonials.length - 1 ? 'disabled' : ''}><i class="fa-solid fa-chevron-down"></i></button>
            <button type="button" class="icon-btn danger" data-action="delete" title="Delete testimonial"><i class="fa-solid fa-trash-can"></i></button>
          </div>
        </div>
        <div class="field-group">
          <label for="testi_${i}_text">Quote</label>
          <textarea id="testi_${i}_text" rows="3" maxlength="260">${escapeHtml(t.text)}</textarea>
        </div>
        <div class="field-row" style="grid-template-columns:1fr 1fr;">
          <div class="field-group" style="margin-bottom:0">
            <label for="testi_${i}_author">Author name</label>
            <input type="text" id="testi_${i}_author" maxlength="40" value="${escapeAttr(t.author)}">
          </div>
          <div class="field-group" style="margin-bottom:0">
            <label for="testi_${i}_role">Author role / company</label>
            <input type="text" id="testi_${i}_role" maxlength="50" value="${escapeAttr(t.role)}">
          </div>
        </div>
        <div class="field-group" style="margin-bottom:0">
          <label for="testi_${i}_rating">Rating</label>
          ${ratingPickerHTML(`testi_${i}_rating`, t.rating)}
        </div>
      </div>
    `).join('');
    updateCounts();
  }

  function ratingPickerHTML(id, rating = 5) {
    const r = Math.max(0, Math.min(5, Number(rating) || 0));
    const pct = (r / 5) * 100;
    return `
      <div class="rating-picker" id="${id}" data-rating="${r}">
        <div class="rating-picker-stars" style="--rating-pct:${pct}%">&#9733;&#65038;&#9733;&#65038;&#9733;&#65038;&#9733;&#65038;&#9733;&#65038;<span class="rating-picker-hit">${Array.from({ length: 10 }, (_, j) =>
          `<button type="button" data-half="${j + 1}" tabindex="-1" aria-label="${(j + 1) / 2} out of 5 stars" title="${(j + 1) / 2} / 5"></button>`).join('')}</span>
        </div>
        <span class="rating-picker-value" id="${id}_val">${r} / 5</span>
        <button type="button" class="rating-picker-clear" title="Clear rating">✕</button>
      </div>`;
  }

  function updateRatingUI(picker, rating) {
    const r = Math.max(0, Math.min(5, rating));
    picker.querySelector('.rating-picker-stars').style.setProperty('--rating-pct', `${(r / 5) * 100}%`);
    picker.querySelector('.rating-picker-value').textContent = `${r} / 5`;
  }

  function renderSocialFields() {
    const wrap = document.getElementById('socialsFields');
    wrap.innerHTML = content.socials.map((s, i) => {
      const current = (s.label || '').trim();
      const currentLower = current.toLowerCase();
      const usedLower = new Set(
        content.socials.map((x, j) => (j === i ? '' : (x.label || '').trim().toLowerCase())).filter(Boolean)
      );
      const available = SOCIAL_PLATFORMS.filter(p => !usedLower.has(p.toLowerCase()));
      const isKnown = SOCIAL_PLATFORMS.some(p => p.toLowerCase() === currentLower);
      // Preserve an already-selected platform (including custom/legacy labels);
      // otherwise pre-select the first platform not used by another link.
      const selected = current || available[0] || '';

      const platformOptions = [...SOCIAL_PLATFORMS];
      if (current && !isKnown) platformOptions.push(current);

      const platformSelect = `
        <select id="social_${i}_label">
          ${platformOptions.map(p => {
            const isSel = p.toLowerCase() === selected.toLowerCase();
            const isUsed = usedLower.has(p.toLowerCase()) && !isSel;
            return `<option value="${escapeAttr(p)}"${isSel ? ' selected' : ''}${isUsed ? ' disabled' : ''}>${escapeHtml(p)}</option>`;
          }).join('')}
        </select>`;

      return `
        <div class="repeat-card" data-index="${i}">
          <div class="repeat-card-header">
            <p class="repeat-card-title">Link ${i + 1}</p>
            <div class="repeat-card-actions">
              <button type="button" class="icon-btn" data-action="move" data-dir="-1" title="Move up" ${i === 0 ? 'disabled' : ''}><i class="fa-solid fa-chevron-up"></i></button>
              <button type="button" class="icon-btn" data-action="move" data-dir="1" title="Move down" ${i === content.socials.length - 1 ? 'disabled' : ''}><i class="fa-solid fa-chevron-down"></i></button>
              <button type="button" class="icon-btn danger" data-action="delete" title="Delete link"><i class="fa-solid fa-trash-can"></i></button>
            </div>
          </div>
          <div class="field-row" style="grid-template-columns:1fr 2fr;">
            <div class="field-group" style="margin-bottom:0">
              <label for="social_${i}_label">Platform</label>
              ${platformSelect}
            </div>
            <div class="field-group" style="margin-bottom:0">
              <label for="social_${i}_url">URL</label>
              <input type="url" id="social_${i}_url" maxlength="200" value="${escapeAttr(s.url)}" placeholder="https://...">
            </div>
          </div>
        </div>
      `;
    }).join('');
    updateCounts();
  }

  function renderProjectFields() {
    const wrap = document.getElementById('projectsFields');
    wrap.innerHTML = content.projects.map((p, i) => `
      <div class="repeat-card" data-index="${i}">
        <div class="repeat-card-header">
          <p class="repeat-card-title">Project ${i + 1}</p>
          <div class="repeat-card-actions">
            <button type="button" class="icon-btn" data-action="move" data-dir="-1" title="Move up" ${i === 0 ? 'disabled' : ''}><i class="fa-solid fa-chevron-up"></i></button>
            <button type="button" class="icon-btn" data-action="move" data-dir="1" title="Move down" ${i === content.projects.length - 1 ? 'disabled' : ''}><i class="fa-solid fa-chevron-down"></i></button>
            <button type="button" class="icon-btn danger" data-action="delete" title="Delete project"><i class="fa-solid fa-trash-can"></i></button>
          </div>
        </div>
        <div class="image-upload">
          <div class="image-upload-preview" id="project_${i}_preview">
            ${p.image
              ? `<img src="${escapeAttr(p.image)}" alt="Project image preview">`
              : '<span class="image-upload-empty">No image yet<br>Upload or paste a URL</span>'}
          </div>
          <div class="image-upload-actions">
            <label class="upload-btn" id="project_${i}_uploadBtn">
              <i class="fa-solid fa-cloud-arrow-up"></i><span>Upload Image</span>
              <input type="file" id="project_${i}_file" accept="image/*" hidden>
            </label>
            <div class="image-url-row">
              <input type="text" id="project_${i}_image" maxlength="300" value="${escapeAttr(p.image)}" placeholder="…or paste an image URL">
              <button type="button" class="icon-btn danger image-upload-clear" id="project_${i}_clear" title="Remove image" ${p.image ? '' : 'disabled'}>✕</button>
            </div>
            <p class="image-upload-status" id="project_${i}_status" role="status" aria-live="polite"></p>
          </div>
        </div>
        <div class="field-row" style="grid-template-columns:1fr 1fr;">
          <div class="field-group" style="margin-bottom:0">
            <label for="project_${i}_title">Project name</label>
            <input type="text" id="project_${i}_title" maxlength="60" value="${escapeAttr(p.title)}">
          </div>
          <div class="field-group" style="margin-bottom:0">
            <label for="project_${i}_tag">Category / tag</label>
            <input type="text" id="project_${i}_tag" maxlength="30" value="${escapeAttr(p.tag)}" placeholder="e.g. Web Store">
          </div>
        </div>
        <div class="field-group" style="margin-bottom:0">
          <label for="project_${i}_url">Project link (URL)</label>
          <input type="url" id="project_${i}_url" maxlength="300" value="${escapeAttr(p.url)}" placeholder="https://...">
        </div>
        <div class="field-group" style="margin-bottom:0">
          <label for="project_${i}_desc">Short description</label>
          <textarea id="project_${i}_desc" rows="3" maxlength="220">${escapeHtml(p.desc)}</textarea>
        </div>
      </div>
    `).join('');
    updateCounts();
  }

  function getCloudinaryConfig() {
    const cfg = (typeof window.ZANDF_CONFIG !== 'undefined' && window.ZANDF_CONFIG.cloudinary) || {};
    return {
      cloudName: cfg.cloudName || 'kdvfz52j',
      uploadPreset: cfg.uploadPreset || 'zandf-files'
    };
  }

  // Inject f_auto (best format: WebP/AVIF) + q_auto (optimal quality) into a
  // Cloudinary image URL. Non-Cloudinary URLs are returned unchanged.
  function cloudinaryUrl(url = '') {
    const s = String(url).trim();
    if (!/res\.cloudinary\.com\/[^/]+\/image\/upload\//i.test(s)) return s;
    if (/\/(?:f_auto|q_auto)[,/]/.test(s)) return s; // already transformed
    return s.replace(/\/image\/upload\//i, '/image/upload/f_auto,q_auto/');
  }

  async function uploadImageToCloudinary(file) {
    const { cloudName, uploadPreset } = getCloudinaryConfig();
    if (!cloudName || !uploadPreset) {
      throw new Error('Cloudinary is not configured. Set CLOUDINARY_* in .env and run "node scripts/build-config.js".');
    }
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.secure_url) {
      throw new Error(data.error && data.error.message ? data.error.message : `Upload failed (HTTP ${res.status}).`);
    }
    return cloudinaryUrl(data.secure_url);
  }

  function updateImagePreview(index, url) {
    const box = document.getElementById(`project_${index}_preview`);
    const input = document.getElementById(`project_${index}_image`);
    const clearBtn = document.getElementById(`project_${index}_clear`);
    if (input) input.value = url || '';
    if (clearBtn) clearBtn.disabled = !url;
    if (box) {
      box.innerHTML = url
        ? `<img src="${escapeAttr(cloudinaryUrl(url))}" alt="Project image preview">`
        : '<span class="image-upload-empty">No image yet<br>Upload or paste a URL</span>';
    }
  }

  async function handleProjectImageUpload(index, file) {
    const statusEl = document.getElementById(`project_${index}_status`);
    const btn = document.getElementById(`project_${index}_uploadBtn`);
    const setStatus = (msg, cls) => {
      statusEl.textContent = msg || '';
      statusEl.className = 'image-upload-status' + (cls ? ` ${cls}` : '');
    };

    if (!file.type.startsWith('image/')) {
      setStatus('Please choose an image file (JPG, PNG, WebP, GIF…).', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setStatus('Image is too large — the maximum size is 10 MB.', 'error');
      return;
    }

    try {
      if (btn) btn.classList.add('disabled');
      setStatus('Uploading to Cloudinary…');
      const url = await uploadImageToCloudinary(file);
      if (content.projects[index]) content.projects[index].image = url;
      updateImagePreview(index, url);
      setStatus('Image uploaded. Remember to save your changes.', 'success');
    } catch (err) {
      setStatus(`Upload failed: ${err.message}`, 'error');
    } finally {
      if (btn) btn.classList.remove('disabled');
      const fileInput = document.getElementById(`project_${index}_file`);
      if (fileInput) fileInput.value = '';
    }
  }

  function renderPolicyFields() {
    const wrap = document.getElementById('policyFields');
    wrap.innerHTML = policy.sections.map((s, i) => `
      <div class="repeat-card" data-index="${i}">
        <div class="repeat-card-header">
          <p class="repeat-card-title">Section ${i + 1}</p>
          <div class="repeat-card-actions">
            <button type="button" class="icon-btn" data-action="move" data-dir="-1" title="Move up" ${i === 0 ? 'disabled' : ''}><i class="fa-solid fa-chevron-up"></i></button>
            <button type="button" class="icon-btn" data-action="move" data-dir="1" title="Move down" ${i === policy.sections.length - 1 ? 'disabled' : ''}><i class="fa-solid fa-chevron-down"></i></button>
            <button type="button" class="icon-btn danger" data-action="delete" title="Delete section"><i class="fa-solid fa-trash-can"></i></button>
          </div>
        </div>
        <div class="field-group" style="margin-bottom:0">
          <label for="policy_${i}_heading">Heading</label>
          <input type="text" id="policy_${i}_heading" maxlength="120" value="${escapeAttr(s.heading)}">
        </div>
        <div class="field-group" style="margin-bottom:0">
          <label for="policy_${i}_body">Body</label>
          <textarea id="policy_${i}_body" rows="4" maxlength="4000" placeholder="One or more paragraphs for this section.">${escapeHtml(s.body)}</textarea>
        </div>
      </div>
    `).join('');
    updateCounts();
  }

  function updateCounts() {
    document.getElementById('servicesCount').textContent =
      `${content.services.length} service${content.services.length === 1 ? '' : 's'}`;
    document.getElementById('projectsCount').textContent =
      `${content.projects.length} project${content.projects.length === 1 ? '' : 's'}`;
    document.getElementById('testimonialsCount').textContent =
      `${content.testimonials.length} testimonial${content.testimonials.length === 1 ? '' : 's'}`;
    document.getElementById('socialsCount').textContent =
      `${content.socials.length} link${content.socials.length === 1 ? '' : 's'}`;
    document.getElementById('policyCount').textContent =
      `${policy.sections.length} section${policy.sections.length === 1 ? '' : 's'}`;
  }

  // ---- Add / delete / reorder for repeatable fields ----
  function setupRepeatHandlers() {
    const servicesWrap = document.getElementById('servicesFields');
    const projectsWrap = document.getElementById('projectsFields');
    const testimonialsWrap = document.getElementById('testimonialsFields');
    const socialsWrap = document.getElementById('socialsFields');
    const policyWrap = document.getElementById('policyFields');

    const handleRepeatClick = (e, list, noun, renderFn) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const index = parseInt(btn.closest('.repeat-card').dataset.index, 10);
      const action = btn.dataset.action;

      if (action === 'delete') {
        if (!confirm(`Delete this ${noun}? This cannot be undone.`)) return;
        list.splice(index, 1);
      } else if (action === 'move') {
        const dir = parseInt(btn.dataset.dir, 10);
        const target = index + dir;
        if (target < 0 || target >= list.length) return;
        [list[index], list[target]] = [list[target], list[index]];
      }
      renderFn();
    };

    servicesWrap.addEventListener('click', (e) => handleRepeatClick(e, content.services, 'service', renderServiceFields));
    projectsWrap.addEventListener('click', (e) => handleRepeatClick(e, content.projects, 'project', renderProjectFields));
    testimonialsWrap.addEventListener('click', (e) => handleRepeatClick(e, content.testimonials, 'testimonial', renderTestimonialFields));
    socialsWrap.addEventListener('click', (e) => handleRepeatClick(e, content.socials, 'link', renderSocialFields));
    policyWrap.addEventListener('click', (e) => handleRepeatClick(e, policy.sections, 'policy section', renderPolicyFields));

    // Service icon picker: live-update the preview box when the selection changes.
    servicesWrap.addEventListener('change', (e) => {
      if (!e.target.matches('select[id^="service_"][id$="_icon"]')) return;
      const card = e.target.closest('.repeat-card');
      if (!card) return;
      const index = parseInt(card.dataset.index, 10);
      const preview = document.getElementById(`service_${index}_iconPreview`);
      if (preview) {
        preview.innerHTML = serviceIconSVG(e.target.value);
        preview.title = SERVICE_ICON_LABELS[e.target.value] || e.target.value;
      }
    });

    // Social platform chosen -> auto-fill the URL base so the admin only adds
    // the username (or clears the field to paste a full link). Never overwrites
    // a URL that already has a username/full link in it.
    socialsWrap.addEventListener('change', (e) => {
      const select = e.target;
      if (!select.matches('select[id^="social_"][id$="_label"]')) return;
      const card = select.closest('.repeat-card');
      if (!card) return;
      const index = parseInt(card.dataset.index, 10);
      const urlInput = document.getElementById(`social_${index}_url`);
      const base = SOCIAL_URL_BASES[select.value];
      if (!urlInput || !base) return;
      const current = urlInput.value.trim();
      if (current === '' || Object.values(SOCIAL_URL_BASES).includes(current)) {
        urlInput.value = base;
        urlInput.focus();
        urlInput.setSelectionRange(base.length, base.length);
      }
    });

    // Project image: pick file -> upload to Cloudinary, or clear an existing image.
    projectsWrap.addEventListener('change', (e) => {
      const fileInput = e.target;
      if (!fileInput.matches('input[type="file"]')) return;
      const card = fileInput.closest('.repeat-card');
      if (!card) return;
      const index = parseInt(card.dataset.index, 10);
      const file = fileInput.files && fileInput.files[0];
      if (file) handleProjectImageUpload(index, file);
    });

    projectsWrap.addEventListener('click', (e) => {
      const clearBtn = e.target.closest('.image-upload-clear');
      if (!clearBtn) return;
      const card = clearBtn.closest('.repeat-card');
      if (!card) return;
      const index = parseInt(card.dataset.index, 10);
      if (content.projects[index]) content.projects[index].image = '';
      updateImagePreview(index, '');
    });

    // Star rating picker (delegated — also survives re-renders)
    testimonialsWrap.addEventListener('click', (e) => {
      const picker = e.target.closest('.rating-picker');
      if (!picker) return;
      const index = parseInt(picker.closest('.repeat-card').dataset.index, 10);

      const clear = e.target.closest('.rating-picker-clear');
      if (clear) {
        picker.dataset.rating = 0;
        updateRatingUI(picker, 0);
        if (content.testimonials[index]) content.testimonials[index].rating = 0;
        return;
      }
      const half = e.target.closest('button[data-half]');
      if (half) {
        const rating = parseInt(half.dataset.half, 10) / 2;
        picker.dataset.rating = rating;
        updateRatingUI(picker, rating);
        if (content.testimonials[index]) content.testimonials[index].rating = rating;
      }
    });

    document.getElementById('addServiceBtn').addEventListener('click', () => {
      content.services.push({ title: 'New Service', desc: 'Describe this service.', icon: 'code' });
      renderServiceFields();
    });

    document.getElementById('addProjectBtn').addEventListener('click', () => {
      content.projects.push({ title: 'New Project', tag: 'Website', desc: 'Describe this project.', url: 'https://', image: '' });
      renderProjectFields();
    });

    document.getElementById('addTestimonialBtn').addEventListener('click', () => {
      content.testimonials.push({ text: 'Great work!', author: 'New Client', role: 'Company', rating: 5 });
      renderTestimonialFields();
    });

    document.getElementById('addSocialBtn').addEventListener('click', () => {
      content.socials.push({ label: '', url: 'https://' });
      renderSocialFields();
    });

    document.getElementById('addPolicySectionBtn').addEventListener('click', () => {
      policy.sections.push({ heading: 'New Section', body: 'Describe this section.' });
      renderPolicyFields();
    });
  }

  function escapeHtml(str = '') {
    return str.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  }
  function escapeAttr(str = '') {
    return escapeHtml(str).replace(/"/g, '&quot;');
  }

  // ---- Populate all fields from `content` ----
  function populateForm() {
    document.getElementById('hero_gradientText').value = content.hero.gradientText;
    document.getElementById('hero_description').value = content.hero.description;
    document.getElementById('hero_statProjects').value = content.hero.statProjects;
    document.getElementById('hero_statClients').value = content.hero.statClients;
    document.getElementById('hero_statYears').value = content.hero.statYears;

    document.getElementById('about_gradientText').value = content.about.gradientText;
    document.getElementById('about_subtitle').value = content.about.subtitle;

    document.getElementById('contact_email').value = content.contact.email;
    document.getElementById('contact_phone').value = content.contact.phone;

    renderServiceFields();
    renderProjectFields();
    renderTestimonialFields();
    renderSocialFields();
  }

  // ---- Populate the policy fields from `policy` ----
  function populatePolicyForm() {
    document.getElementById('policy_title').value = policy.title;
    document.getElementById('policy_intro').value = policy.intro;
    document.getElementById('policy_updatedAt').value = policy.updatedAt;
    renderPolicyFields();
  }

  // ---- Read all fields back into a content object ----
  function readForm() {
    const services = content.services.map((_, i) => ({
      title: document.getElementById(`service_${i}_title`).value.trim(),
      desc: document.getElementById(`service_${i}_desc`).value.trim(),
      icon: document.getElementById(`service_${i}_icon`).value
    }));
    const projects = content.projects.map((_, i) => ({
      title: document.getElementById(`project_${i}_title`).value.trim(),
      tag: document.getElementById(`project_${i}_tag`).value.trim(),
      desc: document.getElementById(`project_${i}_desc`).value.trim(),
      url: document.getElementById(`project_${i}_url`).value.trim(),
      image: document.getElementById(`project_${i}_image`).value.trim()
    }));
    const testimonials = content.testimonials.map((_, i) => ({
      text: document.getElementById(`testi_${i}_text`).value.trim(),
      author: document.getElementById(`testi_${i}_author`).value.trim(),
      role: document.getElementById(`testi_${i}_role`).value.trim(),
      rating: parseFloat(document.getElementById(`testi_${i}_rating`).dataset.rating) || 0
    }));
    const socials = content.socials.map((_, i) => ({
      label: document.getElementById(`social_${i}_label`).value.trim(),
      url: document.getElementById(`social_${i}_url`).value.trim()
    }));

    return {
      hero: {
        gradientText: document.getElementById('hero_gradientText').value.trim(),
        description: document.getElementById('hero_description').value.trim(),
        statProjects: document.getElementById('hero_statProjects').value.trim(),
        statClients: document.getElementById('hero_statClients').value.trim(),
        statYears: document.getElementById('hero_statYears').value.trim()
      },
      about: {
        gradientText: document.getElementById('about_gradientText').value.trim(),
        subtitle: document.getElementById('about_subtitle').value.trim()
      },
      services,
      projects,
      testimonials,
      socials,
      contact: {
        email: document.getElementById('contact_email').value.trim(),
        phone: document.getElementById('contact_phone').value.trim()
      }
    };
  }

  // ---- Read the policy fields back into a policy object ----
  function readPolicyForm() {
    return {
      title: document.getElementById('policy_title').value.trim() || DEFAULT_POLICY.title,
      intro: document.getElementById('policy_intro').value.trim(),
      updatedAt: document.getElementById('policy_updatedAt').value.trim(),
      sections: policy.sections
        .map((_, i) => ({
          heading: document.getElementById(`policy_${i}_heading`).value.trim(),
          body: document.getElementById(`policy_${i}_body`).value.trim()
        }))
        .filter((s) => s.heading || s.body)
    };
  }

  function showToast(message, isError = false) {
    const toast = document.getElementById('saveToast');
    toast.textContent = message;
    toast.className = 'save-toast' + (isError ? ' error' : '');
    setTimeout(() => { toast.textContent = ''; }, 3500);
  }

  populateForm();
  populatePolicyForm();
  setupRepeatHandlers();

  // Current version that exists in storage (the baseline for undo).
  let lastSaved = deepClone({ content, policy });

  document.getElementById('saveBtn').addEventListener('click', async () => {
    // Remember the version we're replacing so Undo can restore it.
    const prev = deepClone(lastSaved);
    content = readForm();
    policy = readPolicyForm();
    try {
      await saveContent(content);
      await savePolicy(policy);
    } catch (err) {
      console.error('ZANDF: could not save content to Firestore:', err);
      showToast(
        'Saved to this browser only — Firebase rejected the write: ' + (err.message || err.code || 'unknown error'),
        true
      );
      return;
    }
    lastSaved = deepClone({ content, policy });
    const history = loadHistory();
    const top = history[history.length - 1];
    if (!top || JSON.stringify(top) !== JSON.stringify(prev)) history.push(prev);
    saveHistory(history);
    showToast('Changes saved. Open "View Site" (or refresh it) to see them live.');
  });

  // ---- Undo: restore the version that existed before the last save ----
  document.getElementById('undoBtn').addEventListener('click', async () => {
    const history = loadHistory();
    if (!history.length) {
      showToast('Nothing to undo — there is no previous saved version.');
      return;
    }
    if (!confirm('Undo the last save and restore the version from before it? Any unsaved edits will be discarded.')) return;
    const prev = history.pop();
    saveHistory(history);
    // Newer history entries store { content, policy }; older ones are content-only.
    content = deepClone(prev && prev.content ? prev.content : prev);
    if (prev && prev.policy) {
      policy = deepClone(prev.policy);
    }
    try {
      await saveContent(content);
      await savePolicy(policy);
    } catch (err) {
      console.error('ZANDF: could not save content to Firestore:', err);
      showToast(
        'Restored locally only — Firebase rejected the write: ' + (err.message || err.code || 'unknown error'),
        true
      );
    }
    lastSaved = deepClone({ content, policy });
    populateForm();
    populatePolicyForm();
    showToast('Undone — restored the version from before your last save.');
  });

  // ---- Logout ----
  document.getElementById('logoutBtn').addEventListener('click', () => {
    const fb = window.ZANDF_FIREBASE;
    if (fb && fb.auth) {
      fb.auth.signOut().catch((err) => console.error('ZANDF: sign out failed:', err));
    }
    clearAuthenticated();
    window.location.href = 'login.html';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initLoginPage();
  initDashboardPage();
});
