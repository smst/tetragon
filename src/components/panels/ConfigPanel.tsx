"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SubPartConfig {
    label: string;
    points: number;
}

interface TeamRoundConfigRow {
    id: string;
    subject: "math" | "science";
    question_number: number;
    sub_parts: SubPartConfig[];
    points: number;
}

interface EditableSubPart {
    label: string;
    points: number;
}

interface EditableRow {
    id: string;
    subject: "math" | "science";
    question_number: number;
    sub_parts: EditableSubPart[];
    points: number; // whole-question points when sub_parts is empty
    dirty: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function rowToEditable(row: TeamRoundConfigRow): EditableRow {
    return {
        id: row.id,
        subject: row.subject,
        question_number: row.question_number,
        sub_parts: row.sub_parts.map((p) => ({ ...p })),
        points: row.points,
        dirty: false,
    };
}

const SUBJECT_ORDER: ("math" | "science")[] = ["math", "science"];
const SUBJECT_LABELS: Record<string, string> = {
    math: "Math",
    science: "Science",
};
const SUBJECT_COLORS: Record<string, string> = {
    math: "text-blue-700",
    science: "text-green-700",
};

// ── Preview badge ─────────────────────────────────────────────────────────────

function PreviewBadge({ label, points }: { label: string; points: number }) {
    return (
        <span className="inline-flex items-center gap-1 bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5 text-xs mr-1 mb-1">
            <span className="font-medium">{label}</span>
            <span className="text-gray-400">{points}pt</span>
        </span>
    );
}

// ── Team Round Config Section ─────────────────────────────────────────────────

function TeamRoundConfigSection() {
    const [rows, setRows] = useState<EditableRow[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<Record<string, boolean>>({});
    const [messages, setMessages] = useState<Record<string, string>>({});

    const fetchConfig = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("team_round_config")
            .select("*")
            .order("subject")
            .order("question_number");

        if (!error && data) {
            setRows((data as TeamRoundConfigRow[]).map(rowToEditable));
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchConfig();
    }, [fetchConfig]);

    const markDirty = (id: string) => {
        setRows((prev) =>
            prev.map((r) => (r.id === id ? { ...r, dirty: true } : r)),
        );
        setMessages((prev) => ({ ...prev, [id]: "" }));
    };

    // Whole-question points (no sub-parts)
    const updatePoints = (id: string, value: number) => {
        setRows((prev) =>
            prev.map((r) => (r.id === id ? { ...r, points: value } : r)),
        );
        markDirty(id);
    };

    // Sub-part field changes
    const updateSubPart = (
        rowId: string,
        partIndex: number,
        field: keyof EditableSubPart,
        value: string | number,
    ) => {
        setRows((prev) =>
            prev.map((r) => {
                if (r.id !== rowId) return r;
                const updated = r.sub_parts.map((p, i) =>
                    i === partIndex ? { ...p, [field]: value } : p,
                );
                return { ...r, sub_parts: updated };
            }),
        );
        markDirty(rowId);
    };

    const addSubPart = (rowId: string) => {
        setRows((prev) =>
            prev.map((r) => {
                if (r.id !== rowId) return r;
                // Auto-label: next letter after the last one
                const nextLabel =
                    r.sub_parts.length === 0
                        ? "a"
                        : String.fromCharCode(
                              r.sub_parts[
                                  r.sub_parts.length - 1
                              ].label.charCodeAt(0) + 1,
                          );
                return {
                    ...r,
                    sub_parts: [
                        ...r.sub_parts,
                        { label: nextLabel, points: 1 },
                    ],
                };
            }),
        );
        markDirty(rowId);
    };

    const removeSubPart = (rowId: string, partIndex: number) => {
        setRows((prev) =>
            prev.map((r) => {
                if (r.id !== rowId) return r;
                return {
                    ...r,
                    sub_parts: r.sub_parts.filter((_, i) => i !== partIndex),
                };
            }),
        );
        markDirty(rowId);
    };

    const saveRow = async (row: EditableRow) => {
        setSaving((prev) => ({ ...prev, [row.id]: true }));

        const { error } = await supabase
            .from("team_round_config")
            .update({
                sub_parts: row.sub_parts,
                points: row.points,
            })
            .eq("id", row.id);

        if (error) {
            setMessages((prev) => ({ ...prev, [row.id]: "Error saving." }));
        } else {
            setRows((prev) =>
                prev.map((r) => (r.id === row.id ? { ...r, dirty: false } : r)),
            );
            setMessages((prev) => ({ ...prev, [row.id]: "Saved!" }));
            setTimeout(
                () => setMessages((prev) => ({ ...prev, [row.id]: "" })),
                2000,
            );
        }
        setSaving((prev) => ({ ...prev, [row.id]: false }));
    };

    if (loading) {
        return (
            <div className="text-gray-400 animate-pulse text-sm py-4">
                Loading configuration...
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <p className="text-sm text-gray-500 leading-relaxed">
                Configure questions for the team round. Add sub-parts (e.g. 1a,
                1b) with individual point values, or leave sub-parts empty for a
                single-answer question with a flat point value.
            </p>

            {SUBJECT_ORDER.map((subject) => {
                const subjectRows = rows.filter((r) => r.subject === subject);
                return (
                    <div key={subject}>
                        <h4
                            className={`text-sm font-bold uppercase tracking-wide mb-3 ${SUBJECT_COLORS[subject]}`}
                        >
                            {SUBJECT_LABELS[subject]}
                        </h4>

                        <div className="space-y-3">
                            {subjectRows.map((row) => {
                                const isSaving = saving[row.id];
                                const msg = messages[row.id];
                                const hasSubParts = row.sub_parts.length > 0;

                                return (
                                    <div
                                        key={row.id}
                                        className={`rounded-xl border p-4 transition-colors ${
                                            row.dirty
                                                ? "border-blue-300 bg-blue-50/40"
                                                : "border-gray-200 bg-white"
                                        }`}
                                    >
                                        {/* Row header */}
                                        <div className="flex items-start justify-between gap-4 mb-3">
                                            <span className="text-sm font-semibold text-gray-700 pt-1 w-8 shrink-0">
                                                Q{row.question_number}
                                            </span>

                                            {/* No sub-parts: single points input */}
                                            {!hasSubParts && (
                                                <div className="flex items-center gap-2 flex-1">
                                                    <span className="text-xs text-gray-500">
                                                        Points:
                                                    </span>
                                                    <input
                                                        type="number"
                                                        min={0.5}
                                                        step={0.5}
                                                        value={row.points}
                                                        onChange={(e) =>
                                                            updatePoints(
                                                                row.id,
                                                                parseFloat(
                                                                    e.target
                                                                        .value,
                                                                ) || 1,
                                                            )
                                                        }
                                                        className="w-20 px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                    <span className="text-xs text-gray-400 italic">
                                                        Single answer
                                                    </span>
                                                </div>
                                            )}

                                            {/* Has sub-parts: preview */}
                                            {hasSubParts && (
                                                <div className="flex flex-wrap flex-1 items-center">
                                                    {row.sub_parts.map((p) => (
                                                        <PreviewBadge
                                                            key={p.label}
                                                            label={`Q${row.question_number}${p.label}`}
                                                            points={p.points}
                                                        />
                                                    ))}
                                                </div>
                                            )}

                                            {/* Actions */}
                                            <div className="flex items-center gap-2 shrink-0">
                                                {msg ? (
                                                    <span
                                                        className={`text-xs font-medium ${
                                                            msg === "Saved!"
                                                                ? "text-green-600"
                                                                : "text-red-500"
                                                        }`}
                                                    >
                                                        {msg}
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={() =>
                                                            saveRow(row)
                                                        }
                                                        disabled={
                                                            !row.dirty ||
                                                            isSaving
                                                        }
                                                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                                                            row.dirty &&
                                                            !isSaving
                                                                ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:scale-95"
                                                                : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                                        }`}
                                                    >
                                                        {isSaving
                                                            ? "Saving..."
                                                            : "Save"}
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() =>
                                                        addSubPart(row.id)
                                                    }
                                                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 cursor-pointer transition-all"
                                                    title="Add sub-part"
                                                >
                                                    + Part
                                                </button>
                                            </div>
                                        </div>

                                        {/* Sub-part editor rows */}
                                        {hasSubParts && (
                                            <div className="space-y-2 pl-8 mt-2 border-t border-gray-100 pt-3">
                                                {row.sub_parts.map(
                                                    (part, i) => (
                                                        <div
                                                            key={i}
                                                            className="flex items-center gap-3"
                                                        >
                                                            <span className="text-xs text-gray-400 w-4">
                                                                {i + 1}.
                                                            </span>
                                                            {/* Label */}
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-xs text-gray-500">
                                                                    Label:
                                                                </span>
                                                                <input
                                                                    type="text"
                                                                    maxLength={
                                                                        2
                                                                    }
                                                                    value={
                                                                        part.label
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        updateSubPart(
                                                                            row.id,
                                                                            i,
                                                                            "label",
                                                                            e.target.value.toLowerCase(),
                                                                        )
                                                                    }
                                                                    className="w-14 px-2 py-1 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                />
                                                            </div>
                                                            {/* Points */}
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-xs text-gray-500">
                                                                    Points:
                                                                </span>
                                                                <input
                                                                    type="number"
                                                                    min={0.5}
                                                                    step={0.5}
                                                                    value={
                                                                        part.points
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        updateSubPart(
                                                                            row.id,
                                                                            i,
                                                                            "points",
                                                                            parseFloat(
                                                                                e
                                                                                    .target
                                                                                    .value,
                                                                            ) ||
                                                                                1,
                                                                        )
                                                                    }
                                                                    className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                />
                                                            </div>
                                                            {/* Remove */}
                                                            <button
                                                                onClick={() =>
                                                                    removeSubPart(
                                                                        row.id,
                                                                        i,
                                                                    )
                                                                }
                                                                className="text-xs text-red-400 hover:text-red-600 cursor-pointer px-1"
                                                                title="Remove sub-part"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ── Config sections registry ──────────────────────────────────────────────────

interface ConfigSection {
    id: string;
    label: string;
    description: string;
    component: React.ReactNode;
}

// ── Main ConfigPanel ──────────────────────────────────────────────────────────

export default function ConfigPanel() {
    const [activeSection, setActiveSection] = useState<string>("team_round");

    const sections: ConfigSection[] = [
        {
            id: "team_round",
            label: "Team Round",
            description: "Question structure and point values",
            component: <TeamRoundConfigSection />,
        },
        // Add future sections here, e.g.:
        // { id: "scoring_weights", label: "Scoring Weights", ... }
    ];

    const active = sections.find((s) => s.id === activeSection) ?? sections[0];

    return (
        <section className="bg-white shadow-lg border border-gray-300 rounded-2xl p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">
                        Tournament Configuration
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Manage settings and scoring structures for this
                        tournament.
                    </p>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-6">
                {/* Sidebar */}
                <nav className="sm:w-48 shrink-0">
                    <ul className="space-y-1">
                        {sections.map((s) => (
                            <li key={s.id}>
                                <button
                                    onClick={() => setActiveSection(s.id)}
                                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                                        activeSection === s.id
                                            ? "bg-blue-50 text-blue-700"
                                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                    }`}
                                >
                                    <div>{s.label}</div>
                                    <div className="text-xs font-normal text-gray-400 mt-0.5">
                                        {s.description}
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>

                {/* Divider */}
                <div className="hidden sm:block w-px bg-gray-200 self-stretch" />

                {/* Content */}
                <div className="flex-1 min-w-0">{active.component}</div>
            </div>
        </section>
    );
}
