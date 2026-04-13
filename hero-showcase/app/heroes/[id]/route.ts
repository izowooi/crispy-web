import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { decodeSession, SESSION_COOKIE, isAdmin } from "@/lib/session";
import type { Hero } from "@/lib/types";

export const dynamic = "force-dynamic";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildNavBar(
  heroName: string,
  heroUuid: string,
  prevId: string | null,
  nextId: string | null,
  isAdminUser: boolean
): string {
  const name = escapeHtml(heroName);
  const prevHref = prevId ? `/heroes/${prevId}` : null;
  const nextHref = nextId ? `/heroes/${nextId}` : null;

  const btnBase =
    "display:inline-flex;align-items:center;gap:4px;padding:4px 12px;" +
    "font-size:13px;border-radius:6px;border:1px solid rgba(255,255,255,0.25);" +
    "background:transparent;color:#fff;text-decoration:none;white-space:nowrap;";
  const btnActive = btnBase + "opacity:1;cursor:pointer;";
  const btnDisabled = btnBase + "opacity:0.3;cursor:not-allowed;pointer-events:none;";

  const prevBtn = prevHref
    ? `<a href="${prevHref}" style="${btnActive}" onmouseover="this.style.background='rgba(255,255,255,0.15)'" onmouseout="this.style.background='transparent'">&#8592; 이전</a>`
    : `<span style="${btnDisabled}">&#8592; 이전</span>`;

  const nextBtn = nextHref
    ? `<a href="${nextHref}" style="${btnActive}" onmouseover="this.style.background='rgba(255,255,255,0.15)'" onmouseout="this.style.background='transparent'">다음 &#8594;</a>`
    : `<span style="${btnDisabled}">다음 &#8594;</span>`;

  const deleteBtn = isAdminUser
    ? `<form method="post" action="/heroes/${heroUuid}/delete" style="display:inline;margin:0;" onsubmit="return confirm('정말 삭제하시겠습니까?')"><button type="submit" style="display:inline-flex;align-items:center;padding:4px 12px;font-size:13px;border-radius:6px;border:1px solid rgba(255,80,80,0.5);background:transparent;color:#ff6b6b;cursor:pointer;white-space:nowrap;">삭제</button></form>`
    : "";

  const sunSvg = `<svg width="16" height="16" fill="#facc15" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd"/></svg>`;
  const moonSvg = `<svg width="16" height="16" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>`;
  const shareSvg = `<svg width="16" height="16" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>`;

  return `
<div id="__hero_nav" style="
  position:fixed;top:0;left:0;right:0;height:44px;
  display:flex;align-items:center;justify-content:space-between;
  padding:0 12px;
  background:rgba(15,15,20,0.88);
  backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
  box-shadow:0 1px 0 rgba(255,255,255,0.08);
  z-index:2147483647;box-sizing:border-box;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
">
  <a href="/" style="display:inline-flex;align-items:center;gap:4px;font-size:13px;color:rgba(255,255,255,0.7);text-decoration:none;padding:4px 8px;border-radius:6px;white-space:nowrap;flex-shrink:0;"
    onmouseover="this.style.color='#fff';this.style.background='rgba(255,255,255,0.1)'"
    onmouseout="this.style.color='rgba(255,255,255,0.7)';this.style.background='transparent'"
  >&#8592; 목록</a>
  <span style="flex:1;text-align:center;font-size:13px;font-weight:600;color:#fff;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;padding:0 8px;">${name}</span>
  <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
    ${prevBtn}
    ${nextBtn}
    ${deleteBtn}
    <button id="__share_btn" aria-label="공유하기" title="공유하기" style="width:36px;height:36px;border-radius:50%;border:none;background:rgba(255,255,255,0.1);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;"></button>
    <button id="__theme_btn" aria-label="다크모드 토글" style="width:36px;height:36px;border-radius:50%;border:none;background:rgba(255,255,255,0.1);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;"></button>
  </div>
</div>
<script>
(function(){
  var THEME_KEY="hs-theme";
  var sunSvg=${JSON.stringify(sunSvg)};
  var moonSvg=${JSON.stringify(moonSvg)};
  var shareSvg=${JSON.stringify(shareSvg)};

  function getTheme(){
    return localStorage.getItem(THEME_KEY)||(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");
  }
  function applyTheme(t){
    document.documentElement.classList.toggle("dark",t==="dark");
    var btn=document.getElementById("__theme_btn");
    if(btn) btn.innerHTML=t==="dark"?sunSvg:moonSvg;
  }
  function applyPadding(){
    var nav=document.getElementById("__hero_nav");
    if(nav&&document.body){document.body.style.paddingTop=nav.offsetHeight+"px";}
  }
  function init(){
    applyTheme(getTheme());
    applyPadding();
    var shareBtn=document.getElementById("__share_btn");
    if(shareBtn) shareBtn.innerHTML=shareSvg;
  }
  if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",init);}
  else{init();}

  document.addEventListener("click",function(e){
    if(e.target.closest("#__theme_btn")){
      var next=getTheme()==="dark"?"light":"dark";
      localStorage.setItem(THEME_KEY,next);
      applyTheme(next);
    }
    if(e.target.closest("#__share_btn")){
      var url=window.location.href;
      var btn=document.getElementById("__share_btn");
      if(navigator.share){
        navigator.share({url:url,title:document.title}).catch(function(){});
      } else {
        navigator.clipboard.writeText(url).then(function(){
          if(btn){
            btn.title="복사됨!";
            btn.style.background="rgba(99,255,180,0.25)";
            setTimeout(function(){
              btn.title="공유하기";
              btn.style.background="rgba(255,255,255,0.1)";
            },1500);
          }
        }).catch(function(){});
      }
    }
  });

  var prev=${prevHref ? `"${prevHref}"` : "null"};
  var next=${nextHref ? `"${nextHref}"` : "null"};
  document.addEventListener("keydown",function(e){
    if(e.key==="ArrowLeft"&&prev){window.location.href=prev;}
    if(e.key==="ArrowRight"&&next){window.location.href=next;}
    if(e.key==="Escape"){window.location.href="/";}
  });
})();
</script>`;
}

