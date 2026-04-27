"use client";

import { useState } from "react";

interface SideState {
  id: string | null;
  label: string;
  authorIds: string[];
}

interface TurnState {
  sideIndex: number;
  body: string;
}

interface AvailableUser {
  id: string;
  name: string;
}

interface AvailableGroup {
  id: string;
  name: string;
  status: string;
}

interface RoundTableFormProps {
  action: (formData: FormData) => Promise<void>;
  defaultPrompt: string;
  defaultGroupId: string | null;
  initialSides: SideState[];
  initialTurns: TurnState[];
  availableUsers: AvailableUser[];
  availableGroups: AvailableGroup[];
}

export function RoundTableForm({
  action,
  defaultPrompt,
  defaultGroupId,
  initialSides,
  initialTurns,
  availableUsers,
  availableGroups,
}: RoundTableFormProps) {
  const [sides, setSides] = useState<SideState[]>(
    initialSides.length === 2
      ? initialSides
      : [
          { id: null, label: "Side A", authorIds: [] },
          { id: null, label: "Side B", authorIds: [] },
        ]
  );
  const [turns, setTurns] = useState<TurnState[]>(initialTurns);

  function updateSideLabel(i: number, label: string) {
    setSides(sides.map((s, idx) => (idx === i ? { ...s, label } : s)));
  }

  function toggleSideAuthor(i: number, userId: string) {
    setSides(
      sides.map((s, idx) => {
        if (idx !== i) return s;
        const has = s.authorIds.includes(userId);
        return {
          ...s,
          authorIds: has ? s.authorIds.filter((u) => u !== userId) : [...s.authorIds, userId],
        };
      })
    );
  }

  function addTurn(sideIndex: number) {
    setTurns([...turns, { sideIndex, body: "" }]);
  }

  function removeTurn(index: number) {
    setTurns(turns.filter((_, i) => i !== index));
  }

  function updateTurnBody(index: number, body: string) {
    setTurns(turns.map((t, i) => (i === index ? { ...t, body } : t)));
  }

  function updateTurnSide(index: number, sideIndex: number) {
    setTurns(turns.map((t, i) => (i === index ? { ...t, sideIndex } : t)));
  }

  function moveTurn(index: number, dir: -1 | 1) {
    const next = [...turns];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setTurns(next);
  }

  return (
    <form action={action} className="mt-8 space-y-10">
      {/* Prompt */}
      <div>
        <label className="block font-headline text-[13px] font-semibold tracking-[0.08em] uppercase text-caption mb-2">
          Prompt
        </label>
        <textarea
          name="prompt"
          required
          rows={2}
          maxLength={500}
          defaultValue={defaultPrompt}
          className="w-full border border-ink/20 px-4 py-3 font-headline text-[18px] leading-snug placeholder:text-caption/30 outline-none focus:border-ink transition-colors resize-y"
        />
      </div>

      {/* Group */}
      <div>
        <label className="block font-headline text-[13px] font-semibold tracking-[0.08em] uppercase text-caption mb-2">
          Group (optional)
        </label>
        <select
          name="groupId"
          defaultValue={defaultGroupId ?? ""}
          className="w-full border border-ink/20 px-4 py-3 font-headline text-[15px] tracking-wide outline-none focus:border-ink transition-colors bg-white"
        >
          <option value="">&mdash; None &mdash;</option>
          {availableGroups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name} ({g.status.toLowerCase()})
            </option>
          ))}
        </select>
      </div>

      {/* Sides */}
      <div>
        <h3 className="font-headline text-[18px] font-bold tracking-wide mb-3">Sides</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {sides.map((side, i) => (
            <div key={i} className="border border-ink/10 p-5">
              <label className="block font-headline text-[12px] font-semibold tracking-[0.08em] uppercase text-caption mb-2">
                Side {i + 1} Label
              </label>
              <input
                type="text"
                value={side.label}
                onChange={(e) => updateSideLabel(i, e.target.value)}
                maxLength={80}
                placeholder={`Side ${i + 1}`}
                className="w-full border border-ink/20 px-3 py-2 font-headline text-[15px] tracking-wide outline-none focus:border-ink transition-colors"
              />
              <input type="hidden" name={`side_${i}_id`} value={side.id ?? ""} />
              <input type="hidden" name={`side_${i}_label`} value={side.label} />
              <input
                type="hidden"
                name={`side_${i}_authors`}
                value={side.authorIds.join(",")}
              />

              <p className="mt-4 font-headline text-[12px] font-semibold tracking-[0.08em] uppercase text-caption">
                Authors
              </p>
              <div className="mt-2 max-h-56 overflow-y-auto border border-ink/10 divide-y divide-ink/10">
                {availableUsers.length === 0 ? (
                  <p className="px-3 py-3 font-headline text-[13px] text-caption italic">
                    No staff users found.
                  </p>
                ) : (
                  availableUsers.map((u) => {
                    const checked = side.authorIds.includes(u.id);
                    const otherSide = sides.find((s, idx) => idx !== i && s.authorIds.includes(u.id));
                    return (
                      <label
                        key={u.id}
                        className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-neutral-50 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSideAuthor(i, u.id)}
                        />
                        <span className="font-headline text-[14px] tracking-wide">{u.name}</span>
                        {otherSide && (
                          <span className="ml-auto font-headline text-[11px] text-caption italic">
                            on {otherSide.label}
                          </span>
                        )}
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
        <input type="hidden" name="side_count" value={sides.length} />
      </div>

      {/* Turns */}
      <div>
        <div className="flex items-baseline justify-between">
          <h3 className="font-headline text-[18px] font-bold tracking-wide">Arguments</h3>
          <p className="font-headline text-[12px] text-caption">
            {turns.length} {turns.length === 1 ? "turn" : "turns"}
          </p>
        </div>

        {turns.length === 0 ? (
          <p className="mt-3 font-headline text-[13px] text-caption italic">
            No arguments yet. Use the buttons below to add the first turn.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {turns.map((turn, i) => {
              const side = sides[turn.sideIndex] ?? sides[0];
              return (
                <div key={i} className="border border-ink/10 p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <select
                        value={turn.sideIndex}
                        onChange={(e) => updateTurnSide(i, parseInt(e.target.value, 10))}
                        className="border border-ink/20 px-3 py-1.5 font-headline text-[13px] font-semibold tracking-wide outline-none focus:border-ink transition-colors bg-white"
                      >
                        {sides.map((s, idx) => (
                          <option key={idx} value={idx}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                      <span className="font-headline text-[12px] text-caption">
                        Turn {i + 1}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveTurn(i, -1)}
                        disabled={i === 0}
                        className="cursor-pointer text-caption/60 hover:text-ink transition-colors disabled:opacity-20 disabled:cursor-not-allowed px-2"
                        title="Move up"
                      >
                        &uarr;
                      </button>
                      <button
                        type="button"
                        onClick={() => moveTurn(i, 1)}
                        disabled={i === turns.length - 1}
                        className="cursor-pointer text-caption/60 hover:text-ink transition-colors disabled:opacity-20 disabled:cursor-not-allowed px-2"
                        title="Move down"
                      >
                        &darr;
                      </button>
                      <button
                        type="button"
                        onClick={() => removeTurn(i)}
                        className="cursor-pointer text-caption/40 hover:text-maroon transition-colors text-[18px] px-2"
                        title="Remove turn"
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={turn.body}
                    onChange={(e) => updateTurnBody(i, e.target.value)}
                    rows={4}
                    placeholder={`What does ${side.label} say?`}
                    className="w-full border border-ink/20 px-3 py-2 font-body text-[15px] leading-relaxed placeholder:text-caption/30 outline-none focus:border-ink transition-colors resize-y"
                  />
                  <input type="hidden" name={`turn_${i}_side`} value={turn.sideIndex} />
                  <input type="hidden" name={`turn_${i}_body`} value={turn.body} />
                </div>
              );
            })}
          </div>
        )}
        <input type="hidden" name="turn_count" value={turns.length} />

        <div className="mt-4 flex flex-wrap gap-3">
          {sides.map((side, i) => (
            <button
              key={i}
              type="button"
              onClick={() => addTurn(i)}
              className="cursor-pointer font-headline text-[13px] tracking-wide border border-ink/20 px-4 py-2 hover:border-ink hover:bg-neutral-50 transition-colors"
            >
              + Add {side.label} turn
            </button>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-rule">
        <button
          type="submit"
          className="cursor-pointer font-headline font-bold text-[15px] tracking-[0.04em] bg-ink text-white px-8 py-3 hover:bg-maroon transition-colors"
        >
          Save changes
        </button>
      </div>
    </form>
  );
}
