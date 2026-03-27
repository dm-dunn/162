const express = require('express');
const { League } = require('../models');
const AuthService = require('../services/authService');

const router = express.Router();

// ─── Email Verification Landing Page ─────────────────────────────────────────
// This is what the user hits when they click "Verify Email" in their inbox.
// Processes the token server-side and returns a branded HTML result page.
router.get('/verify-email', async (req, res) => {
    const { token } = req.query;

    let success = false;
    let alreadyVerified = false;
    let errorMsg = '';

    if (!token) {
        errorMsg = 'No verification token was provided. Please use the link from your email.';
    } else {
        try {
            await AuthService.verifyEmail(token);
            success = true;
        } catch (err) {
            if (err.message === 'Email already verified') {
                success = true;
                alreadyVerified = true;
            } else {
                errorMsg = 'This verification link has expired or is invalid. Please request a new one from the app.';
            }
        }
    }

    const title = success
        ? (alreadyVerified ? 'Already Verified' : 'Email Verified!')
        : 'Verification Failed';

    const iconSvg = success
        ? `<svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="28" cy="28" r="28" fill="#22c55e" opacity="0.15"/>
            <circle cx="28" cy="28" r="20" fill="#22c55e" opacity="0.25"/>
            <polyline points="18,28 25,35 38,21" stroke="#22c55e" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
           </svg>`
        : `<svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="28" cy="28" r="28" fill="#ef4444" opacity="0.15"/>
            <circle cx="28" cy="28" r="20" fill="#ef4444" opacity="0.25"/>
            <line x1="20" y1="20" x2="36" y2="36" stroke="#ef4444" stroke-width="3.5" stroke-linecap="round"/>
            <line x1="36" y1="20" x2="20" y2="36" stroke="#ef4444" stroke-width="3.5" stroke-linecap="round"/>
           </svg>`;

    const headlineText = success
        ? (alreadyVerified ? 'Already Good to Go' : "You're In!")
        : 'Link Expired';

    const bodyText = success
        ? (alreadyVerified
            ? 'Your email address was already verified. Open the MLB162 app and start making picks.'
            : 'Your email has been verified. You\'re all set to start making picks, climbing the leaderboard, and competing in leagues. Open the app and play ball.')
        : errorMsg;

    const accentColor = success ? '#22c55e' : '#ef4444';

    res.setHeader('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)} — MLB162</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #000066;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      position: relative;
      overflow: hidden;
    }

    /* Subtle baseball-stitch background pattern */
    body::before {
      content: '';
      position: fixed;
      inset: 0;
      background-image:
        radial-gradient(ellipse at 20% 50%, rgba(220,38,38,0.12) 0%, transparent 60%),
        radial-gradient(ellipse at 80% 20%, rgba(255,255,255,0.04) 0%, transparent 50%),
        radial-gradient(ellipse at 60% 80%, rgba(220,38,38,0.08) 0%, transparent 50%);
      pointer-events: none;
    }

    /* Floating diamond shapes */
    .bg-diamond {
      position: fixed;
      width: 180px;
      height: 180px;
      border: 1.5px solid rgba(255,255,255,0.05);
      transform: rotate(45deg);
      pointer-events: none;
    }
    .bg-diamond-1 { top: -60px; right: -60px; width: 220px; height: 220px; }
    .bg-diamond-2 { bottom: -80px; left: -80px; width: 260px; height: 260px; border-color: rgba(220,38,38,0.08); }
    .bg-diamond-3 { top: 40%; right: 5%; width: 80px; height: 80px; border-color: rgba(255,255,255,0.04); }

    .card {
      background: #ffffff;
      border-radius: 24px;
      padding: 44px 36px 40px;
      max-width: 420px;
      width: 100%;
      text-align: center;
      box-shadow:
        0 4px 6px rgba(0,0,0,0.1),
        0 20px 60px rgba(0,0,0,0.4),
        0 0 0 1px rgba(255,255,255,0.05);
      position: relative;
      z-index: 1;
    }

    /* Top accent bar */
    .card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 4px;
      background: linear-gradient(90deg, #CC0000 0%, #FF1A1A 40%, #000099 100%);
      border-radius: 24px 24px 0 0;
    }

    .logo-wrap {
      margin-bottom: 28px;
    }
    .logo {
      font-size: 32px;
      font-weight: 900;
      color: #000066;
      letter-spacing: 3px;
      line-height: 1;
    }
    .logo span { color: #CC0000; }
    .logo-sub {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: #9ca3af;
      margin-top: 4px;
    }

    .icon-wrap {
      margin-bottom: 20px;
    }

    .headline {
      font-size: 26px;
      font-weight: 800;
      color: #000066;
      margin-bottom: 14px;
      line-height: 1.2;
    }

    .body-text {
      font-size: 15px;
      color: #4b5563;
      line-height: 1.65;
      margin-bottom: 32px;
    }

    .divider {
      border: none;
      border-top: 1px solid #f3f4f6;
      margin: 0 -36px 28px;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      background: ${accentColor}18;
      border: 1px solid ${accentColor}40;
      color: ${accentColor};
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 6px 14px;
      border-radius: 100px;
      margin-bottom: 24px;
    }
    .status-badge::before {
      content: '';
      width: 7px;
      height: 7px;
      background: ${accentColor};
      border-radius: 50%;
      flex-shrink: 0;
    }

    .cta-text {
      font-size: 13px;
      color: #9ca3af;
      line-height: 1.6;
    }
    .cta-text strong {
      color: #6b7280;
    }

    /* Baseball seam decoration at bottom of card */
    .seam-decoration {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 28px;
      justify-content: center;
    }
    .seam-line {
      height: 2px;
      width: 32px;
      background: linear-gradient(90deg, transparent, #e5e7eb);
      border-radius: 2px;
    }
    .seam-line.right {
      background: linear-gradient(90deg, #e5e7eb, transparent);
    }
    .seam-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #d1d5db;
    }
  </style>
</head>
<body>
  <div class="bg-diamond bg-diamond-1"></div>
  <div class="bg-diamond bg-diamond-2"></div>
  <div class="bg-diamond bg-diamond-3"></div>

  <div class="card">
    <div class="logo-wrap">
      <div class="logo">MLB<span>162</span></div>
      <div class="logo-sub">Daily Picks Game</div>
    </div>

    <div class="icon-wrap">${iconSvg}</div>

    <div class="status-badge">${success ? (alreadyVerified ? 'Already verified' : 'Verified') : 'Error'}</div>

    <div class="headline">${escapeHtml(headlineText)}</div>

    <div class="body-text">${escapeHtml(bodyText)}</div>

    <hr class="divider" />

    <div class="cta-text">
      ${success
        ? '<strong>Head back to the MLB162 app</strong> to start playing. You can close this tab.'
        : 'Open the <strong>MLB162 app</strong> and tap <strong>Resend Verification Email</strong> to get a fresh link.'}
    </div>

    <div class="seam-decoration">
      <div class="seam-line"></div>
      <div class="seam-dot"></div>
      <div class="seam-dot"></div>
      <div class="seam-dot"></div>
      <div class="seam-line right"></div>
    </div>
  </div>
</body>
</html>`);
});

// ─── League Invite Landing Page ───────────────────────────────────────────────
// Invite landing page — handles the link that gets shared via text/iMessage/etc.
// When app is installed: JS tries the custom scheme mlb162://join?code=XXXX
// When app is not installed: shows App Store / Google Play download buttons
router.get('/join/:code', async (req, res) => {
    const { code } = req.params;

    let leagueName = 'an MLB162 League';
    let memberCount = null;

    try {
        const league = await League.findByInviteCode(code);
        if (league) {
            leagueName = league.name;
            memberCount = league.member_count;
        }
    } catch (_) {
        // If DB lookup fails, still show the page — don't hard error
    }

    const appSchemeUrl = `mlb162://join?code=${encodeURIComponent(code)}`;
    // TODO: Replace with real App Store / Play Store URLs when published
    const appStoreUrl = 'https://apps.apple.com/app/mlb162';
    const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.mlb162.app';

    const memberText = memberCount != null
        ? `${memberCount} ${memberCount === 1 ? 'member' : 'members'} so far`
        : '';

    res.setHeader('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Join ${leagueName} — MLB162</title>

  <!-- iOS Smart App Banner (shows native "Open in App" banner on Safari) -->
  <meta name="apple-itunes-app" content="app-id=XXXXXXXXX, app-argument=${appSchemeUrl}" />

  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #000080;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: #fff;
      border-radius: 20px;
      padding: 36px 28px;
      max-width: 400px;
      width: 100%;
      text-align: center;
      box-shadow: 0 12px 40px rgba(0,0,0,0.3);
    }
    .logo { font-size: 42px; font-weight: 900; color: #000080; letter-spacing: 2px; }
    .logo span { color: #FF0000; }
    .subtitle { color: #6b7280; font-size: 14px; margin-top: 4px; }
    .divider { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
    .invite-text { font-size: 16px; color: #6b7280; margin-bottom: 8px; }
    .league-name { font-size: 26px; font-weight: 800; color: #000080; margin-bottom: 6px; }
    .member-count { font-size: 13px; color: #9ca3af; margin-bottom: 28px; }
    .btn {
      display: block;
      width: 100%;
      padding: 14px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
      border: none;
      margin-bottom: 12px;
    }
    .btn-primary { background: #FF0000; color: #fff; }
    .btn-store { background: #000; color: #fff; }
    .btn-store-android { background: #3ddc84; color: #000; }
    .store-btns { display: none; margin-top: 8px; }
    .open-text { font-size: 13px; color: #9ca3af; margin-top: 16px; }
    .spinner {
      display: inline-block;
      width: 18px; height: 18px;
      border: 2px solid rgba(255,255,255,0.4);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      vertical-align: middle;
      margin-right: 8px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">MLB<span>162</span></div>
    <div class="subtitle">Daily Picks Game</div>

    <hr class="divider" />

    <div class="invite-text">You've been invited to join</div>
    <div class="league-name">${escapeHtml(leagueName)}</div>
    ${memberText ? `<div class="member-count">${memberText}</div>` : '<div class="member-count" style="margin-bottom:28px"></div>'}

    <button class="btn btn-primary" id="openBtn" onclick="tryOpenApp()">
      <span class="spinner" id="spinner"></span>
      Open in MLB162
    </button>

    <div class="store-btns" id="storeBtns">
      <a class="btn btn-store" href="${appStoreUrl}">Download on the App Store</a>
      <a class="btn btn-store-android" href="${playStoreUrl}">Get it on Google Play</a>
    </div>

    <div class="open-text" id="openText">Opening the app&hellip;</div>
  </div>

  <script>
    var appUrl = "${appSchemeUrl}";
    var tried = false;

    function tryOpenApp() {
      if (tried) return;
      tried = true;

      // Try to open the custom scheme
      window.location.href = appUrl;

      // After 2.5s, if still on the page the app probably isn't installed
      setTimeout(function() {
        document.getElementById('spinner').style.display = 'none';
        document.getElementById('openBtn').textContent = 'Open in MLB162';
        document.getElementById('storeBtns').style.display = 'block';
        document.getElementById('openText').textContent = "Don't have the app yet? Download it below.";
      }, 2500);
    }

    // Auto-attempt on load (mobile only)
    var ua = navigator.userAgent;
    if (/iPhone|iPad|iPod|Android/i.test(ua)) {
      tryOpenApp();
    } else {
      // Desktop — skip spinner, just show store links
      document.getElementById('spinner').style.display = 'none';
      document.getElementById('openBtn').style.display = 'none';
      document.getElementById('storeBtns').style.display = 'block';
      document.getElementById('openText').textContent = 'Download MLB162 on your phone to join this league.';
    }
  </script>
</body>
</html>`);
});

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

module.exports = router;
