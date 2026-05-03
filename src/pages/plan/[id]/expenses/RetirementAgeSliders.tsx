import { Slider } from "@/components/ui/slider";
import { useUpdatePerson } from "@/hooks/use-people";
import { useEffect, useState } from "react";

interface Person {
  id: number;
  firstName: string;
  role: "primary" | "partner";
  retirementAge?: number | null;
}

interface Props {
  people: Person[];
}

const MIN_AGE = 50;
const MAX_AGE = 80;

export function RetirementAgeSliders({ people }: Props) {
  const updatePerson = useUpdatePerson();

  // Local draft so the slider is responsive while the user drags. Commit on
  // release (onPointerUp / onValueCommit) to avoid a write per frame.
  const [drafts, setDrafts] = useState<Record<number, number>>({});
  useEffect(() => {
    setDrafts((prev) => {
      const next = { ...prev };
      for (const p of people) {
        if (next[p.id] === undefined) {
          next[p.id] = p.retirementAge ?? 65;
        }
      }
      return next;
    });
  }, [people]);

  const commit = async (personId: number, value: number) => {
    await updatePerson.mutateAsync({
      id: personId,
      data: { retirementAge: value },
    });
  };

  if (people.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {people.map((person) => {
        const value = drafts[person.id] ?? person.retirementAge ?? 65;
        return (
          <div key={person.id} className="rounded-lg border bg-card p-4">
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-medium">
                {person.role === "primary" ? "Your retirement age" : `${person.firstName}'s retirement age`}
              </p>
              <p className="text-xl font-semibold">{value}</p>
            </div>
            <div className="mt-3">
              <Slider
                value={value}
                min={MIN_AGE}
                max={MAX_AGE}
                step={1}
                onValueChange={(v) => setDrafts((d) => ({ ...d, [person.id]: v }))}
                onPointerUp={() => {
                  const current = drafts[person.id];
                  if (current !== undefined && current !== person.retirementAge) {
                    void commit(person.id, current);
                  }
                }}
              />
              <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
                <span>{MIN_AGE} yrs</span>
                <span>{MAX_AGE} yrs</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
