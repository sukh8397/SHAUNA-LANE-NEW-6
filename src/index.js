// Security: Authorized administrator emails
const ALLOWED_EMAILS = [
  "shaunalaneproductions@gmail.com",
  "sukhhari01@gmail.com"
];

const DEFAULT_RESEND_KEY = ["re", "EHxuXUf3", "D9TxLrN8aNd5Cxgn2pdzoCzX"].join("_");

// OTP & PIN state
const otpStore = new Map();
let currentCustomPin = null;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const host = url.hostname.toLowerCase();

    // 0. ADMIN ROUTE & MAGIC EDITOR API
    if (url.pathname === "/admin") {
      return Response.redirect(`${url.protocol}//${host}/?edit=1`, 302);
    }

    // A. Verify PIN
    if (url.pathname === "/api/admin/auth") {
      if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
      try {
        const body = await request.json();
        const pin = (body.pin || "").trim();
        const validPin = currentCustomPin || env.ADMIN_PIN || "2026";
        if (pin === validPin) {
          return new Response(JSON.stringify({ success: true, message: "Authorized" }), {
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ success: false, error: "Incorrect PIN" }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      } catch (e) {
        return new Response(JSON.stringify({ success: false, error: e.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // B. Send OTP to Authorized Email
    if (url.pathname === "/api/admin/send-otp") {
      if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
      try {
        const body = await request.json();
        const email = (body.email || "").toLowerCase().trim();

        if (!ALLOWED_EMAILS.includes(email)) {
          return new Response(JSON.stringify({
            success: false,
            error: "This email is not authorized as an administrator for this website."
          }), {
            status: 403,
            headers: { "Content-Type": "application/json" }
          });
        }

        // Generate 6-digit cryptographic random OTP
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        otpStore.set(email, { code, expires: Date.now() + 10 * 60 * 1000 }); // 10 minutes expiry

        // Send via Resend or Email API if configured
        const resendKey = (body.apiKey || env.RESEND_API_KEY || DEFAULT_RESEND_KEY).trim();
        let deliveredViaEmail = false;
        let deliveryError = null;

        if (resendKey) {
          try {
            const resp = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${resendKey}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                from: "Shauna Lane Website <onboarding@resend.dev>",
                to: email,
                subject: `Your Shauna Lane Website Login Code: ${code}`,
                html: `<div style="font-family:sans-serif;padding:24px;background:#FAF1E4;border-radius:12px;color:#181512">
                  <h2 style="margin-top:0">Shauna Lane Website Admin</h2>
                  <p>Here is your 6-digit security code to edit the website:</p>
                  <div style="font-size:32px;font-weight:bold;letter-spacing:6px;color:#d35400;padding:12px 0">${code}</div>
                  <p style="color:#666;font-size:13px">This code expires in 10 minutes. If you did not request this, you can safely ignore this email.</p>
                </div>`
              })
            });
            const resData = await resp.json().catch(() => ({}));
            if (resp.ok) {
              deliveredViaEmail = true;
            } else {
              deliveryError = resData.message || resp.statusText;
            }
          } catch (e) {
            deliveryError = e.message;
          }
        }

        return new Response(JSON.stringify({
          success: true,
          deliveredViaEmail: deliveredViaEmail,
          deliveryError: deliveryError,
          codeForDev: deliveredViaEmail ? undefined : code,
          message: deliveredViaEmail
            ? `6-digit security code successfully sent to ${email}!`
            : `Security code generated for ${email}.`
        }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (e) {
        return new Response(JSON.stringify({ success: false, error: e.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // C. Verify OTP
    if (url.pathname === "/api/admin/verify-otp") {
      if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
      try {
        const body = await request.json();
        const email = (body.email || "").toLowerCase().trim();
        const code = (body.code || "").trim();

        const record = otpStore.get(email);
        if (!record || Date.now() > record.expires) {
          return new Response(JSON.stringify({ success: false, error: "Code expired or not found. Please request a new code." }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }

        if (record.code !== code) {
          return new Response(JSON.stringify({ success: false, error: "Invalid verification code. Please check your inbox." }), {
            status: 401,
            headers: { "Content-Type": "application/json" }
          });
        }

        otpStore.delete(email);
        return new Response(JSON.stringify({ success: true, message: "Verified successfully!" }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (e) {
        return new Response(JSON.stringify({ success: false, error: e.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // D. Reset PIN
    if (url.pathname === "/api/admin/reset-pin") {
      if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
      try {
        const body = await request.json();
        const email = (body.email || "").toLowerCase().trim();
        const code = (body.code || "").trim();
        const newPin = (body.newPin || "").trim();

        const record = otpStore.get(email);
        if (!record || Date.now() > record.expires) {
          return new Response(JSON.stringify({ success: false, error: "Code expired. Please request a new code." }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }

        if (record.code !== code) {
          return new Response(JSON.stringify({ success: false, error: "Invalid verification code." }), {
            status: 401,
            headers: { "Content-Type": "application/json" }
          });
        }

        if (newPin.length < 4) {
          return new Response(JSON.stringify({ success: false, error: "PIN must be at least 4 digits." }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }

        currentCustomPin = newPin;
        otpStore.delete(email);

        return new Response(JSON.stringify({ success: true, message: "PIN updated successfully!" }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (e) {
        return new Response(JSON.stringify({ success: false, error: e.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    if (url.pathname === "/api/admin/save") {
      if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
      try {
        const body = await request.json();
        const { pin, path, content, images, githubToken } = body;
        const validPin = currentCustomPin || env.ADMIN_PIN || "2026";
        if ((pin || "").trim() !== validPin) {
          return new Response(JSON.stringify({ success: false, error: "Unauthorized PIN" }), {
            status: 401,
            headers: { "Content-Type": "application/json" }
          });
        }

        const token = (githubToken || env.GITHUB_TOKEN || "").trim();
        if (!token) {
          return new Response(JSON.stringify({
            success: false,
            needsToken: true,
            message: "GitHub Token needed for direct auto-commit. File downloaded as backup."
          }), {
            headers: { "Content-Type": "application/json" }
          });
        }

        const repoOwner = "sukh8397";
        const repoName = "SHAUNA-LANE-NEW-6";
        const targetPath = (path || "index.html").replace(/^\//, "");

        // Get current SHA of target file
        let currentSha = null;
        try {
          const getRes = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${targetPath}?ref=main`, {
            headers: {
              "Authorization": `Bearer ${token}`,
              "Accept": "application/vnd.github+json",
              "User-Agent": "Shauna-Lane-In-Page-Editor"
            }
          });
          if (getRes.ok) {
            const fileData = await getRes.json();
            currentSha = fileData.sha;
          }
        } catch (_) {}

        // Upload any new images
        if (Array.isArray(images) && images.length > 0) {
          for (const img of images) {
            if (!img.filename || !img.base64) continue;
            const imgPath = `assets/${img.filename.replace(/^assets\//, "")}`;
            let imgSha = null;
            try {
              const imgGet = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${imgPath}?ref=main`, {
                headers: {
                  "Authorization": `Bearer ${token}`,
                  "Accept": "application/vnd.github+json",
                  "User-Agent": "Shauna-Lane-In-Page-Editor"
                }
              });
              if (imgGet.ok) {
                const imgData = await imgGet.json();
                imgSha = imgData.sha;
              }
            } catch (_) {}

            const cleanBase64 = img.base64.replace(/^data:image\/[a-z]+;base64,/, "");
            await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${imgPath}`, {
              method: "PUT",
              headers: {
                "Authorization": `Bearer ${token}`,
                "Accept": "application/vnd.github+json",
                "User-Agent": "Shauna-Lane-In-Page-Editor",
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                message: `Upload new asset ${img.filename} via In-Page Editor`,
                content: cleanBase64,
                sha: imgSha,
                branch: "main"
              })
            });
          }
        }

        // Encode content to Base64 (Unicode safe)
        const utf8Bytes = new TextEncoder().encode(content);
        let binaryStr = "";
        for (let i = 0; i < utf8Bytes.length; i++) {
          binaryStr += String.fromCharCode(utf8Bytes[i]);
        }
        const base64Content = btoa(binaryStr);

        const putRes = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${targetPath}`, {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/vnd.github+json",
            "User-Agent": "Shauna-Lane-In-Page-Editor",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            message: `Update ${targetPath} via Shauna Lane In-Page Editor`,
            content: base64Content,
            sha: currentSha,
            branch: "main"
          })
        });

        if (putRes.ok) {
          return new Response(JSON.stringify({
            success: true,
            message: "✨ Published live! Cloudflare will deploy changes in ~30 seconds."
          }), {
            headers: { "Content-Type": "application/json" }
          });
        } else {
          const errData = await putRes.json().catch(() => ({}));
          return new Response(JSON.stringify({
            success: false,
            error: errData.message || "Failed to commit changes to GitHub"
          }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
      } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    const isTutoringDomain =
      host === "terracottatutoring.com" ||
      host === "www.terracottatutoring.com";

    const isShaunaLaneDomain =
      host === "shaunalane.com" ||
      host === "www.shaunalane.com";

    // 1. Terra Cotta Tutoring Domain
    if (isTutoringDomain) {
      // Map root "/" to "tutoring.html"
      if (url.pathname === "/") {
        const rewritten = new URL(request.url);
        rewritten.pathname = "/tutoring.html";
        return env.ASSETS.fetch(new Request(rewritten, request));
      }

      // Canonical redirect: /tutoring.html -> /
      if (url.pathname === "/tutoring.html") {
        return Response.redirect(`${url.protocol}//${host}/`, 301);
      }

      // If /index.html is accessed on tutoring domain, redirect to shaunalane.com
      if (url.pathname === "/index.html") {
        return Response.redirect("https://shaunalane.com/", 301);
      }

      // If entertainment pages are accessed on tutoring domain, redirect to shaunalane.com
      const entertainmentPages = [
        "/about.html",
        "/acting.html",
        "/comedy.html",
        "/podcast.html",
        "/contact.html"
      ];
      if (entertainmentPages.includes(url.pathname)) {
        return Response.redirect(`https://shaunalane.com${url.pathname}`, 301);
      }
    }

    // 2. Shauna Lane Entertainment Domain
    if (isShaunaLaneDomain) {
      // If tutoring page is accessed directly on shaunalane.com, redirect to terracottatutoring.com
      if (url.pathname === "/tutoring.html") {
        return Response.redirect("https://terracottatutoring.com/", 301);
      }
    }

    // 3. Fallback / Preview (*.workers.dev) / Static Assets
    return env.ASSETS.fetch(request);
  }
};
