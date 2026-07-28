const items = [
  ["/", "Protocolos", "Protocolos", '<path d="M7.5 8.5h13M7.5 13.5h13M7.5 18.5h13M5 6.5h18a1.8 1.8 0 0 1 1.8 1.8v11.4A1.8 1.8 0 0 1 23 21.5H5a1.8 1.8 0 0 1-1.8-1.8V8.3A1.8 1.8 0 0 1 5 6.5ZM10.5 6.5v15M17.5 6.5v15"/>'],
  ["/agenda.html", "Consultar Agenda", "Agenda", '<rect x="6.5" y="7.5" width="15" height="13" rx="2"/><path d="M10 5.5v4M18 5.5v4M6.5 11h15M10 14h2.2M15 14h2.2M10 17h2.2M15 17h2.2"/>'],
  ["/arvores.html", "Árvores Genealógicas", "Árvores", '<path d="M14 23V10M14 15c-4-.6-6.8-3.1-7.6-6.6 4.4-.4 7.1 2 7.6 6.6ZM14 18.5c4.6-.5 7.5-3.1 8.3-7-4.8-.4-7.8 2.2-8.3 7ZM14 10.5c2.8-.5 4.5-2.5 4.6-5.4-3.1.1-4.9 2.2-4.6 5.4ZM10 23h8"/>'],
  ["/certidoes.html", "Leitor de Certidões", "Certidões", '<path d="M8.5 6.5h11a2 2 0 0 1 2 2v13l-3-1.5-3 1.5-3-1.5-3 1.5-3-1.5v-13a2 2 0 0 1 2-2ZM10.5 10.5h7M10.5 13.5h7M10.5 16.5h4"/>'],
  ["/qrcode.html", "Gerador de QR Code", "QR Code", '<path d="M7.5 7.5h5v5h-5zM15.5 7.5h5v5h-5zM7.5 15.5h5v5h-5zM16 16h1.8v1.8H16zM19.3 16h1.2v4.5h-4.5v-1.2"/>'],
  ["/configuracoes.html", "Configurações", "Configurações", '<path d="M14 9.2a4.8 4.8 0 1 0 0 9.6 4.8 4.8 0 0 0 0-9.6ZM14 5.4v2.1M14 20.5v2.1M5.4 14h2.1M20.5 14h2.1M7.9 7.9l1.5 1.5M18.6 18.6l1.5 1.5M20.1 7.9l-1.5 1.5M9.4 18.6l-1.5 1.5"/>']
];

const aside = document.querySelector(".studio-topbar");
if (aside) {
  const current = location.pathname === "/index.html" ? "/" : location.pathname;
  aside.innerHTML = `<div class="studio-identity"><a class="brand-block" href="/" aria-label="Ir para a página inicial dos Protocolos"><span class="brand-mark" aria-hidden="true"><svg class="brand-column-icon" viewBox="0 0 28 28"><path d="M7.2 5.6h13.6l1.8 2.3v1.2H5.4V7.9l1.8-2.3ZM6.3 19.7h15.4l1.1 1.7v1H5.2v-1l1.1-1.7Z" fill="currentColor" opacity=".95"/><path d="M8 10.2h12v1.7H8v-1.7ZM8.6 17.8h10.8v1.4H8.6v-1.4Z" fill="currentColor" opacity=".42"/><path d="M9.6 11.5h1.8v6.9H9.6v-6.9Zm3.1 0h2.6v6.9h-2.6v-6.9Zm3.9 0h1.8v6.9h-1.8v-6.9Z" fill="currentColor"/></svg></span><span class="brand-copy"><span class="eyebrow">Cartório</span><strong>Protocolos</strong></span></a></div><nav class="studio-switcher" aria-label="Navegação principal">${items.map(([href,title,label,paths]) => `<a class="studio-switcher-link${current === href ? " is-active" : ""}" href="${href}" title="${title}" data-nav-label="${label}"><span class="studio-nav-icon" aria-hidden="true"><svg viewBox="0 0 28 28">${paths}</svg></span><span>${label}</span></a>`).join("")}</nav>`;
}
