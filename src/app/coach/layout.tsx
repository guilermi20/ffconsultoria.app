import CoachShell from "@/components/CoachShell";
import { requireCoach } from "@/server/session";

export default async function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const coach = await requireCoach();
  return <CoachShell coachName={coach.name}>{children}</CoachShell>;
}
