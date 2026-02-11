import type { AppData } from "@/types";

export const apps: AppData[] = [
  {
    id: "today-history",
    name: "오늘의 역사",
    tagline: "매일 하나씩, 오늘의 역사 이야기",
    descriptionShort:
      "오늘 일어난 역사적 사건들을 매일 알려드립니다. 짧고 흥미로운 역사를 매일 만나보세요.",
    image: "/images/app-thumb-history.jpg",
    tags: ["Education", "Daily"],
    links: {
      googlePlayUrl:
        "https://play.google.com/store/apps/details?id=com.izowooi.todayhistory",
    },
  },
  {
    id: "homework-alert",
    name: "성역 숙제",
    tagline: "이벤트를 놓치지 않는 알리미",
    descriptionShort:
      "중요한 일정과 숙제를 놓치지 않도록 도와줍니다. 간편한 알림 설정으로 이벤트를 관리하세요.",
    image: "/images/app-thumb-homework.jpg",
    tags: ["Productivity", "Tool"],
    links: {
      googlePlayUrl:
        "https://play.google.com/store/apps/details?id=com.izowooi.homework",
    },
  },
];
