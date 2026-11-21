export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const host = url.hostname.toLowerCase();

    const isTutoringDomain =
      host === "terracottatutoring.com" ||
      host === "www.terracottatutoring.com";

    const isShaunaLaneDomain =
      host === "shaunalane.com" ||
      host === "www.shaunalane.com";

    // 1. Terra Cotta Tutoring Domain
    if (isTutoringDomain) {
      // Map root "/" and "/index.html" to "tutoring.html"
      if (url.pathname === "/" || url.pathname === "/index.html") {
        const rewritten = new URL(request.url);
        rewritten.pathname = "/tutoring.html";
        return env.ASSETS.fetch(new Request(rewritten, request));
      }

      // Canonical redirect: /tutoring.html -> /
      if (url.pathname === "/tutoring.html") {
        return Response.redirect(`${url.protocol}//${host}/`, 301);
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
