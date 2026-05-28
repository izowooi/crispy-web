"use client";

import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  Gauge,
  RotateCcw,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  domains,
  questionnaire,
  questionnaireItems,
  questionnaireStats,
  responseScale,
  type DomainId,
  type ResponseValue,
} from "@/data/questionnaire";
import { scoreAssessment, type AnswerMap, type DomainScore } from "@/lib/scoring";

const PAGE_SIZE = 15;
const STORAGE_KEY = "big-five-answers-v1";
const PAGE_KEY = "big-five-page-v1";

type ViewMode = "intro" | "test" | "results";

const domainNotes: Record<DomainId, { low: string; mid: string; high: string }> = {
  O: {
    low: "익숙하고 검증된 방식을 선호하며 실용적 판단이 빠를 수 있습니다.",
    mid: "새로움과 익숙함 사이에서 상황에 맞게 균형을 잡는 편입니다.",
    high: "새로운 생각, 감각, 관점 탐색에 활발하게 반응하는 편입니다.",
  },
  C: {
    low: "즉흥성과 유연성이 크며 반복 관리에는 에너지가 더 들 수 있습니다.",
    mid: "책임과 여유 사이의 균형을 잡으며 과제 성격에 따라 실행력이 달라집니다.",
    high: "목표, 책임, 준비, 마무리를 중시하고 꾸준히 실행하는 편입니다.",
  },
  E: {
    low: "조용한 환경과 깊은 집중에서 에너지를 회복하는 경향이 있습니다.",
    mid: "혼자 있는 시간과 사람들과의 활동을 비교적 균형 있게 오갑니다.",
    high: "표현, 활동, 사람들과의 상호작용에서 활력을 얻는 편입니다.",
  },
  A: {
    low: "판단이 독립적이고 경계가 분명하며 필요할 때 단호할 수 있습니다.",
    mid: "배려와 자기 기준을 함께 고려하며 관계에 따라 협력 방식이 달라집니다.",
    high: "신뢰, 협력, 공감, 배려를 바탕으로 관계를 부드럽게 만드는 편입니다.",
  },
  N: {
    low: "압박 속에서도 비교적 안정적이고 감정 회복이 빠른 편입니다.",
    mid: "상황의 강도에 따라 흔들림과 회복이 함께 나타나는 편입니다.",
    high: "걱정, 긴장, 감정 반응을 민감하게 감지하고 크게 경험할 수 있습니다.",
  },
};

