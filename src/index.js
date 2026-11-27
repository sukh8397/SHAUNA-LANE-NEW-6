export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const host = url.hostname.toLowerCase();

    // 0. ADMIN ROUTE & MAGIC EDITOR API
    if (url.pathname === "/admin") {
      return Response.redirect(`${url.protocol}//${host}/?edit=1`, 302);
    }

    if (url.pathname === "/api/admin/auth") {
      if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
      try {
        const body = await request.json();
        const pin = (body.pin || "").trim();
        const validPin = env.ADMIN_PIN || "2026";
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

    if (url.pathname === "/api/admin/save") {
      if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
      try {
        const body = await request.json();
        const { pin, path, content, images, githubToken } = body;
        const validPin = env.ADMIN_PIN || "2026";
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
