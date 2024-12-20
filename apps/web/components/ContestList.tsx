import { ContestLevel } from "@prisma/client";
import { ContestCard } from "./ContestCard";

interface Contest {
  id: number;
  name: string;
  level: ContestLevel;
  contributedBy: string;
  closesOn: Date;
  startsOn: Date;
  isRegistered: boolean;
  _count: {
    problems: number;
  };
}
interface ContestListProps {
  type: "current" | "upcoming" | "ended";
  contests: Contest[];
  isLoggedIn: boolean;
}
export function ContestList({ contests, type, isLoggedIn }: ContestListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {contests.map((contest) => (
        <ContestCard
          key={contest.id}
          isLoggedIn={isLoggedIn}
          type={type}
          {...contest}
        />
      ))}
    </div>
  );
}
