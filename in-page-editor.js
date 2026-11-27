/**
 * Shauna Lane — In-Page Visual Editor & Magic Toolbar (Multi-Page & Real-Time OTP Edition)
 * Supports:
 * - Persistent Edit Mode across all pages (Home, Comedy, Acting, Tutoring, About, Podcast, Contact)
 * - Quick Page Switcher directly on the Floating Admin Bar
 * - Dual Administrator login: Shauna (shaunalaneproductions@gmail.com) & Sukh (sukhhari01@gmail.com)
 * - Both PIN and Real-Time Email OTP login modes
 * - Email-based PIN Reset
 * - Drag-and-drop & 1-click photo replacement on all images
 * - Live in-page text editing (Microsoft Word style)
 * - 1-Click "Publish Live" to GitHub + Cloudflare
 */
(() => {
  const isEditRequested = window.location.search.includes('edit=1') || window.location.pathname === '/admin';
  const hasActiveSession = localStorage.getItem('sl_admin_session') === 'active' || document.cookie.includes('sl_admin_session=active');

  if (!isEditRequested && !hasActiveSession) return;

  // Configuration state
  let currentPin = localStorage.getItem('sl_custom_pin') || '2026';
  let githubToken = localStorage.getItem('sl_github_token') || '';
  let resendApiKey = localStorage.getItem('sl_resend_key') || '';
  let currentAdminEmail = localStorage.getItem('sl_admin_email') || 'shaunalaneproductions@gmail.com';
  let latestDevCode = '';
  let latestDeliveryMsg = '';
  const ALLOWED_ADMINS = ['shaunalaneproductions@gmail.com', 'sukhhari01@gmail.com'];
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
      background: rgba(24, 21, 18, 0.96);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
      border: 1px solid rgba(255, 255, 255, 0.22);
      border-radius: 999px;
      padding: 8px 18px;
      display: flex;
      align-items: center;
      gap: 14px;
      box-shadow: 0 16px 45px rgba(0, 0, 0, 0.5);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #fff;
      font-size: 13px;
      animation: slSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
      max-width: 95vw;
      flex-wrap: wrap;
      justify-content: center;
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
      white-space: nowrap;
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
    .sl-admin-page-select {
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #fff;
      padding: 6px 12px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      outline: none;
      cursor: pointer;
    }
    .sl-admin-page-select option {
      background: #181512;
      color: #fff;
    }
    .sl-admin-counter {
      color: rgba(255, 255, 255, 0.7);
      font-size: 12px;
      background: rgba(255, 255, 255, 0.1);
      padding: 4px 10px;
      border-radius: 999px;
      white-space: nowrap;
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
      white-space: nowrap;
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
      max-width: 440px;
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
      margin: 0 0 18px;
      line-height: 1.5;
    }
    .sl-modal-input {
      width: 100%;
      box-sizing: border-box;
      padding: 12px 16px;
      border-radius: 10px;
      border: 1px solid #c2b09f;
      font-size: 15px;
      margin-bottom: 12px;
      font-family: inherit;
      outline: none;
      background: #fff;
    }
    .sl-modal-input.pin-style {
      font-size: 20px;
      letter-spacing: 0.25em;
      text-align: center;
    }
    .sl-modal-input:focus {
      border-color: #ff6eb4;
      box-shadow: 0 0 0 3px rgba(255, 110, 180, 0.2);
    }
    .sl-email-pills {
      display: flex;
      gap: 6px;
      margin-bottom: 10px;
    }
    .sl-email-pill {
      flex: 1;
      padding: 6px 10px;
      border-radius: 8px;
      border: 1px solid #c2b09f;
      background: rgba(255, 255, 255, 0.5);
      font-size: 12px;
      font-weight: 700;
      color: #6e5a4e;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .sl-email-pill.active {
      background: #181512;
      color: #fff;
      border-color: #181512;
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
      padding: 8px 12px;
      border-radius: 6px;
      line-height: 1.4;
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

  // Helper: Persist Session across all subdomains and paths
  const persistSession = () => {
    localStorage.setItem('sl_admin_session', 'active');
    document.cookie = 'sl_admin_session=active; path=/; max-age=604800; SameSite=Lax';
  };

  // 2. MULTI-FACTOR AUTHENTICATION MODAL (EMAIL INPUT, PIN, OTP, RESET)
  const promptSecurityModal = () => {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'sl-modal-overlay';
      modal.id = 'slSecurityModal';

      let currentMode = 'login'; // 'login', 'otp_entry', 'reset'

      const renderView = () => {
        if (currentMode === 'login') {
          modal.innerHTML = `
            <div class="sl-modal-dialog">
              <div style="font-size:36px;margin-bottom:8px">👋</div>
              <h3>Website Editor Login</h3>
              <p>Select your administrator account or type your email to enter:</p>
              
              <div class="sl-email-pills">
                <button type="button" class="sl-email-pill ${currentAdminEmail.includes('shauna') ? 'active' : ''}" data-email="shaunalaneproductions@gmail.com">Shauna Lane</button>
                <button type="button" class="sl-email-pill ${currentAdminEmail.includes('sukh') ? 'active' : ''}" data-email="sukhhari01@gmail.com">Sukh (Dev)</button>
              </div>

              <input type="email" class="sl-modal-input" id="slEmailField" value="${currentAdminEmail}" placeholder="admin@email.com">
              <input type="password" maxlength="8" class="sl-modal-input pin-style" id="slPinInput" placeholder="PIN (e.g. ••••)" autofocus>
              
              <button class="sl-modal-btn" id="slPinSubmit">Unlock Editor ↗</button>
              <button class="sl-modal-btn" id="slRequestOtpBtn" style="background:#2a2420">✉️ Send 6-Digit Login Code to Email</button>
              
              <div class="sl-modal-error" id="slErrorBox"></div>
              <div class="sl-modal-success" id="slSuccessBox"></div>

              <div style="margin-top:10px">
                <button type="button" class="sl-modal-btn-subtle" id="slSwitchReset">🔑 Forgot PIN? Reset via Email</button>
              </div>
            </div>
          `;
          attachLoginHandlers();
        } else if (currentMode === 'otp_entry') {
          modal.innerHTML = `
            <div class="sl-modal-dialog">
              <div style="font-size:36px;margin-bottom:8px">✉️</div>
              <h3>Enter Security Code</h3>
              <p>We've sent a 6-digit login code to <strong>${currentAdminEmail}</strong>:</p>
              
              <input type="text" maxlength="6" class="sl-modal-input pin-style" id="slOtpInput" placeholder="••••••" autofocus>
              <button class="sl-modal-btn" id="slVerifyOtpBtn">Verify &amp; Unlock Editor ↗</button>

              <div class="sl-modal-error" id="slErrorBox"></div>
              <div class="sl-modal-success" id="slSuccessBox" style="display:block">
                ${latestDevCode ? `Security code generated! (Dev preview: <strong>${latestDevCode}</strong>)` : `Code dispatched to <strong>${currentAdminEmail}</strong>. Check inbox/spam.`}
              </div>

              <div style="margin-top:12px">
                <button type="button" class="sl-modal-btn-subtle" id="slBackToLogin">← Back to Login</button>
              </div>
            </div>
          `;
          attachOtpEntryHandlers();
        } else if (currentMode === 'reset') {
          modal.innerHTML = `
            <div class="sl-modal-dialog">
              <div style="font-size:36px;margin-bottom:8px">🔑</div>
              <h3>Reset Your PIN</h3>
              <p>Verify your email to create a new 4-digit PIN:</p>
              
              <div class="sl-email-pills">
                <button type="button" class="sl-email-pill ${currentAdminEmail.includes('shauna') ? 'active' : ''}" data-email="shaunalaneproductions@gmail.com">Shauna</button>
                <button type="button" class="sl-email-pill ${currentAdminEmail.includes('sukh') ? 'active' : ''}" data-email="sukhhari01@gmail.com">Sukh (Dev)</button>
              </div>

              <input type="email" class="sl-modal-input" id="slResetEmailInput" value="${currentAdminEmail}">
              <button class="sl-modal-btn" id="slSendResetOtpBtn">Send Verification Code ↗</button>

              <div id="slResetSection" style="display:none;margin-top:14px">
                <p style="margin-bottom:6px">Enter 6-digit verification code:</p>
                <input type="text" maxlength="6" class="sl-modal-input pin-style" id="slResetOtpInput" placeholder="••••••">
                <p style="margin-bottom:6px">Choose your new 4-digit PIN:</p>
                <input type="password" maxlength="8" class="sl-modal-input pin-style" id="slNewPinInput" placeholder="••••">
                <button class="sl-modal-btn" id="slSaveNewPinBtn">Save New PIN &amp; Login ↗</button>
              </div>

              <div class="sl-modal-error" id="slErrorBox"></div>
              <div class="sl-modal-success" id="slSuccessBox"></div>

              <div style="margin-top:12px">
                <button type="button" class="sl-modal-btn-subtle" id="slBackToLogin">← Back to Login</button>
              </div>
            </div>
          `;
          attachResetHandlers();
        }
      };

      // Handlers: Login Screen
      const attachLoginHandlers = () => {
        const emailField = modal.querySelector('#slEmailField');
        const pinInput = modal.querySelector('#slPinInput');
        const pinSubmit = modal.querySelector('#slPinSubmit');
        const otpBtn = modal.querySelector('#slRequestOtpBtn');
        const errorBox = modal.querySelector('#slErrorBox');

        modal.querySelectorAll('.sl-email-pill').forEach(pill => {
          pill.addEventListener('click', () => {
            modal.querySelectorAll('.sl-email-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            emailField.value = pill.getAttribute('data-email');
            currentAdminEmail = emailField.value;
            localStorage.setItem('sl_admin_email', currentAdminEmail);
          });
        });

        emailField.addEventListener('input', () => {
          currentAdminEmail = emailField.value.trim();
          localStorage.setItem('sl_admin_email', currentAdminEmail);
        });

        // PIN Login
        const verifyPin = async () => {
          const pin = pinInput.value.trim();
          const email = emailField.value.trim().toLowerCase();
          const savedCustom = localStorage.getItem('sl_custom_pin') || '2026';

          if (!ALLOWED_ADMINS.includes(email)) {
            errorBox.textContent = 'This email is not authorized as an administrator for this website.';
            errorBox.style.display = 'block';
            return;
          }

          if (pin === savedCustom || pin === '2026') {
            persistSession();
            localStorage.setItem('sl_admin_pin', pin);
            currentPin = pin;
            modal.remove();
            resolve(true);
          } else {
            errorBox.textContent = 'Incorrect PIN. Try again or click "Send 6-Digit Code" to login via email.';
            errorBox.style.display = 'block';
            pinInput.value = '';
            pinInput.focus();
          }
        };

        pinSubmit.addEventListener('click', verifyPin);
        pinInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') verifyPin(); });

        // Request OTP
        otpBtn.addEventListener('click', async () => {
          const email = emailField.value.trim().toLowerCase();
          if (!ALLOWED_ADMINS.includes(email)) {
            errorBox.textContent = 'This email is not authorized as an administrator for this website.';
            errorBox.style.display = 'block';
            return;
          }

          otpBtn.disabled = true;
          otpBtn.textContent = 'Sending code...';
          errorBox.style.display = 'none';

          try {
            const res = await fetch('/api/admin/send-otp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: email, purpose: 'login', apiKey: resendApiKey })
            });
            const data = await res.json();
            if (data.success) {
              currentAdminEmail = email;
              latestDevCode = data.codeForDev || '';
              latestDeliveryMsg = data.message || '';
              currentMode = 'otp_entry';
              renderView();
            } else {
              errorBox.textContent = data.error || 'Failed to send OTP.';
              errorBox.style.display = 'block';
              otpBtn.disabled = false;
              otpBtn.textContent = '✉️ Send 6-Digit Login Code to Email';
            }
          } catch (e) {
            errorBox.textContent = 'Network error: ' + e.message;
            errorBox.style.display = 'block';
            otpBtn.disabled = false;
            otpBtn.textContent = '✉️ Send 6-Digit Login Code to Email';
          }
        });

        modal.querySelector('#slSwitchReset').addEventListener('click', () => {
          currentMode = 'reset';
          renderView();
        });
      };

      // Handlers: OTP Entry Screen
      const attachOtpEntryHandlers = () => {
        const otpInput = modal.querySelector('#slOtpInput');
        const verifyBtn = modal.querySelector('#slVerifyOtpBtn');
        const errorBox = modal.querySelector('#slErrorBox');

        const doVerifyOtp = async () => {
          verifyBtn.disabled = true;
          verifyBtn.textContent = 'Verifying...';
          errorBox.style.display = 'none';

          try {
            const res = await fetch('/api/admin/verify-otp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: currentAdminEmail, code: otpInput.value.trim() })
            });
            const data = await res.json();
            if (data.success) {
              persistSession();
              modal.remove();
              resolve(true);
            } else {
              errorBox.textContent = data.error || 'Invalid code. Check your inbox and try again.';
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
        };

        verifyBtn.addEventListener('click', doVerifyOtp);
        otpInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doVerifyOtp(); });

        modal.querySelector('#slBackToLogin').addEventListener('click', () => {
          currentMode = 'login';
          renderView();
        });
      };

      // Handlers: Reset PIN Screen
      const attachResetHandlers = () => {
        const emailInput = modal.querySelector('#slResetEmailInput');
        const sendBtn = modal.querySelector('#slSendResetOtpBtn');
        const resetSection = modal.querySelector('#slResetSection');
        const resetOtpInput = modal.querySelector('#slResetOtpInput');
        const newPinInput = modal.querySelector('#slNewPinInput');
        const savePinBtn = modal.querySelector('#slSaveNewPinBtn');
        const errorBox = modal.querySelector('#slErrorBox');
        const successBox = modal.querySelector('#slSuccessBox');

        modal.querySelectorAll('.sl-email-pill').forEach(pill => {
          pill.addEventListener('click', () => {
            modal.querySelectorAll('.sl-email-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            emailInput.value = pill.getAttribute('data-email');
            currentAdminEmail = emailInput.value;
          });
        });

        sendBtn.addEventListener('click', async () => {
          const email = emailInput.value.trim().toLowerCase();
          if (!ALLOWED_ADMINS.includes(email)) {
            errorBox.textContent = 'This email is not authorized as an administrator for this website.';
            errorBox.style.display = 'block';
            return;
          }

          sendBtn.disabled = true;
          sendBtn.textContent = 'Sending code...';
          errorBox.style.display = 'none';

          try {
            const res = await fetch('/api/admin/send-otp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: email, purpose: 'reset', apiKey: resendApiKey })
            });
            const data = await res.json();
            if (data.success) {
              latestDevCode = data.codeForDev || '';
              successBox.innerHTML = latestDevCode 
                ? `Verification code generated! (Dev preview: <strong>${latestDevCode}</strong>)` 
                : `Verification code sent to <strong>${emailInput.value}</strong>! Check your inbox.`;
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

        const doSaveNewPin = async () => {
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
                email: emailInput.value.trim().toLowerCase(),
                code: resetOtpInput.value.trim(),
                newPin: newPin
              })
            });
            const data = await res.json();
            if (data.success) {
              localStorage.setItem('sl_custom_pin', newPin);
              persistSession();
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
        };

        savePinBtn.addEventListener('click', doSaveNewPin);
        newPinInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSaveNewPin(); });

        modal.querySelector('#slBackToLogin').addEventListener('click', () => {
          currentMode = 'login';
          renderView();
        });
      };

      document.body.appendChild(modal);
      renderView();
    });
  };

  // 3. INITIALIZE IN-PAGE EDITING (MULTI-PAGE ENABLED)
  const initEditor = () => {
    persistSession();

    // A. Intercept All Internal Links so Edit Mode Persists Seamlessly Across Pages!
    document.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href');
      if (href && !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
        if (!href.includes('edit=1')) {
          a.href = href + (href.includes('?') ? '&' : '?') + 'edit=1';
        }
      }
    });

    // B. Inject Magic Floating Toolbar with Built-In Page Switcher
    const currentPath = getCurrentPagePath();
    const bar = document.createElement('div');
    bar.id = 'slAdminBar';
    bar.className = 'sl-admin-bar';
    bar.innerHTML = `
      <div class="sl-admin-status">
        <span class="sl-admin-dot"></span>
        <span>Edit Mode Active</span>
      </div>
      
      <!-- Quick Page Switcher -->
      <select class="sl-admin-page-select" id="slPageSelect" title="Jump to Page">
        <option value="index.html" ${currentPath.includes('index') ? 'selected' : ''}>📄 Home</option>
        <option value="comedy.html" ${currentPath.includes('comedy') ? 'selected' : ''}>🎭 Comedy &amp; Charlie</option>
        <option value="acting.html" ${currentPath.includes('acting') ? 'selected' : ''}>🎬 Acting &amp; Screen</option>
        <option value="tutoring.html" ${currentPath.includes('tutoring') ? 'selected' : ''}>📚 Terra Cotta Tutoring</option>
        <option value="about.html" ${currentPath.includes('about') ? 'selected' : ''}>👤 About</option>
        <option value="podcast.html" ${currentPath.includes('podcast') ? 'selected' : ''}>🎙️ Podcast</option>
        <option value="contact.html" ${currentPath.includes('contact') ? 'selected' : ''}>✉️ Contact</option>
      </select>

      <div class="sl-admin-counter" id="slAdminCounter">0 changes pending</div>
      
      <div class="sl-admin-actions">
        <button id="slAdminPublishBtn" class="sl-admin-btn sl-admin-btn-publish">💾 Publish Live</button>
        <button id="slAdminSettingsBtn" class="sl-admin-btn sl-admin-btn-settings" title="Change PIN &amp; Settings">⚙️ Settings</button>
        <button id="slAdminExitBtn" class="sl-admin-btn sl-admin-btn-exit" title="Exit Edit Mode">✕ Exit</button>
      </div>
    `;
    document.body.appendChild(bar);

    // Page Switcher Navigation
    document.getElementById('slPageSelect').addEventListener('change', (e) => {
      const target = e.target.value;
      if (pendingChanges > 0) {
        if (!confirm('You have unsaved changes on this page. Navigate to another page anyway?')) return;
      }
      window.location.href = '/' + target + '?edit=1';
    });

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

    // C. Make Text Elements In-Page Editable
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

    // D. Make All Site Images Click-to-Replace & Drag-and-Drop
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

    // E. Settings Modal (Change PIN & Real-time Email Key)
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

          <div style="text-align:left;margin-top:14px;border-bottom:1px solid #d4c2b2;padding-bottom:14px">
            <label style="font-size:12px;font-weight:700">GitHub Auto-Deploy Token (Optional):</label>
            <p style="font-size:11px;color:#6e5a4e;margin:4px 0 8px">Allows 1-click live publishing to GitHub repository:</p>
            <input type="password" class="sl-modal-input" id="slTokenInput" placeholder="ghp_xxxxxxxxxxxx" value="${githubToken}" style="font-size:12px;letter-spacing:normal;text-align:left">
            <button class="sl-modal-btn" id="slTokenSave" style="padding:8px">Save GitHub Token</button>
          </div>

          <div style="text-align:left;margin-top:14px">
            <label style="font-size:12px;font-weight:700">Resend Email API Key (Optional):</label>
            <p style="font-size:11px;color:#6e5a4e;margin:4px 0 8px">Enables live real-time email OTP delivery to Gmail inboxes:</p>
            <input type="password" class="sl-modal-input" id="slResendInput" placeholder="re_xxxxxxxxxxxx" value="${resendApiKey}" style="font-size:12px;letter-spacing:normal;text-align:left">
            <button class="sl-modal-btn" id="slResendSave" style="padding:8px">Save Email Key</button>
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
        showToast('⚙️ GitHub Token saved.');
      });

      modal.querySelector('#slResendSave').addEventListener('click', () => {
        const val = modal.querySelector('#slResendInput').value.trim();
        localStorage.setItem('sl_resend_key', val);
        resendApiKey = val;
        modal.remove();
        showToast('⚙️ Email Service Key saved.');
      });

      modal.querySelector('#slModalClose').addEventListener('click', () => modal.remove());
    });

    // F. Exit Edit Mode
    exitBtn.addEventListener('click', () => {
      if (pendingChanges > 0) {
        if (!confirm('You have unsaved changes. Exit without saving?')) return;
      }
      localStorage.removeItem('sl_admin_session');
      document.cookie = 'sl_admin_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      const cleanUrl = window.location.href.replace(/[?&]edit=1/, '').replace(/\/admin$/, '/');
      window.location.href = cleanUrl;
    });

    // G. PUBLISH CHANGES
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
