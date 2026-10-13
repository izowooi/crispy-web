"use client";

import { useActionState } from "react";
import { createDaycare, unlockDaycare, type FormState } from "@/app/actions";

const inputClass = "w-full rounded-2xl border border-line bg-canvas px-4 py-3";
const buttonClass =
  "w-full rounded-2xl bg-accent px-4 py-3 font-bold text-accent-ink disabled:opacity-50 sm:w-auto sm:px-6";

export function CreateDaycareForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createDaycare, {});
  return (
    <form action={action} className="mt-4 space-y-3">
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">어린이집 이름</span>
        <input name="name" required maxLength={30} placeholder="예: 꿈땅" className={inputClass} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">관리 비밀번호</span>
        <input name="pin" type="password" required minLength={4} autoComplete="new-password" className={inputClass} />
      </label>
      {state.error && <p className="text-sm font-semibold text-danger">{state.error}</p>}
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "만드는 중…" : "만들고 식단표 올리기"}
      </button>
    </form>
  );
}

export function UnlockForm({ daycareId }: { daycareId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(unlockDaycare.bind(null, daycareId), {});
  return (
    <form action={action} className="mt-4 space-y-3">
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">관리 비밀번호</span>
        <input name="pin" type="password" required autoComplete="current-password" className={inputClass} />
      </label>
      {state.error && <p className="text-sm font-semibold text-danger">{state.error}</p>}
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "확인 중…" : "확인"}
      </button>
    </form>
  );
}
