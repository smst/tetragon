"use client";
import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Team } from "@/types";
import { useTournamentData } from "@/hooks/useTournamentData";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SubPartConfig {
    label: string; // e.g. 'a', 'b', 'c'
    points: number;
}

interface TeamRoundConfigRow {
    id: string;
    subject: "math" | "science";
    question_number: number;
    sub_parts: SubPartConfig[]; // [] = no sub-parts
    points: number; // whole-question points when sub_parts is empty
}

// A single gradeable button — either a whole question or one sub-part
interface GradeableUnit {
    key: string; // e.g. 'math_1', 'science_2b'
    subject: "math" | "science";
    label: string; // e.g. 'Q1', 'Q2b'
    points: number;
}

// ── Default config ────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: TeamRoundConfigRow[] = [
    { id: "d1", subject: "math", question_number: 1, sub_parts: [], points: 1 },
    { id: "d2", subject: "math", question_number: 2, sub_parts: [], points: 1 },
    { id: "d3", subject: "math", question_number: 3, sub_parts: [], points: 1 },
    { id: "d4", subject: "math", question_number: 4, sub_parts: [], points: 1 },
    { id: "d5", subject: "math", question_number: 5, sub_parts: [], points: 1 },
    {
        id: "d6",
        subject: "science",
        question_number: 1,
        sub_parts: [],
        points: 1,
    },
    {
        id: "d7",
        subject: "science",
        question_number: 2,
        sub_parts: [],
        points: 1,
    },
    {
        id: "d8",
        subject: "science",
        question_number: 3,
        sub_parts: [],
        points: 1,
    },
    {
        id: "d9",
        subject: "science",
        question_number: 4,
        sub_parts: [],
        points: 1,
    },
    {
        id: "d10",
        subject: "science",
        question_number: 5,
        sub_parts: [],
        points: 1,
    },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildUnits(config: TeamRoundConfigRow[]): GradeableUnit[] {
    const units: GradeableUnit[] = [];
    const sorted = [...config].sort(
        (a, b) => a.question_number - b.question_number,
    );

    for (const row of sorted) {
        if (row.sub_parts.length === 0) {
            units.push({
                key: `${row.subject}_${row.question_number}`,
                subject: row.subject,
                label: `Q${row.question_number}`,
                points: Number(row.points) || 1,
            });
        } else {
            for (const part of row.sub_parts) {
                units.push({
                    key: `${row.subject}_${row.question_number}${part.label}`,
                    subject: row.subject,
                    label: `Q${row.question_number}${part.label}`,
                    points: Number(part.points) || 1,
                });
            }
        }
    }
    return units;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface TeamGradingProps {
    teams: Team[];
}

export default function TeamGrading({ teams }: TeamGradingProps) {
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
    const [responses, setResponses] = useState<Record<string, boolean>>({});
    const [status, setStatus] = useState<string>("");
    const [loadingData, setLoadingData] = useState<boolean>(false);

    const [gradedIDs, setGradedIDs] = useState<Set<string>>(new Set());
    const [loadingGradedStatus, setLoadingGradedStatus] =
        useState<boolean>(true);

    const [config, setConfig] = useState<TeamRoundConfigRow[]>(DEFAULT_CONFIG);
    const [loadingConfig, setLoadingConfig] = useState<boolean>(true);

    const { refreshData } = useTournamentData();

    const units = useMemo(() => buildUnits(config), [config]);
    const mathUnits = useMemo(
        () => units.filter((u) => u.subject === "math"),
        [units],
    );
    const scienceUnits = useMemo(
        () => units.filter((u) => u.subject === "science"),
        [units],
    );

    // Group by room
    const groupedData = useMemo(() => {
        const groups: Record<string, Team[]> = {};
        teams.forEach((t) => {
            const room = t.room?.toString() || "Unassigned Room";
            if (!groups[room]) groups[room] = [];
            groups[room].push(t);
        });
        const sortedRooms = Object.keys(groups).sort((a, b) =>
            a.localeCompare(b, undefined, { numeric: true }),
        );
        return { groups, sortedRooms };
    }, [teams]);

    // Fetch config
    useEffect(() => {
        const fetchConfig = async () => {
            setLoadingConfig(true);
            const { data, error } = await supabase
                .from("team_round_config")
                .select("*")
                .order("subject")
                .order("question_number");

            if (!error && data && data.length > 0) {
                setConfig(data as TeamRoundConfigRow[]);
            }
            setLoadingConfig(false);
        };
        fetchConfig();
    }, []);

    // Fetch graded status
    useEffect(() => {
        const fetchGradedStatus = async () => {
            setLoadingGradedStatus(true);
            const { data } = await supabase
                .from("team_round_responses")
                .select("team_id");

            if (data) {
                setGradedIDs(new Set<string>(data.map((r: any) => r.team_id)));
            }
            setLoadingGradedStatus(false);
        };
        fetchGradedStatus();
    }, []);

    // Load saved responses when team selected
    useEffect(() => {
        if (!selectedTeam) return;

        const loadSaved = async () => {
            setLoadingData(true);
            setStatus("Checking for saved data...");
            setResponses({});

            const { data, error } = await supabase
                .from("team_round_responses")
                .select("question_key, is_correct")
                .eq("team_id", selectedTeam.id);

            if (error) {
                setStatus("Error loading data");
            } else if (data && data.length > 0) {
                const loaded: Record<string, boolean> = {};
                data.forEach((r: any) => {
                    loaded[r.question_key] = r.is_correct;
                });
                setResponses(loaded);
                setStatus("Loaded saved grades.");
            } else {
                setStatus("No previous grades found.");
            }
            setLoadingData(false);
        };

        loadSaved();
    }, [selectedTeam]);

    // Handlers
    const toggleAnswer = (key: string) => {
        setResponses((prev) => ({ ...prev, [key]: !prev[key] }));
        setStatus("Unsaved changes!");
    };

    const handleSave = async () => {
        if (!selectedTeam) return;
        setStatus("Saving...");

        const { error: deleteError } = await supabase
            .from("team_round_responses")
            .delete()
            .eq("team_id", selectedTeam.id);

        if (deleteError) {
            setStatus("Error: " + deleteError.message);
            return;
        }

        const rows = units.map((u) => ({
            team_id: selectedTeam.id,
            question_key: u.key,
            subject: u.subject,
            is_correct: !!responses[u.key],
            points_possible: u.points,
        }));

        const { error: insertError } = await supabase
            .from("team_round_responses")
            .insert(rows);

        if (insertError) {
            setStatus("Error: " + insertError.message);
            return;
        }

        await refreshData();
        setGradedIDs((prev) => new Set(prev).add(selectedTeam.id));
        setStatus("Saved successfully!");
        setSelectedTeam(null);
    };

    // ── Loading config ─────────────────────────────────────────────────────────

    if (loadingConfig) {
        return (
            <div className="text-center py-12 text-gray-400 animate-pulse">
                Loading round configuration...
            </div>
        );
    }

    // ── VIEW 1: Room / team list ───────────────────────────────────────────────

    if (!selectedTeam) {
        return (
            <div className="space-y-8 mt-2">
                {groupedData.sortedRooms.length === 0 && (
                    <p className="text-gray-500 italic">No teams found.</p>
                )}

                {groupedData.sortedRooms.map((room) => (
                    <div key={room}>
                        <h3 className="text-lg shadow-sm font-bold text-gray-800 mb-4 bg-gray-100 border border-gray-300 inline-block px-3 py-1 rounded-lg">
                            {room}
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {groupedData.groups[room]
                                .sort((a, b) => a.name.localeCompare(b.name))
                                .map((team) => {
                                    const isGraded = gradedIDs.has(team.id);
                                    return (
                                        <button
                                            key={team.id}
                                            onClick={() =>
                                                setSelectedTeam(team)
                                            }
                                            className="w-full text-left bg-white rounded-xl border border-gray-300 shadow-md overflow-hidden hover:shadow-lg transition-all group cursor-pointer"
                                        >
                                            <div className="bg-gray-100 px-4 py-2 border-b border-gray-300 group-hover:bg-blue-50 transition-colors">
                                                <h4 className="font-semibold text-gray-700 truncate group-hover:text-blue-700">
                                                    {team.name}
                                                </h4>
                                            </div>
                                            <div className="p-4 flex justify-between items-center text-gray-500 text-sm group-hover:text-blue-600">
                                                <div className="flex items-center gap-2">
                                                    {loadingGradedStatus ? (
                                                        <span className="text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full text-xs border border-gray-200">
                                                            Loading...
                                                        </span>
                                                    ) : isGraded ? (
                                                        <span className="text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full text-xs border border-green-200">
                                                            Graded
                                                        </span>
                                                    ) : (
                                                        <span className="text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full text-xs border border-red-200">
                                                            Not Graded
                                                        </span>
                                                    )}
                                                </div>
                                                <span>→</span>
                                            </div>
                                        </button>
                                    );
                                })}
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    // ── VIEW 2: Grading pad ────────────────────────────────────────────────────

    return (
        <div>
            {/* Header bar */}
            <div
                className={`px-5 py-3 rounded-xl mb-4 text-md font-medium flex flex-col sm:flex-row justify-between items-center gap-2 ${
                    loadingData
                        ? "bg-yellow-50 text-yellow-800"
                        : "bg-blue-50 text-blue-800"
                }`}
            >
                <span>
                    Grading: <strong>{selectedTeam.name}</strong>
                </span>
                <span className="text-sm px-2 py-1 rounded">{status}</span>
            </div>

            {loadingData ? (
                <div className="text-center py-12 text-gray-400 animate-pulse">
                    Loading scores...
                </div>
            ) : (
                <div className="bg-white p-6 rounded-xl border border-gray-300 shadow-md">
                    {/* Math section */}
                    <p className="text-md text-gray-500 mb-4 font-medium">
                        Math
                    </p>
                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-3 mb-8">
                        {mathUnits.map((u) => (
                            <button
                                key={u.key}
                                onClick={() => toggleAnswer(u.key)}
                                className={`
                                    h-12 w-full rounded-full text-lg font-bold
                                    transition-all shadow-sm border cursor-pointer
                                    ${
                                        responses[u.key]
                                            ? "bg-green-600 text-white border-green-700 hover:bg-green-700 hover:border-green-800 shadow-green-800"
                                            : "bg-white text-gray-600 border-gray-200 hover:bg-gray-100 hover:border-gray-300"
                                    }
                                `}
                            >
                                {u.label}
                            </button>
                        ))}
                    </div>

                    {/* Science section */}
                    <p className="text-md text-gray-500 mb-4 font-medium">
                        Science
                    </p>
                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-3 mb-8">
                        {scienceUnits.map((u) => (
                            <button
                                key={u.key}
                                onClick={() => toggleAnswer(u.key)}
                                className={`
                                    h-12 w-full rounded-full text-lg font-bold
                                    transition-all shadow-sm border cursor-pointer
                                    ${
                                        responses[u.key]
                                            ? "bg-green-600 text-white border-green-700 hover:bg-green-700 hover:border-green-800 shadow-green-800"
                                            : "bg-white text-gray-600 border-gray-200 hover:bg-gray-100 hover:border-gray-300"
                                    }
                                `}
                            >
                                {u.label}
                            </button>
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 border-t border-gray-300 pt-6">
                        <button
                            onClick={() => setSelectedTeam(null)}
                            className="px-6 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-8 py-2.5 text-white bg-blue-600 hover:bg-blue-700 font-medium rounded-xl shadow-md shadow-blue-300 transition-all active:scale-95 cursor-pointer"
                        >
                            Save & Continue
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
