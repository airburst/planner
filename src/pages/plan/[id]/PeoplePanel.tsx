import { Button } from "@/components/ui/button";
import { useUpdatePerson } from "@/hooks/use-people";
import { useState } from "react";

type Person = {
  id: number;
  planId: number;
  role: "primary" | "partner";
  firstName: string;
  dateOfBirth: string | null;
  retirementAge: number | null;
  statePensionAge: number | null;
};

interface Props {
  people: Person[];
}

interface DraftPerson {
  firstName: string;
  dateOfBirth: string;
  retirementAge: number;
  statePensionAge: number;
}

const ROLE_LABEL = { primary: "Primary", partner: "Partner" };

function currentAge(dob: string | null): number | null {
  if (!dob) return null;
  const year = new Date(dob).getFullYear();
  if (isNaN(year)) return null;
  return new Date().getFullYear() - year;
}

export function PeoplePanel({ people }: Props) {
  const updatePerson = useUpdatePerson();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<DraftPerson>({ firstName: "", dateOfBirth: "", retirementAge: 65, statePensionAge: 67 });

  const startEdit = (p: Person) => {
    setEditingId(p.id);
    setDraft({
      firstName: p.firstName,
      dateOfBirth: p.dateOfBirth ?? "",
      retirementAge: p.retirementAge ?? 65,
      statePensionAge: p.statePensionAge ?? 67,
    });
  };

  const save = async (p: Person) => {
    await updatePerson.mutateAsync({
      id: p.id,
      data: {
        firstName: draft.firstName,
        dateOfBirth: draft.dateOfBirth || null,
        retirementAge: draft.retirementAge,
        statePensionAge: draft.statePensionAge,
      },
    });
    setEditingId(null);
  };

  return (
    <div className="sw-card space-y-4">
      <h3 className="font-semibold text-base">People</h3>

      {people.length === 0 && (
        <p className="text-sm text-muted-foreground">No people added yet.</p>
      )}

      <div className="space-y-3">
        {people.map((person) =>
          editingId === person.id ? (
            <div key={person.id} className="rounded-lg border border-ring/40 bg-sw-surface-container-low p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{ROLE_LABEL[person.role]}</p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Name</label>
                  <input
                    type="text"
                    value={draft.firstName}
                    onChange={(e) => setDraft((d) => ({ ...d, firstName: e.target.value }))}
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Date of Birth</label>
                  <input
                    type="date"
                    value={draft.dateOfBirth}
                    max={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setDraft((d) => ({ ...d, dateOfBirth: e.target.value }))}
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Retirement Age</label>
                  <input
                    type="number"
                    min={50}
                    max={85}
                    value={draft.retirementAge}
                    onChange={(e) => setDraft((d) => ({ ...d, retirementAge: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">State Pension Age</label>
                  <input
                    type="number"
                    min={60}
                    max={75}
                    value={draft.statePensionAge}
                    onChange={(e) => setDraft((d) => ({ ...d, statePensionAge: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={() => save(person)} disabled={updatePerson.isPending}>
                  {updatePerson.isPending ? "Saving…" : "Save"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div key={person.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{person.firstName}</span>
                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{ROLE_LABEL[person.role]}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {currentAge(person.dateOfBirth) !== null ? `Age ${currentAge(person.dateOfBirth)}` : "No DOB"}
                  {person.retirementAge ? ` · Retires at ${person.retirementAge}` : ""}
                  {person.statePensionAge ? ` · SP at ${person.statePensionAge}` : ""}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => startEdit(person)}>Edit</Button>
            </div>
          )
        )}
      </div>
    </div>
  );
}
