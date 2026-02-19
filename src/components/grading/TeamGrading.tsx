"use client";
import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Team } from "@/types";
import { useTournamentData } from "@/hooks/useTournamentData";

interface TeamGradingProps {
    teams: Team[];
}

export default function TeamGrading({ teams }: TeamGradingProps) {
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
    const [status, setStatus] = useState<string>("");
    const [score, setScore] = useState<string | number>("");

    const [gradedIDs, setGradedIDs] = useState<Set<string>>(new Set());
    const [loadingGradedStatus, setLoadingGradedStatus] =
        useState<boolean>(true);

    const { refreshData } = useTournamentData();

    // Group by Room
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

    // Fetch Graded Status
    useEffect(() => {
        const fetchGradedStatus = async () => {
            setLoadingGradedStatus(true);
            const { data } = await supabase
                .from("teams")
                .select("id, team_round_score")
                .not("team_round_score", "is", null);

            if (data) {
                const ids = new Set<string>(data.map((row: any) => row.id));
                setGradedIDs(ids);
            }
            setLoadingGradedStatus(false);
        };
        fetchGradedStatus();
    }, []);

    // Load Existing Data
    useEffect(() => {
        if (!selectedTeam) return;

        const loadSavedData = async () => {
            setStatus("Checking for saved data...");
            setScore("");

            const { data, error } = await supabase
                .from("teams")
                .select("team_round_score")
                .eq("id", selectedTeam.id)
                .single();

            if (error && error.code !== "PGRST116") {
                setStatus("Error loading data");
            } else if (data && data.team_round_score !== null) {
                setScore(data.team_round_score);
                setStatus("Loaded saved grades.");
            } else {
                setStatus("No previous grades found.");
            }
        };

        loadSavedData();
    }, [selectedTeam]);

    const handleSave = async () => {
        if (!selectedTeam) return;
        setStatus("Saving...");

        const numericScore = parseFloat(score.toString()) || 0;

        const { error } = await supabase
            .from("teams")
            .update({ team_round_score: numericScore })
            .eq("id", selectedTeam.id);

        if (error) {
            setStatus("Error: " + error.message);
        } else {
            await refreshData();
            setStatus("Saved successfully!");
            setGradedIDs((prev) => new Set(prev).add(selectedTeam.id));
            setSelectedTeam(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* --- VIEW 1: THE ROOM LIST --- */}
            {!selectedTeam && (
                <div className="space-y-8 mt-2">
                    {groupedData.sortedRooms.length === 0 && (
                        <p className="text-gray-500 italic">No teams found.</p>
                    )}

                    {groupedData.sortedRooms.map((room) => (
                        <div key={room}>
                            <h3 className="text-lg shadow-sm font-bold text-gray-800 mb-4 bg-gray-100 border border-gray-300 inline-block px-3 py-1 rounded-lg">
                                {room}
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {groupedData.groups[room]
                                    .sort((a, b) =>
                                        a.name.localeCompare(b.name),
                                    )
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
            )}

            {/* --- VIEW 2: THE GRADING PAD --- */}
            {selectedTeam && (
                <div>
                    <div className="bg-blue-50 text-blue-800 px-5 py-3 rounded-xl mb-4 text-md font-medium flex flex-col sm:flex-row justify-between items-center gap-2">
                        <span>
                            Grading: <strong>{selectedTeam.name}</strong>
                        </span>
                        <span className="text-sm px-2 py-1 rounded">
                            {status}
                        </span>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-gray-300 shadow-md">
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Team Round Raw Score
                            </label>
                            <input
                                type="number"
                                value={score}
                                onChange={(
                                    e: React.ChangeEvent<HTMLInputElement>,
                                ) => setScore(e.target.value)}
                                placeholder="Enter score"
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 border"
                            />
                        </div>

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
                </div>
            )}
        </div>
    );
}
