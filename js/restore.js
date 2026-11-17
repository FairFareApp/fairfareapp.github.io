// GitHub Pages serves this document at the original missing path.
// Carry that exact path to the SPA, including genuinely unknown routes.
const route = location.pathname + location.search + location.hash;
location.replace("/?__route=" + encodeURIComponent(route));
