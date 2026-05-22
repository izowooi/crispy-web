export const runtime = "edge";

import MemoBoard from "@/components/MemoBoard";

interface Props {
  params: Promise<{ boardId: string }>;
}

export default async function BoardPage({ params }: Props) {
  const { boardId } = await params;
  return <MemoBoard boardId={boardId} />;
}
