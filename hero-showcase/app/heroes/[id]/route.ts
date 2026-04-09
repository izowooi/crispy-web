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
  heroId: string,
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
    ? `<form method="post" action="/heroes/${heroId}/delete" style="display:inline;margin:0;" onsubmit="return confirm('정말 삭제하시겠습니까?')"><button type="submit" style="display:inline-flex;align-items:center;padding:4px 12px;font-size:13px;border-radius:6px;border:1px solid rgba(255,80,80,0.5);background:transparent;color:#ff6b6b;cursor:pointer;white-space:nowrap;">삭제</button></form>`
    : "";

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
  </div>
</div>
<script>
(function(){
  function applyPadding(){
    var nav=document.getElementById("__hero_nav");
    if(nav&&document.body){document.body.style.paddingTop=nav.offsetHeight+"px";}
  }
  if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",applyPadding);}
  else{applyPadding();}
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

  const { data: hero } = await supabase
    .from("hs_heroes")
    .select("*")
    .eq("id", id)
    .single();

  if (!hero) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const h = hero as Hero;

  const [{ data: prevHero }, { data: nextHero }] = await Promise.all([
    supabase
      .from("hs_heroes")
      .select("id")
      .lt("created_at", h.created_at)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("hs_heroes")
      .select("id")
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

  const navBarHtml = buildNavBar(
    h.name,
    h.id,
    prevHero?.id ?? null,
    nextHero?.id ?? null,
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
