#!/usr/bin/env node
// 판교 맛집 랜덤 추천을 Slack 채널로 전송합니다.
// 환경변수: SUPABASE_URL, SUPABASE_ANON_KEY, SLACK_WEBHOOK_URL

const { SUPABASE_URL, SUPABASE_ANON_KEY, SLACK_WEBHOOK_URL } = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SLACK_WEBHOOK_URL) {
  console.error("Missing env vars: SUPABASE_URL / SUPABASE_ANON_KEY / SLACK_WEBHOOK_URL");
  process.exit(1);
}

const CATEGORY_EMOJI = {
  "점심 식사": "🍱",
  "회식": "🍻",
  "디저트": "🍰",
  "기타": "📌",
};

async function fetchRandomRestaurant() {
  const url = `${SUPABASE_URL}/rest/v1/restaurants?select=*`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Supabase fetch failed: ${res.status} ${await res.text()}`);
  }
  const rows = await res.json();
  if (!rows.length) throw new Error("No restaurants found in DB");
  return rows[Math.floor(Math.random() * rows.length)];
}

function buildSlackMessage(r) {
  const emoji = CATEGORY_EMOJI[r.category] ?? "🍽️";
  const fields = [];
  if (r.category) fields.push({ type: "mrkdwn", text: `*분류*\n${r.category}` });
  if (r.genre) fields.push({ type: "mrkdwn", text: `*장르*\n${r.genre}` });
  if (r.location) fields.push({ type: "mrkdwn", text: `*위치*\n${r.location}` });
  if (r.recommender) fields.push({ type: "mrkdwn", text: `*추천인*\n${r.recommender}` });
  if (r.payco) fields.push({ type: "mrkdwn", text: `*페이코*\n${r.payco}` });
  if (r.verified) fields.push({ type: "mrkdwn", text: `*검증*\n✅ 검증됨` });

  const blocks = [
    {
      type: "header",
      text: { type: "plain_text", text: `${emoji} 오늘의 추천: ${r.name}`, emoji: true },
    },
  ];

  if (fields.length) {
    blocks.push({ type: "section", fields: fields.slice(0, 10) });
  }

  if (r.notes) {
    blocks.push({
      type: "context",
      elements: [{ type: "mrkdwn", text: `📝 ${r.notes}` }],
    });
  }

  if (r.review) {
    const trimmed = r.review.length > 300 ? r.review.slice(0, 297) + "..." : r.review;
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `>${trimmed.replace(/\n/g, "\n>")}` },
    });
  }

  if (r.link) {
    blocks.push({
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "네이버 지도에서 보기", emoji: true },
          url: r.link,
        },
      ],
    });
  }

  blocks.push({ type: "divider" });

  return {
    text: `${emoji} 오늘의 추천: ${r.name}`,
    blocks,
  };
}

async function sendToSlack(payload) {
  const res = await fetch(SLACK_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Slack webhook failed: ${res.status} ${await res.text()}`);
  }
}

async function main() {
  const restaurant = await fetchRandomRestaurant();
  console.log(`Picked: ${restaurant.name} (${restaurant.category ?? "?"})`);
  const payload = buildSlackMessage(restaurant);
  await sendToSlack(payload);
  console.log("Sent to Slack.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
