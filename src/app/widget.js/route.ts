import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ||
    `${request.nextUrl.protocol}//${request.nextUrl.host}`;

  const script = `(function() {
  if (window.__agenteIaWidgetLoaded) return;
  window.__agenteIaWidgetLoaded = true;

  var scriptEl = document.currentScript || document.querySelector('script[data-tenant]');
  var tenant = scriptEl ? scriptEl.getAttribute('data-tenant') : 'clinica-demo';
  var color = (scriptEl && scriptEl.getAttribute('data-color')) || '#4f46e5';
  var label = (scriptEl && scriptEl.getAttribute('data-label')) || '¿Dudas o citas?';
  var baseUrl = '${origin}';

  var style = document.createElement('style');
  style.textContent =
    '#agente-ia-widget-panel{transition:opacity .2s ease,transform .2s ease;opacity:0;transform:translateY(12px) scale(.98);pointer-events:none;}' +
    '#agente-ia-widget-panel.open{opacity:1;transform:translateY(0) scale(1);pointer-events:auto;}' +
    '@media(max-width:639px){#agente-ia-widget-panel.open{position:fixed!important;inset:0!important;width:100vw!important;max-width:100vw!important;height:100dvh!important;max-height:100dvh!important;margin:0!important;border-radius:0!important;z-index:2147483647!important;}}';
  document.head.appendChild(style);

  var container = document.createElement('div');
  container.id = 'agente-ia-widget-root';
  container.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:2147483647;font-family:system-ui,-apple-system,sans-serif;';

  var iframeWrap = document.createElement('div');
  iframeWrap.id = 'agente-ia-widget-panel';
  iframeWrap.style.cssText = 'display:none;width:390px;max-width:calc(100vw - 32px);height:580px;max-height:calc(100vh - 104px);margin-bottom:12px;border-radius:18px;overflow:hidden;box-shadow:0 24px 60px rgba(15,23,42,0.24);border:1px solid rgba(15,23,42,0.08);background:#fff;';

  var iframe = null;

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.setAttribute('aria-label', label);
  btn.style.cssText = 'display:inline-flex;align-items:center;gap:10px;padding:12px 18px;border-radius:9999px;border:none;cursor:pointer;color:#fff;font-weight:600;font-size:14px;box-shadow:0 12px 28px rgba(15,23,42,0.22);background:' + color + ';margin-left:auto;';

  var chatSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
  var dotHtml = '<span style="width:8px;height:8px;border-radius:9999px;background:#34d399;display:inline-block;box-shadow:0 0 0 2px rgba(255,255,255,0.35);"></span>';

  function renderBtn(isOpen) {
    btn.innerHTML = isOpen ? 'Cerrar chat ✕' : (chatSvg + '<span>' + label.replace(/</g, '&lt;') + '</span>' + dotHtml);
  }
  renderBtn(false);

  var open = false;
  function setOpen(next) {
    open = next;
    if (open) {
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.src = baseUrl + '/embed/' + encodeURIComponent(tenant);
        iframe.style.cssText = 'width:100%;height:100%;border:0;';
        iframe.title = 'Asistente Virtual';
        iframeWrap.appendChild(iframe);
      }
      iframeWrap.style.display = 'block';
      requestAnimationFrame(function() { iframeWrap.classList.add('open'); });
    } else {
      iframeWrap.classList.remove('open');
      setTimeout(function() { if (!open) iframeWrap.style.display = 'none'; }, 200);
    }
    renderBtn(open);
  }

  btn.addEventListener('click', function() { setOpen(!open); });

  window.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && open) setOpen(false);
  });

  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'agenteia:close' && open) {
      setOpen(false);
    }
  });

  container.appendChild(iframeWrap);
  container.appendChild(btn);
  document.body.appendChild(container);
})();`;

  return new NextResponse(script, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
