const express = require('express');
const { League } = require('../models');

const router = express.Router();

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
