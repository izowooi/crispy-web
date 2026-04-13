"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FileDropZone } from "./FileDropZone";
import { parseCharacterHtml } from "@/lib/parseHtml";
import { convertToWebP, base64ToFile } from "@/lib/imageUtils";
import { supabase } from "@/lib/supabase";
import type { CharacterData } from "@/lib/types";

const BASE62 = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function makeShortId(len = 3): string {
  return Array.from({ length: len }, () => BASE62[Math.floor(Math.random() * 62)]).join("");
}

async function generateUniqueShortId(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const sid = makeShortId(3);
    const { data } = await supabase.from("hs_heroes").select("id").eq("short_id", sid).maybeSingle();
    if (!data) return sid;
  }
  return makeShortId(4);
}

const RARITY_LABELS: Record<string, string> = {
  common: "커먼",
  rare: "레어",
  hero: "영웅",
  legendary: "전설",
  mythic: "신화",
};

export function UploadForm() {
  const router = useRouter();
  const [htmlFile, setHtmlFile] = useState<File | null>(null);
  const [customPortrait, setCustomPortrait] = useState<File | null>(null);
  const [overrideName, setOverrideName] = useState("");
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<CharacterData | null>(null);
  const [previewPortraitUrl, setPreviewPortraitUrl] = useState<string | null>(null);
  const [duplicateHero, setDuplicateHero] = useState<{ id: string; name: string } | null>(null);

  const effectiveName = overrideName.trim() || preview?.name || "";

  useEffect(() => {
    if (!effectiveName) {
      setDuplicateHero(null);
      return;
    }
    let cancelled = false;
    supabase
      .from("hs_heroes")
      .select("id, name")
      .eq("name", effectiveName)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setDuplicateHero(data ?? null);
      });
    return () => { cancelled = true; };
  }, [effectiveName]);

  const handleHtmlFile = async (file: File) => {
    setHtmlFile(file);
    setError(null);
    setPreview(null);
    setPreviewPortraitUrl(null);
    setDuplicateHero(null);
    try {
      const text = await file.text();
      const { characterData, portraitDataUrl } = parseCharacterHtml(text);
      setPreview(characterData);
      setPreviewPortraitUrl(portraitDataUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "HTML 파싱 오류");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!htmlFile || !preview) return;

    setIsUploading(true);
    setError(null);

    try {
      const timestamp = Date.now();
      const heroId = preview.id ?? `hero_${timestamp}`;

      // Portrait upload
      let portraitPublicUrl: string | null = null;
      const portraitSource = customPortrait ?? (previewPortraitUrl ? base64ToFile(previewPortraitUrl, "portrait.jpg") : null);

      if (portraitSource) {
        const webpBlob = await convertToWebP(portraitSource);
        const portraitPath = `${heroId}-${timestamp}.webp`;
        const { error: uploadErr } = await supabase.storage
          .from("hs-portraits")
          .upload(portraitPath, webpBlob, { contentType: "image/webp" });
        if (uploadErr) throw new Error(`초상화 업로드 실패: ${uploadErr.message}`);
        const { data: urlData } = supabase.storage
          .from("hs-portraits")
          .getPublicUrl(portraitPath);
        portraitPublicUrl = urlData.publicUrl;
      }

      // HTML card upload
      const cardPath = `${heroId}-${timestamp}.html`;
      const { error: cardErr } = await supabase.storage
        .from("hs-cards")
        .upload(cardPath, htmlFile, { contentType: "text/html" });
      if (cardErr) throw new Error(`카드 업로드 실패: ${cardErr.message}`);
      const { data: cardUrlData } = supabase.storage
        .from("hs-cards")
        .getPublicUrl(cardPath);
      const cardPublicUrl = cardUrlData.publicUrl;

      // Generate short ID
      const shortId = await generateUniqueShortId();

      // DB insert
      const { data: inserted, error: dbErr } = await supabase
        .from("hs_heroes")
        .insert({
          name: overrideName.trim() || preview.name || "이름 없음",
          title: preview.title ?? null,
          job: preview.job ?? null,
          rarity: preview.rarity ?? "common",
          portrait_url: portraitPublicUrl,
          card_url: cardPublicUrl,
          metadata: preview,
          short_id: shortId,
        })
        .select("id, short_id")
        .single();
      if (dbErr) throw new Error(`DB 저장 실패: ${dbErr.message}`);

      router.push(`/heroes/${inserted.short_id ?? inserted.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "업로드 중 오류가 발생했습니다.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FileDropZone
        accept=".html,text/html"
        label="캐릭터 카드 HTML"
        description=".html 파일을 선택하면 이름·초상화가 자동으로 추출됩니다"
        onFile={handleHtmlFile}
        selectedFile={htmlFile}
      />

      {/* Preview */}
      {preview && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex gap-4 items-start bg-white dark:bg-gray-800">
          {previewPortraitUrl && !customPortrait && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewPortraitUrl}
              alt="portrait preview"
              className="w-16 h-16 rounded-full object-cover border-2 border-indigo-300 flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {overrideName || preview.name}
              </span>
              {preview.rarity && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                  {RARITY_LABELS[preview.rarity] ?? preview.rarity}
                </span>
              )}
            </div>
            {preview.title && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{preview.title}</p>
            )}
            {preview.job && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{preview.job}</p>
            )}
            {!previewPortraitUrl && (
              <p className="text-xs text-amber-500 mt-1">초상화 이미지 없음 (Advanced에서 직접 업로드 가능)</p>
            )}
          </div>
        </div>
      )}

      {/* Advanced toggle */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setIsAdvancedOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <span>Advanced 옵션 (이름 변경 · 커스텀 초상화)</span>
          <svg
            className={`w-4 h-4 transition-transform ${isAdvancedOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isAdvancedOpen && (
          <div className="px-4 pb-4 pt-2 space-y-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                영웅 이름 (비워두면 HTML에서 자동 추출)
              </label>
              <input
                type="text"
                value={overrideName}
                onChange={(e) => setOverrideName(e.target.value)}
                placeholder={preview?.name ?? "영웅 이름"}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <FileDropZone
              accept="image/*"
              label="초상화 이미지 (PNG/JPG/WebP)"
              description="선택하면 자동으로 WebP로 변환됩니다"
              onFile={setCustomPortrait}
              selectedFile={customPortrait}
            />
          </div>
        )}
      </div>

      {duplicateHero && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          <strong>&quot;{duplicateHero.name}&quot;</strong> 이름의 영웅이 이미 등록되어 있습니다.{" "}
          <a
            href={`/heroes/${duplicateHero.id}`}
            className="underline font-medium"
            target="_blank"
            rel="noreferrer"
          >
            기존 카드 보기
          </a>
          <br />
          <span className="text-amber-600 dark:text-amber-400">
            다른 이름으로 등록하려면 Advanced 옵션에서 영웅 이름을 변경하세요.
          </span>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!htmlFile || !preview || isUploading || !!duplicateHero}
        className="w-full py-3 rounded-xl font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {isUploading ? (
          <>
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            업로드 중...
          </>
        ) : (
          "등록하기"
        )}
      </button>
    </form>
  );
}
