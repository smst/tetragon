"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import RegistrationImportPanel from "./RegistrationImportPanel";
import VolunteerImportPanel from "./VolunteerImportPanel";

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
    points: number;
    dirty: boolean;
}

type ConfigTab = "team_round" | "import_competitors" | "import_volunteers";

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

function PreviewBadge({ label, points }: { label: string; points: number }) {
    return (
        <span className="inline-flex items-center gap-1 bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5 text-xs mr-1 mb-1">
            <span className="font-medium">{label}</span>
            <span className="text-gray-400">{points}pt</span>
        </span>
    );
}

function TeamRoundConfigSection() {
    const [rows, setRows] = useState<EditableRow[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [globalMessage, setGlobalMessage] = useState<{
        type: "success" | "error" | "";
        text: string;
    }>({ type: "", text: "" });

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
        setGlobalMessage({ type: "", text: "" });
    };

    const updatePoints = (id: string, value: number) => {
        setRows((prev) =>
            prev.map((r) => (r.id === id ? { ...r, points: value } : r)),
        );
        markDirty(id);
    };

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

    const hasChanges = rows.some((r) => r.dirty);

    const saveAllChanges = async () => {
        setIsSaving(true);
        setGlobalMessage({ type: "", text: "" });

        const dirtyRows = rows.filter((r) => r.dirty);

        let hasError = false;
        for (const row of dirtyRows) {
            const { error } = await supabase
                .from("team_round_config")
                .update({
                    sub_parts: row.sub_parts,
                    points: row.points,
                })
                .eq("id", row.id);

            if (error) {
                hasError = true;
                break;
            }
        }

        if (hasError) {
            setGlobalMessage({
                type: "error",
                text: "Error saving changes. Please try again.",
            });
        } else {
            setRows((prev) => prev.map((r) => ({ ...r, dirty: false })));
            setGlobalMessage({
                type: "success",
                text: "All changes saved successfully!",
            });
            setTimeout(() => setGlobalMessage({ type: "", text: "" }), 3000);
        }
        setIsSaving(false);
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50 border border-gray-200 rounded-xl p-4">
                <p className="text-sm text-gray-600 leading-relaxed max-w-2xl">
                    Configure question weights. Add sub-parts (e.g. 1a, 1b) with
                    individual point values, or leave sub-parts empty for a
                    single-answer question with a flat point value.
                </p>
                <div className="flex flex-col items-end shrink-0 gap-2 w-full sm:w-auto">
                    <button
                        onClick={saveAllChanges}
                        disabled={!hasChanges || isSaving}
                        className={`w-full sm:w-auto px-6 py-2.5 text-sm font-medium rounded-xl shadow-sm transition-all ${
                            hasChanges && !isSaving
                                ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:scale-95 shadow-blue-300"
                                : "bg-gray-200 text-gray-400 cursor-not-allowed"
                        }`}
                    >
                        {isSaving ? "Saving..." : "Save Changes"}
                    </button>
                    {globalMessage.text && (
                        <span
                            className={`text-xs font-semibold ${globalMessage.type === "success" ? "text-green-600" : "text-red-500"}`}
                        >
                            {globalMessage.text}
                        </span>
                    )}
                </div>
            </div>

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
                                const hasSubParts = row.sub_parts.length > 0;

                                return (
                                    <div
                                        key={row.id}
                                        className={`rounded-xl border p-4 transition-colors ${
                                            row.dirty
                                                ? "border-amber-300 bg-amber-50/40"
                                                : "border-gray-200 bg-white"
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-4 mb-3">
                                            <span className="text-sm font-semibold text-gray-700 pt-1 w-8 shrink-0">
                                                Q{row.question_number}
                                            </span>

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

                                            <div className="flex items-center gap-2 shrink-0">
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

export default function ConfigPanel() {
    const [activeTab, setActiveTab] = useState<ConfigTab>("team_round");
    const [isCollapsed, setIsCollapsed] = useState(true);

    const tabs: { id: ConfigTab; label: string }[] = [
        { id: "team_round", label: "Team Round" },
        { id: "import_competitors", label: "Import Competitors" },
        { id: "import_volunteers", label: "Import Volunteers" },
    ];

    return (
        <section className="bg-white shadow-lg border border-gray-300 rounded-2xl p-8 transition-all duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4 w-full">
                <div className="flex flex-col gap-4">
                    <h2 className="text-xl font-bold text-gray-900">
                        Tournament Configuration
                    </h2>
                    {!isCollapsed && (
                        <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg w-max overflow-x-auto">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                                        activeTab === tab.id
                                            ? "bg-white shadow text-blue-700"
                                            : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="flex items-center justify-center gap-2 px-3 py-2 transition-colors cursor-pointer whitespace-nowrap"
                >
                    <svg
                        className={`w-4 h-4 transition-transform duration-200 ${isCollapsed ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                        />
                    </svg>
                </button>
            </div>

            {!isCollapsed && (
                <div className="min-w-0">
                    {activeTab === "team_round" && <TeamRoundConfigSection />}
                    {activeTab === "import_competitors" && (
                        <RegistrationImportPanel />
                    )}
                    {activeTab === "import_volunteers" && (
                        <VolunteerImportPanel />
                    )}
                </div>
            )}
        </section>
    );
}
