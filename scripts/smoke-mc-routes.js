const routes = ["/mission-control", "/studio", "/review", "/company", "/missions/demo"];

(async () => {
  const results = [];
  for (const r of routes) {
    const t = Date.now();
    try {
      const res = await fetch(`http://localhost:3000${r}`);
      const html = await res.text();
      results.push({
        route: r,
        status: res.status,
        ok: res.status < 500,
        hasMcChrome:
          html.includes("mc-root") ||
          html.includes("mc-header") ||
          html.includes("Mission Control") ||
          html.includes("Studio") ||
          html.includes("Review") ||
          html.includes("Company OS") ||
          html.includes("COMPANY"),
        noWhiteSurfaceFallback: !html.includes("--fhis-color-surface, #fff"),
        ms: Date.now() - t,
        len: html.length,
      });
    } catch (e) {
      results.push({ route: r, error: String(e) });
    }
  }
  console.log(JSON.stringify(results, null, 2));
  const failed = results.filter((x) => x.error || x.ok === false);
  if (failed.length) process.exit(1);
})();
