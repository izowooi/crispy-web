import { describe, it, expect } from "vitest";
import {
  composeFinalPrompt,
  buildArtistSegment,
  formatWeight,
} from "@/lib/prompt-composer";

describe("formatWeight", () => {
  it("정수는 정수로 출력", () => {
    expect(formatWeight(1)).toBe("1");
    expect(formatWeight(2)).toBe("2");
  });
  it("소수는 trailing 0 제거", () => {
    expect(formatWeight(1.5)).toBe("1.5");
    expect(formatWeight(0.3)).toBe("0.3");
    expect(formatWeight(2.9)).toBe("2.9");
  });
  it("NaN/Infinity 는 1 로 폴백", () => {
    expect(formatWeight(NaN)).toBe("1");
    expect(formatWeight(Infinity)).toBe("1");
  });
});

describe("buildArtistSegment", () => {
  it("빈 배열은 빈 문자열", () => {
    expect(buildArtistSegment([])).toBe("");
  });

  it("단일 작가 — '1.5::artist:mx2j::' 형태", () => {
    expect(buildArtistSegment([{ name: "mx2j", weight: 1.5 }])).toBe(
      "1.5::artist:mx2j::",
    );
  });

  it("여러 작가는 쉼표로 연결", () => {
    expect(
      buildArtistSegment([
        { name: "mx2j", weight: 1.5 },
        { name: "ningen_mame", weight: 0.9 },
        { name: "wlop", weight: 2 },
      ]),
    ).toBe("1.5::artist:mx2j::, 0.9::artist:ningen_mame::, 2::artist:wlop::");
  });

  it("가중치 0 인 작가는 제외", () => {
    expect(
      buildArtistSegment([
        { name: "mx2j", weight: 1.5 },
        { name: "junk", weight: 0 },
        { name: "wlop", weight: 1 },
      ]),
    ).toBe("1.5::artist:mx2j::, 1::artist:wlop::");
  });

  it("이름이 공백만 있으면 제외", () => {
    expect(
      buildArtistSegment([
        { name: "", weight: 1 },
        { name: "  ", weight: 1.2 },
        { name: "wlop", weight: 1 },
      ]),
    ).toBe("1::artist:wlop::");
  });

  it("괄호 포함 Danbooru 태그 유지", () => {
    expect(
      buildArtistSegment([{ name: "wagashi_(dagashiya)", weight: 1.2 }]),
    ).toBe("1.2::artist:wagashi_(dagashiya)::");
  });
});

describe("composeFinalPrompt", () => {
  const QUALITY = "masterpiece, best quality, very aesthetic, absurdres";

  it("subject 가 맨 앞, solo 가 자동 부착됨", () => {
    const out = composeFinalPrompt({
      artists: [],
      characters: [],
      subject: "1girl",
      qualityBody: QUALITY,
    });
    expect(out).toBe(`1girl, solo, ${QUALITY}`);
  });

  it("1boy 도 동일 — '1boy, solo' 형태", () => {
    expect(
      composeFinalPrompt({
        artists: [],
        characters: [],
        subject: "1boy",
        qualityBody: "masterpiece",
      }),
    ).toBe("1boy, solo, masterpiece");
  });

  it("작가 0 + 캐릭터 1 = 'subject, 캐릭터, 퀄리티' (subject 맨 앞)", () => {
    expect(
      composeFinalPrompt({
        artists: [],
        characters: [{ work: "원신", kor: "호두", eng: "hu_tao_(genshin_impact)" }],
        subject: "1girl",
        qualityBody: QUALITY,
      }),
    ).toBe(`1girl, solo, hu_tao_(genshin_impact), ${QUALITY}`);
  });

  it("subject → 캐릭터 → 작가(가중치) → 퀄리티 순서", () => {
    const out = composeFinalPrompt({
      artists: [
        { name: "mx2j", weight: 1.5 },
        { name: "wlop", weight: 1 },
      ],
      characters: [{ work: "장송의 프리렌", kor: "프리렌", eng: "frieren" }],
      subject: "1girl",
      qualityBody: QUALITY,
    });
    expect(out).toBe(
      `1girl, solo, frieren, 1.5::artist:mx2j::, 1::artist:wlop::, ${QUALITY}`,
    );
  });

  it("캐릭터 0 명 — subject + 작가 + 퀄리티", () => {
    expect(
      composeFinalPrompt({
        artists: [{ name: "wlop", weight: 1 }],
        characters: [],
        subject: "1girl",
        qualityBody: QUALITY,
      }),
    ).toBe(`1girl, solo, 1::artist:wlop::, ${QUALITY}`);
  });

  it("퀄리티 본문이 비어있어도 깨지지 않음 (최소 'subject, solo')", () => {
    expect(
      composeFinalPrompt({
        artists: [],
        characters: [],
        subject: "1girl",
        qualityBody: "",
      }),
    ).toBe("1girl, solo");
  });

  it("여러 캐릭터는 쉼표 연결, subject 다음", () => {
    expect(
      composeFinalPrompt({
        artists: [],
        characters: [
          { work: "원신", kor: "호두", eng: "hu_tao_(genshin_impact)" },
          { work: "원신", kor: "감우", eng: "ganyu_(genshin_impact)" },
        ],
        subject: "1girl",
        qualityBody: "masterpiece",
      }),
    ).toBe(
      "1girl, solo, hu_tao_(genshin_impact), ganyu_(genshin_impact), masterpiece",
    );
  });
});
