// Embeddable widget loader — single file, no framework
// Include on any site: <script src="https://your-domain.com/widget-loader.js" data-url="https://your-domain.com" async></script>

(function () {
  const script = document.currentScript as HTMLScriptElement | null;
  const APP_URL = script?.getAttribute("data-url") || (script?.src ? new URL(script.src).origin : window.location.origin);
  const WIDGET_URL = `${APP_URL}/widget`;
  const POSITION = script?.getAttribute("data-position") || "bottom-right";

  const STYLES = `
    #rb-bubble {
      position: fixed;
      z-index: 9998;
      ${POSITION.includes("left") ? "left: 20px;" : "right: 20px;"}
      ${POSITION.includes("top") ? "top: 20px;" : "bottom: 20px;"}
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #2563eb;
      box-shadow: 0 4px 16px rgba(0,0,0,0.2);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    #rb-bubble:hover { transform: scale(1.08); box-shadow: 0 6px 20px rgba(0,0,0,0.25); }
    #rb-bubble svg { fill: white; }
    #rb-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: #ef4444;
      color: white;
      border-radius: 999px;
      font-size: 11px;
      width: 18px;
      height: 18px;
      display: none;
      align-items: center;
      justify-content: center;
      font-weight: bold;
    }
    #rb-container {
      position: fixed;
      z-index: 9999;
      ${POSITION.includes("left") ? "left: 16px;" : "right: 16px;"}
      ${POSITION.includes("top") ? "top: 80px;" : "bottom: 80px;"}
      width: min(400px, calc(100vw - 32px));
      height: min(600px, calc(100vh - 100px));
      background: white;
      border-radius: 16px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.18);
      overflow: hidden;
      display: none;
      flex-direction: column;
      transition: opacity 0.2s, transform 0.2s;
      transform-origin: bottom right;
    }
    #rb-container.open {
      display: flex;
      animation: rb-slide-in 0.2s ease;
    }
    @keyframes rb-slide-in {
      from { opacity: 0; transform: scale(0.92) translateY(8px); }
      to   { opacity: 1; transform: scale(1) translateY(0); }
    }
    #rb-iframe {
      width: 100%;
      height: 100%;
      border: none;
    }
    @media (max-width: 480px) {
      #rb-container {
        left: 0; right: 0; bottom: 0;
        width: 100vw;
        height: 85vh;
        border-radius: 16px 16px 0 0;
      }
    }
  `;

  const style = document.createElement("style");
  style.textContent = STYLES;
  document.head.appendChild(style);

  // Bubble button
  const bubble = document.createElement("div");
  bubble.id = "rb-bubble";
  bubble.setAttribute("aria-label", "Prenota un tavolo");
  bubble.setAttribute("role", "button");
  bubble.setAttribute("tabindex", "0");
  bubble.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm6 12H6v-1c0-2 4-3.1 6-3.1s6 1.1 6 3.1v1z"/>
    </svg>
    <div id="rb-badge"></div>
  `;
  document.body.appendChild(bubble);

  // Widget container
  const container = document.createElement("div");
  container.id = "rb-container";
  document.body.appendChild(container);

  let iframe: HTMLIFrameElement | null = null;
  let open = false;

  function toggle() {
    open = !open;
    if (open) {
      container.classList.add("open");
      if (!iframe) {
        iframe = document.createElement("iframe");
        iframe.id = "rb-iframe";
        iframe.src = WIDGET_URL;
        iframe.allow = "clipboard-write";
        container.appendChild(iframe);
      }
    } else {
      container.classList.remove("open");
    }
  }

  bubble.addEventListener("click", toggle);
  bubble.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") toggle();
  });

  // postMessage resize from iframe
  window.addEventListener("message", (e) => {
    if (e.origin !== APP_URL) return;
    if (e.data?.type === "rb-resize" && typeof e.data.height === "number") {
      container.style.height = `min(${e.data.height}px, calc(100vh - 100px))`;
    }
    if (e.data?.type === "rb-close") {
      open = false;
      container.classList.remove("open");
    }
    if (e.data?.type === "rb-booked") {
      // Show badge notification
      const badge = document.getElementById("rb-badge");
      if (badge) { badge.textContent = "1"; badge.style.display = "flex"; }
    }
  });
})();
