// GitHub Pages is the public entry point. The shared CRM runs in Apps Script,
// where Google authenticates access and google.script.run reaches the backend.
// Never put the team's connection key in this public file.
(() => {
  const crmUrl = 'https://script.google.com/macros/s/AKfycbwync77WImUjtzw022SUyzYp-7-axJwrUH5m3XpDo2yxykm1lIn0l_FQ0LIMKORZHOVQQ/exec';
  if (location.hostname === 'artesbuhooficial-max.github.io' &&
      location.pathname.startsWith('/noches-de-neon-crm/')) {
    location.replace(crmUrl);
  }
})();
