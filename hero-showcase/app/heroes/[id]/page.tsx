import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { HeroDetailViewer } from "@/components/HeroDetailViewer";
import { HeroNavigation } from "@/components/HeroNavigation";
import type { Hero } from "@/lib/types";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function HeroDetailPage({ params }: Props) {
  const { id } = await params;

  const { data: hero } = await supabase
    .from("hs_heroes")
    .select("*")
    .eq("id", id)
    .single();

  if (!hero) notFound();

  const h = hero as Hero;

  // Get prev (created before this one)
  const { data: prevHero } = await supabase
    .from("hs_heroes")
    .select("id")
    .lt("created_at", h.created_at)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Get next (created after this one)
  const { data: nextHero } = await supabase
    .from("hs_heroes")
    .select("id")
    .gt("created_at", h.created_at)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <HeroNavigation
        heroName={h.name}
        prevId={prevHero?.id ?? null}
        nextId={nextHero?.id ?? null}
      />
      <HeroDetailViewer cardUrl={h.card_url} />
    </div>
  );
}
