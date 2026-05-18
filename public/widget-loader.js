"use strict";(()=>{(function(){let e=document.currentScript,s=(e==null?void 0:e.getAttribute("data-url"))||(e!=null&&e.src?new URL(e.src).origin:window.location.origin),x=`${s}/widget`,r=(e==null?void 0:e.getAttribute("data-position"))||"bottom-right",m=`
    #rb-bubble {
      position: fixed;
      z-index: 9998;
      ${r.includes("left")?"left: 20px;":"right: 20px;"}
      ${r.includes("top")?"top: 20px;":"bottom: 20px;"}
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
      ${r.includes("left")?"left: 16px;":"right: 16px;"}
      ${r.includes("top")?"top: 80px;":"bottom: 80px;"}
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
  `,l=document.createElement("style");l.textContent=m,document.head.appendChild(l);let i=document.createElement("div");i.id="rb-bubble",i.setAttribute("aria-label","Prenota un tavolo"),i.setAttribute("role","button"),i.setAttribute("tabindex","0"),i.innerHTML=`
    <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm6 12H6v-1c0-2 4-3.1 6-3.1s6 1.1 6 3.1v1z"/>
    </svg>
    <div id="rb-badge"></div>
  `,document.body.appendChild(i);let n=document.createElement("div");n.id="rb-container",document.body.appendChild(n);let o=null,a=!1;function b(){a=!a,a?(n.classList.add("open"),o||(o=document.createElement("iframe"),o.id="rb-iframe",o.src=x,o.allow="clipboard-write",n.appendChild(o))):n.classList.remove("open")}i.addEventListener("click",b),i.addEventListener("keydown",t=>{(t.key==="Enter"||t.key===" ")&&b()}),window.addEventListener("message",t=>{var c,p,h;if(t.origin===s&&(((c=t.data)==null?void 0:c.type)==="rb-resize"&&typeof t.data.height=="number"&&(n.style.height=`min(${t.data.height}px, calc(100vh - 100px))`),((p=t.data)==null?void 0:p.type)==="rb-close"&&(a=!1,n.classList.remove("open")),((h=t.data)==null?void 0:h.type)==="rb-booked")){let d=document.getElementById("rb-badge");d&&(d.textContent="1",d.style.display="flex")}})})();})();
