"use client";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Team } from "@/types";
import { useTournamentData } from "@/hooks/useTournamentData";

// --- SCORING CONSTANTS ---
const M_AVAILABLE =
    parseFloat(process.env.NEXT_PUBLIC_DESIGN_KIT_MASS || "85") || 85;
const K = parseFloat(process.env.NEXT_PUBLIC_DESIGN_K_MULTIPLIER || "10") || 10;

interface DesignGradingProps {
    teams: Team[];
}

export default function DesignGrading({ teams }: DesignGradingProps) {
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
    const [status, setStatus] = useState("");
    const [loadingData, setLoadingData] = useState(false);

    const [massUsed, setMassUsed] = useState<string | number>("");
    const [isFinished, setIsFinished] = useState(false);
    const [timeTaken, setTimeTaken] = useState<string | number>("");
    const [distanceTraveled, setDistanceTraveled] = useState<string | number>(
        "",
    );
    const [calculatedScore, setCalculatedScore] = useState<number>(0);

    const [gradedIDs, setGradedIDs] = useState<Set<string>>(new Set());
    const [loadingGradedStatus, setLoadingGradedStatus] = useState(true);

    const { refreshData } = useTournamentData();

    // --- 1. GROUPING LOGIC ---
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

    // --- 2. FETCH GRADED STATUS ---
    useEffect(() => {
        const fetchGradedStatus = async () => {
            setLoadingGradedStatus(true);
            const { data } = await supabase
                .from("design_challenge_entries")
                .select("team_id");

            if (data) {
                const ids = new Set<string>(data.map((row) => row.team_id));
                setGradedIDs(ids);
            }
            setLoadingGradedStatus(false);
        };
        fetchGradedStatus();
    }, []);

    // --- 3. CALCULATE SCORE ---
    useEffect(() => {
        const m_used = parseFloat(massUsed.toString());

        if (!m_used || m_used <= 0) {
            setCalculatedScore(0);
            return;
        }

        let velocity = 0;

        if (isFinished) {
            const t = parseFloat(timeTaken.toString());
            if (t > 0) {
                velocity = 60 / t;
            }
        } else {
            const d = parseFloat(distanceTraveled.toString());
            if (d >= 0) {
                velocity = d / 30;
            }
        }

        const materialMultiplier = Math.sqrt(M_AVAILABLE / m_used);
        const score = K * Math.sqrt(velocity * Math.sqrt(materialMultiplier));

        setCalculatedScore(score);
    }, [massUsed, isFinished, timeTaken, distanceTraveled]);

    // --- 4. FETCH EXISTING DATA ---
    useEffect(() => {
        if (!selectedTeam) return;

        const loadSavedData = async () => {
            setLoadingData(true);
            setStatus("Checking for saved data...");

            setMassUsed("");
            setIsFinished(false);
            setTimeTaken("");
            setDistanceTraveled("");
            setCalculatedScore(0);

            const { data, error } = await supabase
                .from("design_challenge_entries")
                .select("*")
                .eq("team_id", selectedTeam.id)
                .single();

            if (error && error.code !== "PGRST116") {
                setStatus("Error loading data");
            } else if (data) {
                setMassUsed(data.mass_used || "");
                setIsFinished(data.is_finished || false);
                setTimeTaken(data.time_taken || "");
                setDistanceTraveled(data.distance_traveled || "");
                setStatus("Loaded saved grades.");
            } else {
                setStatus("No previous grades found.");
            }
            setLoadingData(false);
        };

        loadSavedData();
    }, [selectedTeam]);

    // --- 5. HANDLERS ---
    const handleSave = async () => {
        if (!selectedTeam) return;
        setStatus("Saving...");

        const payload = {
            team_id: selectedTeam.id,
            mass_used: parseFloat(massUsed.toString()) || 0,
            is_finished: isFinished,
            time_taken: isFinished ? parseFloat(timeTaken.toString()) || 0 : 30,
            distance_traveled: isFinished
                ? 60
                : parseFloat(distanceTraveled.toString()) || 0,
            final_score: calculatedScore,
        };

        const { error } = await supabase
            .from("design_challenge_entries")
            .upsert(payload, { onConflict: "team_id" });

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

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <span className="text-sm px-2 py-1 rounded">
                            {status}
                        </span>
                    </div>

                    {loadingData ? (
                        <div className="text-center py-12 text-gray-400">
                            Loading scores...
                        </div>
                    ) : (
                        <div className="bg-white p-6 rounded-xl border border-gray-300 shadow-md">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Mass Used (grams)
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={85}
                                        value={massUsed}
                                        onChange={(e) =>
                                            setMassUsed(e.target.value)
                                        }
                                        placeholder="e.g. 23"
                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 border"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Result
                                    </label>
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => {
                                                setIsFinished(true);
                                                setDistanceTraveled("60");
                                            }}
                                            className={`flex-1 py-3 px-4 rounded-lg border font-medium transition-all cursor-pointer shadow-sm ${
                                                isFinished
                                                    ? "bg-green-600 text-white border-green-700 shadow-green-800"
                                                    : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"
                                            }`}
                                        >
                                            Finished
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsFinished(false);
                                                setTimeTaken("30");
                                            }}
                                            className={`flex-1 py-3 px-4 rounded-lg border font-medium transition-all cursor-pointer shadow-sm ${
                                                !isFinished
                                                    ? "bg-blue-600 text-white border-blue-700 shadow-blue-800"
                                                    : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"
                                            }`}
                                        >
                                            Did Not Finish
                                        </button>
                                    </div>
                                </div>

                                {isFinished ? (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Time to Finish (seconds)
                                        </label>
                                        <input
                                            type="number"
                                            min={0}
                                            max={30}
                                            value={timeTaken}
                                            onChange={(e) =>
                                                setTimeTaken(e.target.value)
                                            }
                                            placeholder="e.g. 12"
                                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-3 border"
                                        />
                                        <p className="text-xs text-green-600 mt-2 ml-1">
                                            Distance fixed at 60 inches.
                                        </p>
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Distance Traveled (inches)
                                        </label>
                                        <input
                                            type="number"
                                            min={0}
                                            max={60}
                                            value={distanceTraveled}
                                            onChange={(e) =>
                                                setDistanceTraveled(
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="e.g. 45"
                                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 border"
                                        />
                                        <p className="text-xs text-blue-600 mt-2 ml-1">
                                            Time fixed at 30 seconds.
                                        </p>
                                    </div>
                                )}

                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex flex-col justify-center">
                                    <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                                        Calculated Score
                                    </span>
                                    <span className="text-3xl font-bold text-gray-800 mt-1">
                                        {isFinite(calculatedScore)
                                            ? calculatedScore.toFixed(2)
                                            : "0.00"}
                                    </span>
                                </div>
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
                    )}
                </div>
            )}
        </div>
    );
}