export function BigFiveAssessment() {
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [pageIndex, setPageIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("intro");
  const [selectedDomainId, setSelectedDomainId] = useState<DomainId>("O");
  const [storageReady, setStorageReady] = useState(false);

  const totalPages = Math.ceil(questionnaireItems.length / PAGE_SIZE);
  const result = useMemo(() => scoreAssessment(answers), [answers]);
  const currentItems = questionnaireItems.slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE);
  const answeredOnPage = currentItems.filter((item) => answers[item.id]).length;
  const pageComplete = answeredOnPage === currentItems.length;
  const progress = Math.round((result.completedItems / result.totalItems) * 100);
  const selectedDomain = result.domains.find((domain) => domain.id === selectedDomainId) ?? result.domains[0];

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) {
        return;
      }

      const savedAnswers = window.localStorage.getItem(STORAGE_KEY);
      const savedPage = window.localStorage.getItem(PAGE_KEY);

      if (savedAnswers) {
        try {
          setAnswers(JSON.parse(savedAnswers) as AnswerMap);
        } catch {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      }

      if (savedPage) {
        const parsedPage = Number(savedPage);

        if (Number.isInteger(parsedPage) && parsedPage >= 0 && parsedPage < totalPages) {
          setPageIndex(parsedPage);
        }
      }

      setStorageReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [totalPages]);

  useEffect(() => {
    if (!storageReady) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
  }, [answers, storageReady]);

  useEffect(() => {
    if (!storageReady) {
      return;
    }

    window.localStorage.setItem(PAGE_KEY, String(pageIndex));
  }, [pageIndex, storageReady]);

  function answerItem(itemId: string, value: ResponseValue) {
    setAnswers((current) => ({
      ...current,
      [itemId]: value,
    }));
  }

  function movePage(nextPage: number) {
    setPageIndex(Math.min(Math.max(nextPage, 0), totalPages - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetAssessment() {
    setAnswers({});
    setPageIndex(0);
    setViewMode("intro");
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(PAGE_KEY);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showResults() {
    setViewMode("results");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function downloadResults() {
    const payload = {
      questionnaireVersion: questionnaire.version,
      generatedAt: new Date().toISOString(),
      answers,
      result,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `big-five-result-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(href);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
      <header className="grid gap-5 rounded-[8px] border border-slate-200 bg-white/90 p-5 shadow-sm lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-sm font-semibold text-teal-800">
            <ClipboardList size={16} aria-hidden="true" />
            180문항 · 30분 내외 · 30개 세부척도
          </div>
          <h1 className="text-3xl font-bold tracking-normal text-slate-950 sm:text-4xl">
            Big Five 심리 성향 검사
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
            공개 Big Five 구조를 바탕으로 작성한 한국어 자기보고식 검사입니다. 각 문항은 현재의
            나와 얼마나 가까운지 답하고, 완료 후 5대 요인과 30개 세부척도를 시각적으로 확인합니다.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <Metric label="진행률" value={`${progress}%`} />
          <Metric label="응답" value={`${result.completedItems}/${result.totalItems}`} />
          <Metric label="예상 시간" value={`${questionnaireStats.estimatedMinutes}분`} />
        </div>
      </header>

      <ProgressBar progress={progress} />

      {viewMode === "intro" && (
        <IntroPanel
          completedItems={result.completedItems}
          onStart={() => setViewMode("test")}
          onShowResults={showResults}
          resultComplete={result.isComplete}
        />
      )}

      {viewMode === "test" && (
        <section className="grid gap-5">
          <div className="flex flex-col gap-3 rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">페이지 {pageIndex + 1} / {totalPages}</p>
              <h2 className="mt-1 text-xl font-bold text-slate-950">
                문항 {pageIndex * PAGE_SIZE + 1}–{pageIndex * PAGE_SIZE + currentItems.length}
              </h2>
            </div>
            <div className="text-sm font-semibold text-slate-600">
              이 페이지 응답 {answeredOnPage}/{currentItems.length}
            </div>
          </div>

          <div className="grid gap-4">
            {currentItems.map((item, index) => (
              <QuestionItem
                key={item.id}
                answer={answers[item.id]}
                index={pageIndex * PAGE_SIZE + index + 1}
                item={item}
                onAnswer={answerItem}
              />
            ))}
          </div>

          <div className="sticky bottom-0 -mx-4 border-t border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:rounded-[8px] sm:border sm:bg-white">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-45"
                disabled={pageIndex === 0}
                type="button"
                onClick={() => movePage(pageIndex - 1)}
              >
                <ChevronLeft size={18} aria-hidden="true" />
                이전
              </button>

              <p className="text-center text-sm text-slate-600">
                {pageComplete ? "좋아요. 다음 페이지로 이동할 수 있습니다." : "현재 페이지 문항을 모두 응답하면 이동할 수 있습니다."}
              </p>

              {pageIndex === totalPages - 1 ? (
                <button
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] bg-teal-700 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                  disabled={!result.isComplete}
                  type="button"
                  onClick={showResults}
                >
                  결과 보기
                  <BarChart3 size={18} aria-hidden="true" />
                </button>
              ) : (
                <button
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] bg-teal-700 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                  disabled={!pageComplete}
                  type="button"
                  onClick={() => movePage(pageIndex + 1)}
                >
                  다음
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {viewMode === "results" && (
        <ResultsPanel
          answers={answers}
          onDownload={downloadResults}
          onReset={resetAssessment}
          onReturnToTest={() => setViewMode("test")}
          result={result}
          selectedDomain={selectedDomain}
          selectedDomainId={selectedDomainId}
          setSelectedDomainId={setSelectedDomainId}
        />
      )}
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="h-3 overflow-hidden rounded-full bg-slate-200" aria-label={`진행률 ${progress}%`}>
      <div className="h-full rounded-full bg-teal-700 transition-all" style={{ width: `${progress}%` }} />
    </div>
  );
}

function IntroPanel({
  completedItems,
  onShowResults,
  onStart,
  resultComplete,
}: {
  completedItems: number;
  onShowResults: () => void;
  onStart: () => void;
  resultComplete: boolean;
}) {
  return (
    <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
      <div className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-950">검사 방식</h2>
        <div className="mt-5 grid gap-3">
          <InfoRow icon={<Gauge size={20} aria-hidden="true" />} label="척도" value="1점 전혀 그렇지 않다부터 5점 매우 그렇다까지" />
          <InfoRow icon={<ClipboardList size={20} aria-hidden="true" />} label="구성" value="5개 요인, 30개 세부척도, 세부척도별 6문항" />
          <InfoRow icon={<BarChart3 size={20} aria-hidden="true" />} label="결과" value="요인 점수, 세부척도 막대, 레이더 차트, JSON 내보내기" />
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] bg-teal-700 px-5 py-2 font-semibold text-white"
            type="button"
            onClick={onStart}
          >
            {completedItems > 0 ? "이어 하기" : "검사 시작"}
            <ChevronRight size={18} aria-hidden="true" />
          </button>
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] border border-slate-300 bg-white px-5 py-2 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!resultComplete}
            type="button"
            onClick={onShowResults}
          >
            결과 다시 보기
            <BarChart3 size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-950">응답 안내</h2>
        <div className="mt-4 grid gap-3 text-sm leading-6 text-slate-600">
          <p>정답이나 좋은 점수는 없습니다. 최근 몇 달 동안의 평균적인 자신과 가까운 쪽을 고르세요.</p>
          <p>이 검사는 자기이해를 돕는 비임상 성향 검사이며, 의료적 진단이나 채용 평가 용도로 설계되지 않았습니다.</p>
          <p>응답은 브라우저 로컬 저장소에만 저장됩니다. 서버 전송이나 외부 API 호출은 없습니다.</p>
        </div>
        <div className="mt-5 grid gap-2">
          {responseScale.map((option) => (
            <div key={option.value} className="flex items-center gap-3 rounded-[8px] bg-slate-50 px-3 py-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white font-bold text-slate-800">
                {option.value}
              </span>
              <span className="text-sm font-medium text-slate-700">{option.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex gap-3 rounded-[8px] bg-slate-50 p-3">
      <div className="mt-0.5 text-teal-700">{icon}</div>
      <div>
        <p className="font-semibold text-slate-900">{label}</p>
        <p className="text-sm leading-6 text-slate-600">{value}</p>
      </div>
    </div>
  );
}

function QuestionItem({
  answer,
  index,
  item,
  onAnswer,
}: {
  answer: number | undefined;
  index: number;
  item: (typeof questionnaireItems)[number];
  onAnswer: (itemId: string, value: ResponseValue) => void;
}) {
  return (
    <article className="rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-500">
            {index}. {item.domainName} · {item.facetName}
          </p>
          <h3 className="mt-2 text-lg font-bold leading-7 text-slate-950">{item.text}</h3>
        </div>
        <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {item.id}
        </span>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-5">
        {responseScale.map((option) => {
          const selected = answer === option.value;

          return (
            <button
              key={option.value}
              aria-pressed={selected}
              className={`min-h-16 rounded-[8px] border px-3 py-2 text-center transition ${
                selected
                  ? "border-teal-700 bg-teal-700 text-white"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:border-teal-300 hover:bg-teal-50"
              }`}
              type="button"
              onClick={() => onAnswer(item.id, option.value)}
            >
              <span className="block text-lg font-bold">{option.value}</span>
              <span className="block text-xs font-semibold leading-5">{option.label}</span>
            </button>
          );
        })}
      </div>
    </article>
  );
}

function ResultsPanel({
  answers,
  onDownload,
  onReset,
  onReturnToTest,
  result,
  selectedDomain,
  selectedDomainId,
  setSelectedDomainId,
}: {
  answers: AnswerMap;
  onDownload: () => void;
  onReset: () => void;
  onReturnToTest: () => void;
  result: ReturnType<typeof scoreAssessment>;
  selectedDomain: DomainScore;
  selectedDomainId: DomainId;
  setSelectedDomainId: (domainId: DomainId) => void;
}) {
  if (!result.isComplete) {
    return (
      <section className="rounded-[8px] border border-amber-200 bg-amber-50 p-5">
        <h2 className="text-2xl font-bold text-amber-950">아직 결과를 계산할 수 없습니다</h2>
        <p className="mt-2 text-amber-900">
          남은 문항 {result.missingItemIds.length}개가 있습니다. 검사 화면으로 돌아가 모든 문항에 응답해 주세요.
        </p>
        <button
          className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] bg-amber-700 px-5 py-2 font-semibold text-white"
          type="button"
          onClick={onReturnToTest}
        >
          검사로 돌아가기
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </section>
    );
  }

  return (
    <section className="grid gap-5">
      <div className="flex flex-col gap-3 rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-teal-700">검사 완료</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-950">결과 요약</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            점수는 0–100으로 환산됩니다. 정서적 민감성은 낮을수록 정서 안정성이 높게 해석됩니다.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700"
            type="button"
            onClick={onDownload}
          >
            <Download size={18} aria-hidden="true" />
            JSON 저장
          </button>
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] border border-red-200 bg-red-50 px-4 py-2 font-semibold text-red-700"
            type="button"
            onClick={onReset}
          >
            <RotateCcw size={18} aria-hidden="true" />
            초기화
          </button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-xl font-bold text-slate-950">요인 레이더</h3>
          <RadarChart domains={result.domains} />
        </div>
        <div className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-xl font-bold text-slate-950">5대 요인 점수</h3>
          <div className="mt-5 grid gap-4">
            {result.domains.map((domain) => (
              <DomainBar key={domain.id} domain={domain} />
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-950">세부척도</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">요인을 선택하면 해당 6개 세부척도를 확인할 수 있습니다.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {domains.map((domain) => (
              <button
                key={domain.id}
                aria-pressed={selectedDomainId === domain.id}
                className={`rounded-[8px] border px-3 py-2 text-sm font-semibold ${
                  selectedDomainId === domain.id
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-200 bg-slate-50 text-slate-700"
                }`}
                type="button"
                onClick={() => setSelectedDomainId(domain.id)}
              >
                {domain.name}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <div
            className="rounded-[8px] border p-4"
            style={{ borderColor: selectedDomain.color, backgroundColor: `${selectedDomain.color}10` }}
          >
            <p className="text-sm font-semibold" style={{ color: selectedDomain.color }}>
              {selectedDomain.englishName}
            </p>
            <h4 className="mt-1 text-2xl font-bold text-slate-950">{selectedDomain.name}</h4>
            <p className="mt-3 text-sm leading-6 text-slate-700">{domainSummary(selectedDomain)}</p>
          </div>
          <div className="grid gap-3">
            {selectedDomain.facets.map((facet) => (
              <FacetBar key={facet.id} color={selectedDomain.color} facet={facet} />
            ))}
          </div>
        </div>
      </div>

      <details className="rounded-[8px] border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-600 shadow-sm">
        <summary className="cursor-pointer font-bold text-slate-950">응답 데이터 확인</summary>
        <pre className="mt-4 max-h-72 overflow-auto rounded-[8px] bg-slate-950 p-4 text-xs text-slate-100">
          {JSON.stringify({ answers, scores: result.domains }, null, 2)}
        </pre>
      </details>
    </section>
  );
}

function DomainBar({ domain }: { domain: DomainScore }) {
  return (
    <div>
      <div className="mb-2 flex items-end justify-between gap-3">
        <div>
          <p className="font-bold text-slate-950">{domain.name}</p>
          <p className="text-xs font-semibold text-slate-500">{domain.englishName} · {domain.band}</p>
        </div>
        <p className="text-2xl font-bold text-slate-950">{domain.score}</p>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${domain.score}%`, backgroundColor: domain.color }}
        />
      </div>
    </div>
  );
}

function FacetBar({ color, facet }: { color: string; facet: DomainScore["facets"][number] }) {
  return (
    <div className="rounded-[8px] border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-slate-950">{facet.name}</p>
          <p className="text-xs font-semibold text-slate-500">{facet.englishName} · {facet.band}</p>
        </div>
        <p className="text-xl font-bold text-slate-950">{facet.score}</p>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{facet.description}</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full" style={{ width: `${facet.score}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function RadarChart({ domains: scores }: { domains: DomainScore[] }) {
  const center = 120;
  const radius = 78;
  const axisPoints = scores.map((_, index) => polarPoint(index, scores.length, center, radius, 1));
  const scorePoints = scores.map((domain, index) => polarPoint(index, scores.length, center, radius, domain.score / 100));
  const labelPoints = scores.map((_, index) => polarPoint(index, scores.length, center, radius + 30, 1));

  return (
    <svg aria-label="Big Five 요인 레이더 차트" className="mt-4 h-auto w-full" role="img" viewBox="0 0 240 240">
      {[0.25, 0.5, 0.75, 1].map((scale) => (
        <polygon
          key={scale}
          fill="none"
          points={scores.map((_, index) => polarPoint(index, scores.length, center, radius, scale).join(",")).join(" ")}
          stroke="#d8dee8"
          strokeWidth="1"
        />
      ))}
      {axisPoints.map(([x, y], index) => (
        <line key={scores[index].id} stroke="#cbd5e1" strokeWidth="1" x1={center} x2={x} y1={center} y2={y} />
      ))}
      <polygon fill="rgba(15, 118, 110, 0.18)" points={scorePoints.map((point) => point.join(",")).join(" ")} stroke="#0f766e" strokeWidth="3" />
      {scorePoints.map(([x, y], index) => (
        <circle key={scores[index].id} cx={x} cy={y} fill={scores[index].color} r="4" />
      ))}
      {labelPoints.map(([x, y], index) => (
        <text
          key={scores[index].id}
          dominantBaseline="middle"
          fill="#334155"
          fontSize="10"
          fontWeight="700"
          textAnchor={x < center - 8 ? "end" : x > center + 8 ? "start" : "middle"}
          x={x}
          y={y}
        >
          {scores[index].name}
        </text>
      ))}
    </svg>
  );
}

function polarPoint(index: number, total: number, center: number, radius: number, scale: number): [number, number] {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  return [center + Math.cos(angle) * radius * scale, center + Math.sin(angle) * radius * scale];
}

function domainSummary(domain: DomainScore) {
  const notes = domainNotes[domain.id];

  if (domain.band === "낮음") {
    return notes.low;
  }

  if (domain.band === "높음") {
    return notes.high;
  }

  return notes.mid;
}