function injectNavBar(html: string, navBarHtml: string): string {
  const match = html.match(/<body[^>]*>/i);
  if (match && match.index !== undefined) {
    const insertPos = match.index + match[0].length;
    return html.slice(0, insertPos) + "\n" + navBarHtml + html.slice(insertPos);
  }
  return navBarHtml + "\n" + html;
}

export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/heroes/[id]">
) {
  const { id } = await ctx.params;

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const user = token ? await decodeSession(token) : null;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // short_id로 먼저 조회, 없으면 UUID id로 fallback (기존 영웅 호환)
  const { data: byShort } = await supabase.from("hs_heroes").select("*").eq("short_id", id).maybeSingle();
  const heroRow = byShort ?? (await supabase.from("hs_heroes").select("*").eq("id", id).maybeSingle()).data;

  if (!heroRow) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const h = heroRow as Hero;

  const [{ data: prevHero }, { data: nextHero }] = await Promise.all([
    supabase
      .from("hs_heroes")
      .select("id, short_id")
      .lt("created_at", h.created_at)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("hs_heroes")
      .select("id, short_id")
      .gt("created_at", h.created_at)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  const storageRes = await fetch(h.card_url);
  if (!storageRes.ok) {
    return new NextResponse("Failed to fetch hero card", { status: storageRes.status });
  }
  const rawHtml = await storageRes.text();

  const prevUrlId = prevHero ? (prevHero.short_id ?? prevHero.id) : null;
  const nextUrlId = nextHero ? (nextHero.short_id ?? nextHero.id) : null;

  const navBarHtml = buildNavBar(
    h.name,
    h.id,
    prevUrlId,
    nextUrlId,
    isAdmin(user)
  );
  const modifiedHtml = injectNavBar(rawHtml, navBarHtml);

  return new NextResponse(modifiedHtml, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
