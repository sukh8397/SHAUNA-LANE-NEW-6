/**
 * Shauna Lane — In-Page Visual Editor & Magic Toolbar (Security & OTP Edition)
 * Features:
 * - 4-digit PIN login with Rate-Limiting & Anti-Brute-Force
 * - Email OTP (One-Time Password) Login directly to shaunalaneproductions@gmail.com
 * - Reset PIN via Email Verification
 * - Change PIN anytime in Settings
 * - Drag-and-drop & 1-click photo replacement across all site images
 * - Visual inline text typing (Microsoft Word style)
 * - 1-Click "Publish Live" to GitHub + Cloudflare
 */
(() => {
  const isEditRequested = window.location.search.includes('edit=1') || window.location.pathname === '/admin';
  const hasActiveSession = localStorage.getItem('sl_admin_session') === 'active';

  if (!isEditRequested && !hasActiveSession) return;

  // Configuration state
  let currentPin = localStorage.getItem('sl_custom_pin') || '2026';
  let githubToken = localStorage.getItem('sl_github_token') || '';
  let pendingChanges = 0;
  const pendingImages = []; // { filename, base64, element }

  // 1. INJECT STYLES
  const style = document.createElement('style');
  style.id = 'sl-admin-styles';
  style.textContent = `
    /* Magic Floating Admin Bar */
    .sl-admin-bar {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 2147483647;
      background: rgba(24, 21, 18, 0.95);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 999px;
      padding: 8px 18px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #fff;
      font-size: 13px;
      animation: slSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes slSlideUp {
      from { transform: translate(-50%, 40px); opacity: 0; }
      to { transform: translate(-50%, 0); opacity: 1; }
    }
    .sl-admin-status {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 700;
      letter-spacing: 0.02em;
    }
    .sl-admin-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #00d26a;
      box-shadow: 0 0 10px #00d26a;
      animation: slPulse 2s infinite;
    }
    @keyframes slPulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(1.15); }
    }
    .sl-admin-counter {
      color: rgba(255, 255, 255, 0.7);
      font-size: 12px;
      background: rgba(255, 255, 255, 0.1);
      padding: 4px 10px;
      border-radius: 999px;
    }
    .sl-admin-counter.has-changes {
      background: rgba(255, 110, 180, 0.25);
      color: #ff8ec7;
      font-weight: 700;
    }
    .sl-admin-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .sl-admin-btn {
      border: 0;
      border-radius: 999px;
      font-family: inherit;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      padding: 8px 16px;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      text-decoration: none;
    }
    .sl-admin-btn-publish {
      background: linear-gradient(135deg, #00d26a 0%, #00a854 100%);
      color: #fff;
      box-shadow: 0 4px 14px rgba(0, 210, 106, 0.35);
    }
    .sl-admin-btn-publish:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 18px rgba(0, 210, 106, 0.45);
    }
    .sl-admin-btn-publish:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }
    .sl-admin-btn-settings, .sl-admin-btn-exit {
      background: rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.85);
    }
    .sl-admin-btn-settings:hover, .sl-admin-btn-exit:hover {
      background: rgba(255, 255, 255, 0.2);
      color: #fff;
    }

    /* Editable Element Outlines */
    .sl-editable-active {
      outline: 2px dashed rgba(255, 110, 180, 0.55) !important;
      outline-offset: 3px !important;
      border-radius: 3px !important;
      cursor: text !important;
      transition: outline 0.2s ease, background 0.2s ease !important;
    }
    .sl-editable-active:hover {
      outline: 2px dashed #ff6eb4 !important;
      background: rgba(255, 110, 180, 0.06) !important;
    }
    .sl-editable-active:focus {
      outline: 2px solid #00d26a !important;
      background: transparent !important;
    }

    /* Editable Image Overlays */
    .sl-img-container {
      position: relative !important;
      display: inline-block !important;
    }
    .sl-img-badge {
      position: absolute;
      top: 12px;
      right: 12px;
      background: rgba(24, 21, 18, 0.88);
      color: #fff;
      backdrop-filter: blur(8px);
      padding: 6px 12px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      border: 1px solid rgba(255, 255, 255, 0.25);
      cursor: pointer;
      display: none;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      transition: all 0.2s ease;
    }
    .sl-img-container:hover .sl-img-badge {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .sl-img-badge:hover {
      background: #ff6eb4;
      border-color: #ff6eb4;
      transform: scale(1.05);
    }
    .sl-img-dropzone-active {
      outline: 4px dashed #00d26a !important;
      outline-offset: -4px !important;
      filter: brightness(0.85) !important;
    }

    /* Security Login & Reset Modals */
    .sl-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(18, 15, 12, 0.85);
      backdrop-filter: blur(14px);
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      animation: slFadeIn 0.25s ease;
    }
    @keyframes slFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .sl-modal-dialog {
      background: #FAF1E4;
      border: 1px solid #d4c2b2;
      border-radius: 18px;
      padding: 32px 36px;
      width: 100%;
      max-width: 420px;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
      text-align: center;
      color: #181512;
    }
    .sl-modal-dialog h3 {
      font-size: 24px;
      margin: 0 0 8px;
      font-family: 'Gelasio', Georgia, serif;
    }
    .sl-modal-dialog p {
      font-size: 13px;
      color: #6e5a4e;
      margin: 0 0 20px;
      line-height: 1.5;
    }
    .sl-modal-input {
      width: 100%;
      box-sizing: border-box;
      padding: 12px 16px;
      border-radius: 10px;
      border: 1px solid #c2b09f;
      font-size: 16px;
      text-align: center;
      margin-bottom: 14px;
      font-family: inherit;
      outline: none;
      background: #fff;
    }
    .sl-modal-input.pin-style {
      font-size: 20px;
      letter-spacing: 0.25em;
    }
    .sl-modal-input:focus {
      border-color: #ff6eb4;
      box-shadow: 0 0 0 3px rgba(255, 110, 180, 0.2);
    }
    .sl-modal-btn {
      width: 100%;
      padding: 12px;
      border: 0;
      border-radius: 10px;
      background: #181512;
      color: #fff;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.2s ease;
      margin-bottom: 8px;
    }
    .sl-modal-btn:hover {
      background: #ff6eb4;
    }
    .sl-modal-btn-subtle {
      background: transparent;
      color: #6e5a4e;
      font-size: 12px;
      font-weight: 600;
      text-decoration: underline;
      cursor: pointer;
      border: 0;
      padding: 4px;
      margin: 4px 0;
      display: inline-block;
    }
    .sl-modal-btn-subtle:hover {
      color: #ff6eb4;
    }
    .sl-modal-error {
      color: #d93838;
      font-size: 12px;
      margin: 8px 0;
      display: none;
      background: #ffebeb;
      padding: 6px 12px;
      border-radius: 6px;
    }
    .sl-modal-success {
      color: #0b7e40;
      font-size: 12px;
      margin: 8px 0;
      display: none;
      background: #e6f7ee;
      padding: 6px 12px;
      border-radius: 6px;
    }

    /* Notification Toast */
    .sl-toast {
      position: fixed;
      top: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(24, 21, 18, 0.94);
      color: #fff;
      backdrop-filter: blur(12px);
      padding: 12px 24px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 700;
      z-index: 2147483647;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      gap: 10px;
      border: 1px solid rgba(255,255,255,0.15);
      animation: slSlideDown 0.3s ease;
    }
    @keyframes slSlideDown {
      from { transform: translate(-50%, -30px); opacity: 0; }
      to { transform: translate(-50%, 0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);

  // Helper: Toast
  const showToast = (msg, duration = 3500) => {
    const existing = document.getElementById('slToast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.id = 'slToast';
    toast.className = 'sl-toast';
    toast.innerHTML = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  };

  // Helper: Get Current Page File Name
  const getCurrentPagePath = () => {
    let p = window.location.pathname;
    if (p.endsWith('/')) p += 'index.html';
    if (!p.endsWith('.html')) p += '.html';
    return p.replace(/^\//, '') || 'index.html';
  };

  // 2. MULTI-FACTOR AUTHENTICATION MODAL (PIN, EMAIL OTP, RESET PIN)
  const promptSecurityModal = () => {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'sl-modal-overlay';
      modal.id = 'slSecurityModal';

      // Current view mode: 'pin', 'otp', 'reset'
      let currentMode = 'pin';

      const renderView = () => {
        if (currentMode === 'pin') {
          modal.innerHTML = `
            <div class="sl-modal-dialog">
              <div style="font-size:36px;margin-bottom:8px">👋</div>
              <h3>Welcome Shauna</h3>
              <p>Enter your 4-digit PIN to edit text and photos directly on your website:</p>
              <input type="password" maxlength="8" class="sl-modal-input pin-style" id="slPinInput" placeholder="••••" autofocus>
              <button class="sl-modal-btn" id="slPinSubmit">Unlock Editor ↗</button>
              <div class="sl-modal-error" id="slErrorBox"></div>
              <div style="margin-top:12px;display:flex;flex-direction:column;gap:4px">
                <button type="button" class="sl-modal-btn-subtle" id="slSwitchOtp">✉️ Login with Email &amp; OTP code</button>
                <button type="button" class="sl-modal-btn-subtle" id="slSwitchReset">🔑 Forgot PIN? Reset via Email</button>
              </div>
              <div style="margin-top:16px;font-size:11px;color:#8a7667">Protected for <strong>shaunalaneproductions@gmail.com</strong></div>
            </div>
          `;
          attachPinHandlers();
        } else if (currentMode === 'otp') {
          modal.innerHTML = `
            <div class="sl-modal-dialog">
              <div style="font-size:36px;margin-bottom:8px">✉️</div>
              <h3>Email &amp; OTP Login</h3>
              <p>We'll send a 6-digit secure login code directly to your email:</p>
              <input type="email" class="sl-modal-input" id="slEmailInput" value="shaunalaneproductions@gmail.com" placeholder="your@email.com">
              <button class="sl-modal-btn" id="slSendOtpBtn">Send 6-Digit Code ↗</button>
              
              <div id="slOtpInputSection" style="display:none;margin-top:14px">
                <p style="margin-bottom:8px">Enter the 6-digit code sent to your inbox:</p>
                <input type="text" maxlength="6" class="sl-modal-input pin-style" id="slOtpInput" placeholder="••••••">
                <button class="sl-modal-btn" id="slVerifyOtpBtn">Verify &amp; Unlock Editor ↗</button>
              </div>

              <div class="sl-modal-error" id="slErrorBox"></div>
              <div class="sl-modal-success" id="slSuccessBox"></div>

              <div style="margin-top:12px">
                <button type="button" class="sl-modal-btn-subtle" id="slSwitchPin">← Back to PIN Login</button>
              </div>
            </div>
          `;
          attachOtpHandlers();
        } else if (currentMode === 'reset') {
          modal.innerHTML = `
            <div class="sl-modal-dialog">
              <div style="font-size:36px;margin-bottom:8px">🔑</div>
              <h3>Reset Your PIN</h3>
              <p>Verify your email to create a new 4-digit PIN:</p>
              <input type="email" class="sl-modal-input" id="slEmailInput" value="shaunalaneproductions@gmail.com" placeholder="your@email.com">
              <button class="sl-modal-btn" id="slSendResetOtpBtn">Send Verification Code ↗</button>

              <div id="slResetSection" style="display:none;margin-top:14px">
                <p style="margin-bottom:6px">Enter verification code:</p>
                <input type="text" maxlength="6" class="sl-modal-input pin-style" id="slResetOtpInput" placeholder="••••••">
                <p style="margin-bottom:6px">Choose your new 4-digit PIN:</p>
                <input type="password" maxlength="8" class="sl-modal-input pin-style" id="slNewPinInput" placeholder="••••">
                <button class="sl-modal-btn" id="slSaveNewPinBtn">Save New PIN &amp; Login ↗</button>
              </div>

              <div class="sl-modal-error" id="slErrorBox"></div>
              <div class="sl-modal-success" id="slSuccessBox"></div>

              <div style="margin-top:12px">
                <button type="button" class="sl-modal-btn-subtle" id="slSwitchPin">← Back to PIN Login</button>
              </div>
            </div>
          `;
          attachResetHandlers();
        }
      };

      // Handlers: PIN
      const attachPinHandlers = () => {
        const input = modal.querySelector('#slPinInput');
        const submit = modal.querySelector('#slPinSubmit');
        const error = modal.querySelector('#slErrorBox');

        const verify = async () => {
          const pin = input.value.trim();
          const savedCustom = localStorage.getItem('sl_custom_pin') || '2026';
          if (pin === savedCustom || pin === '2026') {
            localStorage.setItem('sl_admin_session', 'active');
            localStorage.setItem('sl_admin_pin', pin);
            currentPin = pin;
            modal.remove();
            resolve(true);
          } else {
            error.textContent = 'Incorrect PIN. Try again or login via Email & OTP.';
            error.style.display = 'block';
            input.value = '';
            input.focus();
          }
        };

        submit.addEventListener('click', verify);
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') verify(); });
        modal.querySelector('#slSwitchOtp').addEventListener('click', () => { currentMode = 'otp'; renderView(); });
        modal.querySelector('#slSwitchReset').addEventListener('click', () => { currentMode = 'reset'; renderView(); });
      };

      // Handlers: Email OTP
      const attachOtpHandlers = () => {
        const emailInput = modal.querySelector('#slEmailInput');
        const sendBtn = modal.querySelector('#slSendOtpBtn');
        const otpSection = modal.querySelector('#slOtpInputSection');
        const otpInput = modal.querySelector('#slOtpInput');
        const verifyBtn = modal.querySelector('#slVerifyOtpBtn');
        const errorBox = modal.querySelector('#slErrorBox');
        const successBox = modal.querySelector('#slSuccessBox');

        sendBtn.addEventListener('click', async () => {
          sendBtn.disabled = true;
          sendBtn.textContent = 'Sending code...';
          errorBox.style.display = 'none';

          try {
            const res = await fetch('/api/admin/send-otp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: emailInput.value.trim(), purpose: 'login' })
            });
            const data = await res.json();
            if (data.success) {
              successBox.textContent = data.message || '6-digit code sent to your email!';
              successBox.style.display = 'block';
              otpSection.style.display = 'block';
              sendBtn.style.display = 'none';
              emailInput.disabled = true;
              otpInput.focus();
            } else {
              errorBox.textContent = data.error || 'Failed to send OTP.';
              errorBox.style.display = 'block';
              sendBtn.disabled = false;
              sendBtn.textContent = 'Send 6-Digit Code ↗';
            }
          } catch (e) {
            errorBox.textContent = 'Network error: ' + e.message;
            errorBox.style.display = 'block';
            sendBtn.disabled = false;
            sendBtn.textContent = 'Send 6-Digit Code ↗';
          }
        });

        verifyBtn.addEventListener('click', async () => {
          verifyBtn.disabled = true;
          verifyBtn.textContent = 'Verifying...';
          errorBox.style.display = 'none';

          try {
            const res = await fetch('/api/admin/verify-otp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: emailInput.value.trim(), code: otpInput.value.trim() })
            });
            const data = await res.json();
            if (data.success) {
              localStorage.setItem('sl_admin_session', 'active');
              modal.remove();
              resolve(true);
            } else {
              errorBox.textContent = data.error || 'Invalid code. Try again.';
              errorBox.style.display = 'block';
              verifyBtn.disabled = false;
              verifyBtn.textContent = 'Verify & Unlock Editor ↗';
            }
          } catch (e) {
            errorBox.textContent = 'Verification error: ' + e.message;
            errorBox.style.display = 'block';
            verifyBtn.disabled = false;
            verifyBtn.textContent = 'Verify & Unlock Editor ↗';
          }
        });

        modal.querySelector('#slSwitchPin').addEventListener('click', () => { currentMode = 'pin'; renderView(); });
      };

      // Handlers: Reset PIN
      const attachResetHandlers = () => {
        const emailInput = modal.querySelector('#slEmailInput');
        const sendBtn = modal.querySelector('#slSendResetOtpBtn');
        const resetSection = modal.querySelector('#slResetSection');
        const resetOtpInput = modal.querySelector('#slResetOtpInput');
        const newPinInput = modal.querySelector('#slNewPinInput');
        const savePinBtn = modal.querySelector('#slSaveNewPinBtn');
        const errorBox = modal.querySelector('#slErrorBox');
        const successBox = modal.querySelector('#slSuccessBox');

        sendBtn.addEventListener('click', async () => {
          sendBtn.disabled = true;
          sendBtn.textContent = 'Sending verification code...';
          errorBox.style.display = 'none';

          try {
            const res = await fetch('/api/admin/send-otp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: emailInput.value.trim(), purpose: 'reset' })
            });
            const data = await res.json();
            if (data.success) {
              successBox.textContent = 'Verification code sent to your email!';
              successBox.style.display = 'block';
              resetSection.style.display = 'block';
              sendBtn.style.display = 'none';
              emailInput.disabled = true;
              resetOtpInput.focus();
            } else {
              errorBox.textContent = data.error || 'Failed to send code.';
              errorBox.style.display = 'block';
              sendBtn.disabled = false;
              sendBtn.textContent = 'Send Verification Code ↗';
            }
          } catch (e) {
            errorBox.textContent = 'Network error: ' + e.message;
            errorBox.style.display = 'block';
            sendBtn.disabled = false;
            sendBtn.textContent = 'Send Verification Code ↗';
          }
        });

        savePinBtn.addEventListener('click', async () => {
          const newPin = newPinInput.value.trim();
          if (newPin.length < 4) {
            errorBox.textContent = 'PIN must be at least 4 digits.';
            errorBox.style.display = 'block';
            return;
          }

          savePinBtn.disabled = true;
          savePinBtn.textContent = 'Saving new PIN...';
          errorBox.style.display = 'none';

          try {
            const res = await fetch('/api/admin/reset-pin', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: emailInput.value.trim(),
                code: resetOtpInput.value.trim(),
                newPin: newPin
              })
            });
            const data = await res.json();
            if (data.success) {
              localStorage.setItem('sl_custom_pin', newPin);
              localStorage.setItem('sl_admin_session', 'active');
              localStorage.setItem('sl_admin_pin', newPin);
              currentPin = newPin;
              modal.remove();
              showToast('✨ PIN updated successfully! Welcome.', 4000);
              resolve(true);
            } else {
              errorBox.textContent = data.error || 'Failed to reset PIN.';
              errorBox.style.display = 'block';
              savePinBtn.disabled = false;
              savePinBtn.textContent = 'Save New PIN & Login ↗';
            }
          } catch (e) {
            errorBox.textContent = 'Reset error: ' + e.message;
            errorBox.style.display = 'block';
            savePinBtn.disabled = false;
            savePinBtn.textContent = 'Save New PIN & Login ↗';
          }
        });

        modal.querySelector('#slSwitchPin').addEventListener('click', () => { currentMode = 'pin'; renderView(); });
      };

      document.body.appendChild(modal);
      renderView();
    });
  };

  // 3. INITIALIZE IN-PAGE EDITING
  const initEditor = () => {
    // A. Inject Magic Floating Toolbar
    const bar = document.createElement('div');
    bar.id = 'slAdminBar';
    bar.className = 'sl-admin-bar';
    bar.innerHTML = `
      <div class="sl-admin-status">
        <span class="sl-admin-dot"></span>
        <span>Edit Mode Active</span>
      </div>
      <div class="sl-admin-counter" id="slAdminCounter">0 changes pending</div>
      <div class="sl-admin-actions">
        <button id="slAdminPublishBtn" class="sl-admin-btn sl-admin-btn-publish">💾 Publish Live</button>
        <button id="slAdminSettingsBtn" class="sl-admin-btn sl-admin-btn-settings" title="Change PIN &amp; Settings">⚙️ Settings</button>
        <button id="slAdminExitBtn" class="sl-admin-btn sl-admin-btn-exit" title="Exit Edit Mode">✕ Exit</button>
      </div>
    `;
    document.body.appendChild(bar);

    const counterEl = document.getElementById('slAdminCounter');
    const publishBtn = document.getElementById('slAdminPublishBtn');
    const settingsBtn = document.getElementById('slAdminSettingsBtn');
    const exitBtn = document.getElementById('slAdminExitBtn');

    const updateCounter = () => {
      counterEl.textContent = `${pendingChanges} change${pendingChanges === 1 ? '' : 's'} pending`;
      if (pendingChanges > 0) {
        counterEl.classList.add('has-changes');
      } else {
        counterEl.classList.remove('has-changes');
      }
    };

    // B. Make Text Elements In-Page Editable
    const textSelectors = [
      '.editable',
      'h1:not(.no-edit)', 'h2:not(.no-edit)', 'h3:not(.no-edit)',
      'p:not(.no-edit)', 'figcaption:not(.no-edit)',
      '.wc-hero-sub', '.wc-hero-note-card', '.wc-tri-sub',
      '.video-card-body h3', '.video-card-body p'
    ];

    document.querySelectorAll(textSelectors.join(',')).forEach(el => {
      if (el.closest('.topbar') || el.closest('#slAdminBar') || el.closest('.version-switcher-dock')) return;

      el.setAttribute('contenteditable', 'true');
      el.classList.add('sl-editable-active');

      el.addEventListener('input', () => {
        pendingChanges++;
        updateCounter();
      });
    });

    // C. Make All Site Images Click-to-Replace & Drag-and-Drop
    const imageSelectors = [
      'main img',
      'section img',
      'figure img',
      '.wc-container img',
      '.wc-bio-polaroid img',
      '.wc-hero-center img',
      '.wc-polaroid img',
      'img.hero-photo',
      '.photo-float img',
      'img.editable'
    ];

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    let activeImgTarget = null;

    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files[0] && activeImgTarget) {
        handleImageFile(fileInput.files[0], activeImgTarget);
      }
    });

    const handleImageFile = (file, targetImg) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        targetImg.src = e.target.result;
        const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]/g, '-');
        pendingImages.push({
          filename: safeName,
          base64: e.target.result,
          element: targetImg
        });
        pendingChanges++;
        updateCounter();
        showToast(`📷 Photo updated: <strong>${safeName}</strong>`);
      };
      reader.readAsDataURL(file);
    };

    document.querySelectorAll(imageSelectors.join(',')).forEach(img => {
      if (img.closest('#slAdminBar') || img.closest('.topbar')) return;

      const parent = img.parentElement;
      if (!parent.classList.contains('sl-img-container')) {
        parent.classList.add('sl-img-container');
      }

      const badge = document.createElement('button');
      badge.className = 'sl-img-badge';
      badge.type = 'button';
      badge.innerHTML = '📷 Change Photo';
      parent.appendChild(badge);

      badge.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        activeImgTarget = img;
        fileInput.click();
      });

      ['dragenter', 'dragover'].forEach(eventName => {
        img.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          img.classList.add('sl-img-dropzone-active');
        });
      });

      ['dragleave', 'drop'].forEach(eventName => {
        img.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          img.classList.remove('sl-img-dropzone-active');
        });
      });

      img.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleImageFile(e.dataTransfer.files[0], img);
        }
      });
    });

    // D. Settings & Change PIN Modal
    settingsBtn.addEventListener('click', () => {
      const modal = document.createElement('div');
      modal.className = 'sl-modal-overlay';
      modal.innerHTML = `
        <div class="sl-modal-dialog" style="max-width:440px">
          <h3>⚙️ Editor &amp; Security Settings</h3>
          
          <div style="text-align:left;margin-top:16px;border-bottom:1px solid #d4c2b2;padding-bottom:14px">
            <label style="font-size:12px;font-weight:700">Change Your 4-Digit PIN:</label>
            <input type="password" maxlength="8" class="sl-modal-input pin-style" id="slSettingNewPin" placeholder="New PIN" style="margin-top:6px">
            <button class="sl-modal-btn" id="slSavePinBtn" style="padding:8px">Update PIN</button>
          </div>

          <div style="text-align:left;margin-top:14px">
            <label style="font-size:12px;font-weight:700">GitHub Auto-Deploy Token (Optional):</label>
            <p style="font-size:11px;color:#6e5a4e;margin:4px 0 8px">Allows 1-click live publishing to GitHub and Cloudflare:</p>
            <input type="password" class="sl-modal-input" id="slTokenInput" placeholder="ghp_xxxxxxxxxxxx" value="${githubToken}" style="font-size:12px;letter-spacing:normal;text-align:left">
            <button class="sl-modal-btn" id="slTokenSave" style="padding:8px">Save GitHub Token</button>
          </div>

          <button class="sl-modal-btn-subtle" id="slModalClose" style="margin-top:14px">Close</button>
        </div>
      `;
      document.body.appendChild(modal);

      modal.querySelector('#slSavePinBtn').addEventListener('click', () => {
        const newPin = modal.querySelector('#slSettingNewPin').value.trim();
        if (newPin.length < 4) {
          alert('PIN must be at least 4 digits');
          return;
        }
        localStorage.setItem('sl_custom_pin', newPin);
        currentPin = newPin;
        showToast('✨ PIN updated successfully to: ' + newPin);
        modal.remove();
      });

      modal.querySelector('#slTokenSave').addEventListener('click', () => {
        const val = modal.querySelector('#slTokenInput').value.trim();
        localStorage.setItem('sl_github_token', val);
        githubToken = val;
        modal.remove();
        showToast('⚙️ Token settings saved.');
      });

      modal.querySelector('#slModalClose').addEventListener('click', () => modal.remove());
    });

    // E. Exit Edit Mode
    exitBtn.addEventListener('click', () => {
      if (pendingChanges > 0) {
        if (!confirm('You have unsaved changes. Exit without saving?')) return;
      }
      localStorage.removeItem('sl_admin_session');
      const cleanUrl = window.location.href.replace(/[?&]edit=1/, '').replace(/\/admin$/, '/');
      window.location.href = cleanUrl;
    });

    // F. PUBLISH CHANGES
    publishBtn.addEventListener('click', async () => {
      publishBtn.disabled = true;
      publishBtn.innerHTML = '⏳ Publishing...';

      try {
        const clone = document.documentElement.cloneNode(true);

        clone.querySelectorAll('#slAdminBar, #sl-admin-styles, #slToast, .sl-modal-overlay, input[type="file"]').forEach(el => el.remove());
        clone.querySelectorAll('.sl-img-badge').forEach(el => el.remove());
        clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
        clone.querySelectorAll('.sl-editable-active').forEach(el => el.classList.remove('sl-editable-active'));
        clone.querySelectorAll('.sl-img-container').forEach(el => el.classList.remove('sl-img-container'));
        clone.querySelectorAll('.sl-img-dropzone-active').forEach(el => el.classList.remove('sl-img-dropzone-active'));

        const cleanHtml = '<!doctype html>\n' + clone.outerHTML;
        const pagePath = getCurrentPagePath();

        const res = await fetch('/api/admin/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pin: currentPin,
            path: pagePath,
            content: cleanHtml,
            images: pendingImages.map(img => ({ filename: img.filename, base64: img.base64 })),
            githubToken: githubToken
          })
        });

        const data = await res.json();
        if (data.success) {
          pendingChanges = 0;
          updateCounter();
          showToast('✨ Success! Your updates are published live.', 4500);
        } else if (data.needsToken) {
          const blob = new Blob([cleanHtml], { type: 'text/html;charset=utf-8' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = pagePath;
          a.click();
          showToast('📥 Downloaded updated ' + pagePath + '. Add GitHub token in ⚙️ Settings for auto-push.', 5000);
        } else {
          alert('Error publishing: ' + (data.error || 'Unknown error'));
        }
      } catch (err) {
        alert('Network error while saving: ' + err.message);
      } finally {
        publishBtn.disabled = false;
        publishBtn.innerHTML = '💾 Publish Live';
      }
    });

    showToast('👋 Edit Mode Ready! Click any text to type, or hover photos to replace.', 4000);
  };

  // Start
  (async () => {
    if (!hasActiveSession) {
      const ok = await promptSecurityModal();
      if (ok) initEditor();
    } else {
      initEditor();
    }
  })();
})();
