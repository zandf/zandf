/* ============================================
   ZANDF — Privacy Policy loader
   Renders the policy page from Firestore
   (collection "content", doc "policy"), with a
   localStorage fallback and built-in defaults.
   Include after js/firebase.js on policy.html.
   ============================================ */

(function () {
  const POLICY_KEY = 'zandf_policy';
  const POLICY_DOC = 'policy';

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

  function escapeHtml(str = '') {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function readLocal() {
    const raw = localStorage.getItem(POLICY_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function applyPolicy(policy) {
    const p = policy && typeof policy === 'object' ? policy : {};
    const sections = Array.isArray(p.sections)
      ? p.sections.filter((s) => s && (s.heading || s.body))
      : [];
    const title = (p.title || DEFAULT_POLICY.title).trim() || 'Privacy Policy';

    document.title = title + ' | ZANDF';

    const titleEl = document.getElementById('policyTitle');
    const updatedEl = document.getElementById('policyUpdated');
    const introEl = document.getElementById('policyIntro');
    const wrap = document.getElementById('policySections');

    if (titleEl) titleEl.textContent = title;
    if (updatedEl) updatedEl.textContent = p.updatedAt ? 'Last updated: ' + p.updatedAt : '';
    if (introEl && p.intro) introEl.textContent = p.intro;

    if (wrap) {
      wrap.innerHTML = sections.map((s, i) => `
        <div class="policy-section">
          <h2>
            <span class="policy-num">${String(i + 1).padStart(2, '0')}</span>
            <span>${escapeHtml(s.heading || '')}</span>
          </h2>
          <p>${escapeHtml(s.body || '')}</p>
        </div>
      `).join('');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const local = readLocal();
    const fb = window.ZANDF_FIREBASE;

    if (fb && fb.db) {
      fb.db.collection('content').doc(POLICY_DOC).get()
        .then((snap) => {
          applyPolicy(snap.exists ? snap.data() : (local || DEFAULT_POLICY));
        })
        .catch((err) => {
          console.error('ZANDF: could not load policy from Firestore:', err);
          applyPolicy(local || DEFAULT_POLICY);
        });
    } else {
      applyPolicy(local || DEFAULT_POLICY);
    }
  });
})();
