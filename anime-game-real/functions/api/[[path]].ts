import {
  MODELS,
  PROMPT,
  providerSize,
  type ModelId,
} from "../../src/lib/images.ts";
interface Env {
  DB: D1Database;
  OPENAI_API_KEY: string;
  GEMINI_API_KEY: string;
  SESSION_SECRET: string;
}
type InputImage = { src: string; width: number; height: number };
const json = (v: unknown, status = 200) =>
  new Response(JSON.stringify(v), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return btoa(
    String.fromCharCode(
      ...new Uint8Array(
        await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)),
      ),
    ),
  )
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}
async function token(data: unknown, env: Env) {
  const value = btoa(JSON.stringify(data));
  return `${value}.${await sign(value, env.SESSION_SECRET)}`;
}
async function verify(value: string, env: Env) {
  const [data, sig] = value.split(".");
  if (!data || sig !== (await sign(data, env.SESSION_SECRET)))
    throw Error("Invalid session");
  return JSON.parse(atob(data));
}
async function api(url: string, key: string, body?: unknown, method = "POST") {
  const response = await fetch(url, {
    method,
    headers: {
      ...(url.includes("generativelanguage.googleapis.com")
        ? { "x-goog-api-key": key }
        : { Authorization: `Bearer ${key}` }),
      "Content-Type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(180000),
  });
  const data: any = await response.json();
  if (!response.ok)
    throw Error(
      `제공사 응답 ${response.status}: ${String(data.error?.message || "요청 실패").slice(0, 240)}`,
    );
  return data;
}
function openaiBody(image: InputImage, model: ModelId) {
  return {
    model: MODELS.find((m) => m.id === model)!.api,
    images: [{ image_url: image.src }],
    prompt: PROMPT,
    size: providerSize(image.width, image.height),
    quality: "medium",
    output_format: "png",
    n: 1,
  };
}
function googleBody(image: InputImage) {
  const ratios = [
    "1:1",
    "1:4",
    "1:8",
    "2:3",
    "3:2",
    "3:4",
    "4:1",
    "4:3",
    "4:5",
    "5:4",
    "8:1",
    "9:16",
    "16:9",
    "21:9",
  ];
  const ratio = ratios.sort(
    (a, b) =>
      Math.abs(
        Math.log(
          Number(a.split(":")[0]) /
            Number(a.split(":")[1]) /
            (image.width / image.height),
        ),
      ) -
      Math.abs(
        Math.log(
          Number(b.split(":")[0]) /
            Number(b.split(":")[1]) /
            (image.width / image.height),
        ),
      ),
  )[0];
  return {
    contents: [
      {
        role: "user",
        parts: [
          { text: PROMPT },
          {
            inlineData: {
              mimeType: "image/png",
              data: image.src.split(",")[1],
            },
          },
        ],
      },
    ],
    generationConfig: {
      maxOutputTokens: 8192,
      thinkingConfig: { thinkingLevel: "minimal" },
      responseModalities: ["IMAGE"],
      imageConfig: { imageSize: "2K", aspectRatio: ratio },
    },
  };
}
function googleImage(data: any) {
  const part = data.candidates?.[0]?.content?.parts?.find(
    (p: any) => p.inlineData,
  );
  if (!part)
    throw Error(
      "이미지가 반환되지 않았습니다. 안전 정책 또는 입력 이미지를 확인해주세요.",
    );
  return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
}
function cost(data: any, model: ModelId, batch = false) {
  if (model === "banana") {
    const u = data.usageMetadata;
    if (!u) return 1;
    return (
      (((u.promptTokenCount || 0) * 1.5) / 1e6 +
        ((u.candidatesTokenCount || 0) * 30) / 1e6 +
        ((u.thoughtsTokenCount || 0) * 7.5) / 1e6) *
      (batch ? 0.5 : 1)
    );
  }
  const u = data.usage;
  if (!u) return 1;
  const image = u.input_tokens_details?.image_tokens || 0,
    text = u.input_tokens_details?.text_tokens || u.input_tokens || 0;
  return (
    ((image * 8 + text * 5 + (u.output_tokens || 0) * 30) / 1e6) *
    (batch ? 0.5 : 1)
  );
}
async function settle(env: Env, id: string, model: ModelId, amount: number) {
  await env.DB.prepare(`UPDATE ledger SET ${model}=? WHERE id=?`)
    .bind(Math.max(0, amount), id)
    .run();
}
export const onRequest: PagesFunction<Env> = async ({
  request,
  env,
  params,
}) => {
  try {
    if (!env.DB || !env.SESSION_SECRET)
      return json({ error: "서비스 설정 중입니다." }, 503);
    if (
      request.headers.get("Origin") &&
      request.headers.get("Origin") !== new URL(request.url).origin
    )
      return json({ error: "허용되지 않은 요청입니다." }, 403);
    const route = String(params.path || "");
    if (route === "health")
      return json({ ready: !!env.OPENAI_API_KEY && !!env.GEMINI_API_KEY });
    if (route === "acknowledge" && request.method === "POST") {
      const { token: receipt } = (await request.json()) as { token: string };
      const cleanup = await verify(receipt, env);
      if (
        cleanup.kind !== "cleanup" ||
        cleanup.expires < Date.now() ||
        !Array.isArray(cleanup.files)
      )
        return json({ error: "유효하지 않은 수신 확인입니다." }, 400);
      await Promise.all(
        cleanup.files.map(async (file: string) => {
          const response = await fetch(
            `https://api.openai.com/v1/files/${file}`,
            {
              method: "DELETE",
              headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
            },
          );
          if (!response.ok && response.status !== 404)
            throw Error("Cleanup failed");
        }),
      );
      return json({ ok: true });
    }
    if (route === "status" && request.method === "POST") {
      const body = (await request.json()) as { token: string };
      const session = await verify(body.token, env);
      if (session.expires < Date.now())
        return json({ error: "배치 조회 기간이 만료되었습니다." }, 410);
      const results: any[] = [],
        pending: any[] = [],
        cleanupFiles: string[] = [];
      for (const job of session.jobs) {
        // Deliver one model at a time to keep four-image batches within edge memory limits.
        if (results.length) {
          pending.push(job);
          continue;
        }
        try {
          if (job.model === "banana") {
            const data = await api(
              `https://generativelanguage.googleapis.com/v1beta/${job.name}`,
              env.GEMINI_API_KEY,
              undefined,
              "GET",
            );
            const state = data.metadata?.state;
            if (
              data.done ||
              ["BATCH_STATE_SUCCEEDED", "JOB_STATE_SUCCEEDED"].includes(state)
            ) {
              if (data.error) throw Error("배치 생성에 실패했습니다.");
              const entries =
                data.response?.inlinedResponses?.inlinedResponses ||
                data.response?.inlinedResponses ||
                [];
              let total = 0;
              for (let index = 0; index < entries.length; index++) {
                const entry = entries[index];
                try {
                  const value = entry.response || entry;
                  results.push({
                    index: Number(entry.metadata?.key ?? index),
                    model: job.model,
                    src: googleImage(value),
                  });
                  total += cost(value, "banana", true);
                } catch {
                  results.push({
                    index,
                    model: job.model,
                    error: "이 이미지의 배치 생성에 실패했습니다.",
                  });
                  total += 1;
                }
              }
              if (!entries.length) throw Error("배치 결과를 읽을 수 없습니다.");
              await settle(env, session.id, job.model, total);
            } else if (
              [
                "BATCH_STATE_FAILED",
                "BATCH_STATE_CANCELLED",
                "BATCH_STATE_EXPIRED",
                "JOB_STATE_FAILED",
                "JOB_STATE_CANCELLED",
                "JOB_STATE_EXPIRED",
              ].includes(state)
            )
              throw Error("배치 작업이 종료되었습니다.");
            else pending.push(job);
          } else {
            const data = await api(
              `https://api.openai.com/v1/batches/${job.name}`,
              env.OPENAI_API_KEY,
              undefined,
              "GET",
            );
            if (data.status === "completed") {
              let total = 0;
              if (data.output_file_id) {
                const response = await fetch(
                  `https://api.openai.com/v1/files/${data.output_file_id}/content`,
                  {
                    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
                  },
                );
                if (!response.ok) throw Error("배치 결과를 읽지 못했습니다.");
                for (const line of (await response.text()).trim().split("\n")) {
                  const entry = JSON.parse(line),
                    value = entry.response?.body;
                  if (value?.data?.[0]?.b64_json) {
                    results.push({
                      index: Number(entry.custom_id),
                      model: job.model,
                      src: `data:image/png;base64,${value.data[0].b64_json}`,
                    });
                    total += cost(value, job.model, true);
                  } else {
                    results.push({
                      index: Number(entry.custom_id),
                      model: job.model,
                      error: "이 이미지의 배치 생성에 실패했습니다.",
                    });
                    total += 1;
                  }
                }
              }
              if (data.error_file_id) total += 1;
              await settle(env, session.id, job.model, total);
              cleanupFiles.push(
                ...[job.file, data.output_file_id, data.error_file_id].filter(
                  Boolean,
                ),
              );
            } else if (["failed", "expired", "cancelled"].includes(data.status))
              throw Error("배치 작업이 종료되었습니다.");
            else pending.push(job);
          }
        } catch (e) {
          const reason = (e as Error).message;
          if (
            reason.includes("작업이 종료") ||
            reason.includes("배치 생성에 실패")
          )
            results.push({ index: 0, model: job.model, error: reason });
          else pending.push(job);
        }
      }
      return json({
        results,
        cleanup: cleanupFiles.length
          ? await token(
              {
                kind: "cleanup",
                files: cleanupFiles,
                expires: Date.now() + 48 * 3600000,
              },
              env,
            )
          : undefined,
        jobs: pending.length
          ? await token({ ...session, jobs: pending }, env)
          : undefined,
      });
    }
    if (route === "generate" && request.method === "POST") {
      if (Number(request.headers.get("Content-Length") || 0) > 26000000)
        return json({ error: "업로드 크기를 줄여주세요." }, 413);
      const { images, models } = (await request.json()) as {
        images: InputImage[];
        models: ModelId[];
      };
      if (
        !Array.isArray(images) ||
        images.length < 1 ||
        images.length > 4 ||
        !Array.isArray(models) ||
        !models.length ||
        models.length > 3 ||
        new Set(models).size !== models.length ||
        models.some((m) => !MODELS.some((x) => x.id === m))
      )
        return json({ error: "이미지 또는 모델 선택을 확인해주세요." }, 400);
      for (const img of images) {
        if (
          !Number.isInteger(img.width) ||
          !Number.isInteger(img.height) ||
          img.width < 1 ||
          img.height < 1 ||
          Math.max(img.width, img.height) > 2048 ||
          typeof img.src !== "string" ||
          !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(img.src) ||
          img.src.length > 24000000
        )
          return json(
            { error: "2K 이하 PNG 이미지만 전송할 수 있습니다." },
            400,
          );
        // PNG IHDR dimensions must match declared dimensions; do not trust the browser.
        const bytes = Uint8Array.from(
          atob(img.src.split(",")[1].slice(0, 44)),
          (c) => c.charCodeAt(0),
        );
        const view = new DataView(bytes.buffer);
        if (
          view.getUint32(0) !== 0x89504e47 ||
          view.getUint32(16) !== img.width ||
          view.getUint32(20) !== img.height
        )
          return json({ error: "이미지 크기가 일치하지 않습니다." }, 400);
      }
      let browser = crypto.randomUUID();
      const cookie = request.headers
        .get("Cookie")
        ?.match(/(?:^|; )a2r=([^;]+)/)?.[1];
      if (cookie)
        try {
          browser = (await verify(cookie, env)).browser;
        } catch {}
      const id = crypto.randomUUID(),
        day = new Date().toISOString().slice(0, 10),
        month = day.slice(0, 7);
      const values = {
        flare: models.includes("flare") ? images.length : 0,
        sunburst: models.includes("sunburst") ? images.length : 0,
        banana: models.includes("banana") ? images.length : 0,
      };
      const admitted = await env.DB.prepare(
        `INSERT INTO ledger(id,browser,day,month,flare,sunburst,banana) SELECT ?,?,?,?,?,?,? WHERE (SELECT count(*) FROM ledger WHERE browser=? AND day=?)<500 AND (SELECT coalesce(sum(flare),0) FROM ledger WHERE month=?)+?<=50 AND (SELECT coalesce(sum(sunburst),0) FROM ledger WHERE month=?)+?<=50 AND (SELECT coalesce(sum(banana),0) FROM ledger WHERE month=?)+?<=50`,
      )
        .bind(
          id,
          browser,
          day,
          month,
          values.flare,
          values.sunburst,
          values.banana,
          browser,
          day,
          month,
          values.flare,
          month,
          values.sunburst,
          month,
          values.banana,
        )
        .run();
      if (!admitted.meta.changes)
        return json(
          {
            error:
              "일일 이용 횟수 또는 월 예산 한도에 도달했습니다. 나중에 다시 시도해주세요.",
          },
          429,
        );
      const results: any[] = [],
        jobs: any[] = [];
      await Promise.all(
        models.map(async (model) => {
          try {
            const modelName = MODELS.find((m) => m.id === model)!.api;
            if (images.length === 1) {
              const data =
                model === "banana"
                  ? await api(
                      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`,
                      env.GEMINI_API_KEY,
                      googleBody(images[0]),
                    )
                  : await api(
                      "https://api.openai.com/v1/images/edits",
                      env.OPENAI_API_KEY,
                      openaiBody(images[0], model),
                    );
              const src =
                model === "banana"
                  ? googleImage(data)
                  : `data:image/png;base64,${data.data?.[0]?.b64_json}`;
              if (src.endsWith("undefined"))
                throw Error("이미지가 반환되지 않았습니다.");
              await settle(env, id, model, cost(data, model));
              results.push({ index: 0, model, src });
            } else if (model === "banana") {
              const data = await api(
                `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:batchGenerateContent`,
                env.GEMINI_API_KEY,
                {
                  batch: {
                    display_name: "a2r",
                    input_config: {
                      requests: {
                        requests: images.map((img, index) => ({
                          request: googleBody(img),
                          metadata: { key: String(index) },
                        })),
                      },
                    },
                  },
                },
              );
              jobs.push({ model, name: data.name });
            } else {
              const content = images
                .map((img, index) =>
                  JSON.stringify({
                    custom_id: String(index),
                    method: "POST",
                    url: "/v1/images/edits",
                    body: openaiBody(img, model),
                  }),
                )
                .join("\n");
              const form = new FormData();
              form.set("purpose", "batch");
              form.set(
                "file",
                new Blob([content], { type: "application/jsonl" }),
                "batch.jsonl",
              );
              const uploaded = await fetch("https://api.openai.com/v1/files", {
                method: "POST",
                headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
                body: form,
              });
              const file: any = await uploaded.json();
              if (!uploaded.ok) throw Error("배치 파일 전송에 실패했습니다.");
              const data = await api(
                "https://api.openai.com/v1/batches",
                env.OPENAI_API_KEY,
                {
                  input_file_id: file.id,
                  endpoint: "/v1/images/edits",
                  completion_window: "24h",
                },
              );
              jobs.push({ model, name: data.id, file: file.id });
            }
          } catch (e) {
            results.push({ index: 0, model, error: (e as Error).message });
          }
        }),
      );
      const response = json({
        results,
        jobs: jobs.length
          ? await token(
              { jobs, id, browser, expires: Date.now() + 48 * 3600000 },
              env,
            )
          : undefined,
      });
      response.headers.set(
        "Set-Cookie",
        `a2r=${await token({ browser }, env)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=31536000${new URL(request.url).hostname.endsWith(".zowoo.uk") ? "; Domain=zowoo.uk" : ""}`,
      );
      return response;
    }
    return json({ error: "요청을 찾을 수 없습니다." }, 404);
  } catch {
    return json(
      { error: "요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요." },
      500,
    );
  }
};
