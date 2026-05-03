import { Button } from "@/components/ui/button";
import { useCreateIncomeStream, useDeleteIncomeStream, useUpdateIncomeStream } from "@/hooks/use-income-streams";
import { useState } from "react";

type IncomeStream = {
  id: number;
  planId: number;
  personId: number;
  streamType: "employment" | "db_pension" | "state_pension" | "other";
  name: string;
  startAge: number;
  endAge: number | null;
  annualAmount: number;
  inflationLinked: boolean;
  taxable: boolean;
};

type Person = { id: number; firstName: string; role: "primary" | "partner" };

interface Props {
  planId: number;
  incomeStreams: IncomeStream[];
  people: Person[];
}

interface DraftStream {
  name: string;
  streamType: "employment" | "db_pension" | "state_pension" | "other";
  personId: number;
  startAge: number;
  endAge: number | null;
  annualAmount: number;
  inflationLinked: boolean;
  taxable: boolean;
}

const STREAM_LABELS: Record<string, string> = {
  employment: "Employment",
  db_pension: "DB Pension",
  state_pension: "State Pension",
  other: "Other",
};

const fmt = (v: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(v);

export function IncomeStreamsPanel({ planId, incomeStreams, people }: Props) {
  const createStream = useCreateIncomeStream();
  const updateStream = useUpdateIncomeStream();
  const deleteStream = useDeleteIncomeStream();

  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<DraftStream>({
    name: "",
    streamType: "other",
    personId: people[0]?.id ?? 0,
    startAge: 65,
    endAge: null,
    annualAmount: 0,
    inflationLinked: true,
    taxable: true,
  });

  const openNew = () => {
    setDraft({
      name: "",
      streamType: "other",
      personId: people[0]?.id ?? 0,
      startAge: 65,
      endAge: null,
      annualAmount: 0,
      inflationLinked: true,
      taxable: true,
    });
    setEditingId("new");
  };

  const openEdit = (s: IncomeStream) => {
    setDraft({
      name: s.name,
      streamType: s.streamType,
      personId: s.personId,
      startAge: s.startAge,
      endAge: s.endAge,
      annualAmount: s.annualAmount,
      inflationLinked: s.inflationLinked,
      taxable: s.taxable,
    });
    setEditingId(s.id);
  };

  const save = async (existingId?: number) => {
    const data = {
      planId,
      personId: draft.personId,
      name: draft.name,
      streamType: draft.streamType,
      startAge: draft.startAge,
      endAge: draft.endAge,
      annualAmount: draft.annualAmount,
      inflationLinked: draft.inflationLinked,
      taxable: draft.taxable,
    };
    if (existingId !== undefined) {
      await updateStream.mutateAsync({ id: existingId, data });
    } else {
      await createStream.mutateAsync(data);
    }
    setEditingId(null);
  };

  const remove = async (s: IncomeStream) => {
    await deleteStream.mutateAsync({ id: s.id, planId });
  };

  const isSaving = createStream.isPending || updateStream.isPending;

  const personName = (id: number) => people.find((p) => p.id === id)?.firstName ?? "Unknown";

  const renderForm = (existingId?: number) => (
    <div className="rounded-lg border border-ring/40 bg-secondary p-4 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {existingId ? "Edit Income Stream" : "New Income Stream"}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1 col-span-2">
          <label className="text-xs font-medium text-muted-foreground">Name</label>
          <input
            type="text"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder="e.g. State Pension"
            className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Type</label>
          <select
            value={draft.streamType}
            onChange={(e) => setDraft((d) => ({ ...d, streamType: e.target.value as DraftStream["streamType"] }))}
            className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {Object.entries(STREAM_LABELS).map(([v, label]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
        </div>

        {people.length > 1 && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Person</label>
            <select
              value={draft.personId}
              onChange={(e) => setDraft((d) => ({ ...d, personId: Number(e.target.value) }))}
              className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {people.map((p) => (
                <option key={p.id} value={p.id}>{p.firstName}</option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Annual Amount (£)</label>
          <input
            type="number"
            min={0}
            step={500}
            value={draft.annualAmount}
            onChange={(e) => setDraft((d) => ({ ...d, annualAmount: Number(e.target.value) }))}
            className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Start Age</label>
          <input
            type="number"
            min={50}
            max={85}
            value={draft.startAge}
            onChange={(e) => setDraft((d) => ({ ...d, startAge: Number(e.target.value) }))}
            className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">End Age (optional)</label>
          <input
            type="number"
            min={50}
            max={100}
            value={draft.endAge ?? ""}
            placeholder="Lifetime"
            onChange={(e) => setDraft((d) => ({ ...d, endAge: e.target.value ? Number(e.target.value) : null }))}
            className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="col-span-2 flex gap-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={draft.inflationLinked}
              onChange={(e) => setDraft((d) => ({ ...d, inflationLinked: e.target.checked }))}
              className="rounded"
            />
            Inflation-linked
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={draft.taxable}
              onChange={(e) => setDraft((d) => ({ ...d, taxable: e.target.checked }))}
              className="rounded"
            />
            Taxable
          </label>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={() => save(existingId)} disabled={!draft.name || !draft.personId || isSaving}>
          {isSaving ? "Saving…" : "Save"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
      </div>
    </div>
  );

  return (
    <div className="sw-card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-base">Income Streams</h3>
        {editingId === null && people.length > 0 && (
          <Button size="sm" variant="outline" onClick={openNew}>+ Add</Button>
        )}
      </div>

      {incomeStreams.length === 0 && editingId === null && (
        <p className="text-sm text-muted-foreground">
          {people.length === 0 ? "Add a person first to set up income streams." : "No income streams added yet."}
        </p>
      )}

      <div className="space-y-3">
        {editingId === "new" && renderForm()}

        {incomeStreams.map((stream) =>
          editingId === stream.id ? (
            <div key={stream.id}>{renderForm(stream.id)}</div>
          ) : (
            <div key={stream.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{stream.name}</span>
                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {STREAM_LABELS[stream.streamType]}
                  </span>
                  {people.length > 1 && (
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {personName(stream.personId)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {fmt(stream.annualAmount)}/yr · from age {stream.startAge}
                  {stream.endAge ? ` to ${stream.endAge}` : ""}
                  {stream.inflationLinked ? " · inflation-linked" : ""}
                </p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => openEdit(stream)}>Edit</Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => remove(stream)}
                  disabled={deleteStream.isPending}
                >
                  Delete
                </Button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
