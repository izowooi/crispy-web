"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CATEGORIES = ["점심 식사", "회식", "디저트", "기타"];
const INPUT_CLS = "w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 bg-white transition-all";

export default function AddPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    category: "점심 식사",
    recommender: "",
    location: "",
    genre: "",
    notes: "",
    link: "",
    payco: "",
    verified: false,
    verifiers: "",
    review: "",
    solo_possible: "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      setForm((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("가게 이름은 필수입니다");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/restaurants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "오류가 발생했습니다");
        return;
      }
      router.push("/");
    } catch {
      setError("네트워크 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">맛집 추가 🍴</h1>
        <p className="text-gray-500 text-sm mt-1">새로운 맛집 정보를 등록해주세요</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">기본 정보</h2>

          <Field label="가게 이름 *">
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="가게 이름을 입력하세요"
              className={INPUT_CLS}
              required
            />
          </Field>

          <Field label="분류">
            <select name="category" value={form.category} onChange={handleChange} className={INPUT_CLS}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>

          <Field label="장르">
            <input
              name="genre"
              value={form.genre}
              onChange={handleChange}
              placeholder="예: 한식, 일식, 중식"
              className={INPUT_CLS}
            />
          </Field>

          <Field label="위치">
            <input
              name="location"
              value={form.location}
              onChange={handleChange}
              placeholder="예: 하이펙스 A동 지하1층"
              className={INPUT_CLS}
            />
          </Field>

          <Field label="추천인">
            <input
              name="recommender"
              value={form.recommender}
              onChange={handleChange}
              placeholder="추천인 이름"
              className={INPUT_CLS}
            />
          </Field>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">추가 정보</h2>

          <Field label="비고">
            <input
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="예: 16000원, 직장인 픽"
              className={INPUT_CLS}
            />
          </Field>

          <Field label="네이버 지도 링크">
            <input
              name="link"
              value={form.link}
              onChange={handleChange}
              placeholder="https://naver.me/..."
              className={INPUT_CLS}
              type="url"
            />
          </Field>

          <Field label="페이코 유무">
            <select name="payco" value={form.payco} onChange={handleChange} className={INPUT_CLS}>
              <option value="">모름</option>
              <option value="O">가능 (O)</option>
              <option value="X">불가 (X)</option>
            </select>
          </Field>

          <Field label="혼밥 가능 여부">
            <input
              name="solo_possible"
              value={form.solo_possible}
              onChange={handleChange}
              placeholder="예: 가능, 불가, 애매함"
              className={INPUT_CLS}
            />
          </Field>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">검증 & 리뷰</h2>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              name="verified"
              id="verified"
              checked={form.verified}
              onChange={handleChange}
              className="w-5 h-5 accent-orange-500"
            />
            <label htmlFor="verified" className="text-sm font-medium text-gray-700">검증됨</label>
          </div>

          <Field label="검증인">
            <input
              name="verifiers"
              value={form.verifiers}
              onChange={handleChange}
              placeholder="검증인 이름 (쉼표로 구분)"
              className={INPUT_CLS}
            />
          </Field>

          <Field label="리뷰">
            <textarea
              name="review"
              value={form.review}
              onChange={handleChange}
              placeholder="맛, 분위기, 가격 등 자유롭게 작성해주세요"
              rows={4}
              className={`${INPUT_CLS} resize-none`}
            />
          </Field>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-xl font-semibold transition-colors"
          >
            {loading ? "저장 중..." : "저장하기"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}
