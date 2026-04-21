import { PasswordGate } from "@/components/PasswordGate";
import { VideoGenerator } from "@/components/VideoGenerator";

export default function Home() {
  return (
    <PasswordGate>
      <VideoGenerator />
    </PasswordGate>
  );
}
