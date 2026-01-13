"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function TeamGrading({ teams }) {
    // --- STATE ---
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [responses, setResponses] = useState({});
    const [status, setStatus] = useState("");
    const [loadingData, setLoadingData] = useState(false);

    // Filter teams based on search input
    const filteredTeams =
        searchTerm === ""
            ? []
            : teams
                  .filter((t) =>
                      t.name.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .slice(0, 5); // Limit results for cleaner UI

    // --- 1. FETCH SAVED DATA ON SELECTION ---
    useEffect(() => {
        if (!selectedTeam) return;

        const loadSavedTeamGrades = async () => {
            setLoadingData(true);
            setStatus("Checking for saved data...");

            const { data, error } = await supabase
                .from("team_round_responses")
                .select("question_number, is_correct")
                .eq("team_id", selectedTeam.id);

            if (error) {
                setStatus("Error loading data");
            } else if (data && data.length > 0) {
                // Convert array to object map: {1: true, 2: false, ...}
                const loadedResponses = {};
                data.forEach((row) => {
                    loadedResponses[row.question_number] = row.is_correct;
                });
                setResponses(loadedResponses);
                setStatus("Loaded saved grades.");
            } else {
                setResponses({}); // Reset for new team
                setStatus("No previous grades found.");
            }
            setLoadingData(false);
        };

        loadSavedTeamGrades();
    }, [selectedTeam]);

    // --- 2. HANDLERS ---
    const handleSelect = (team) => {
        setSelectedTeam(team);
        setSearchTerm("");
    };

    const toggleAnswer = (qNum) => {
        setResponses((prev) => ({ ...prev, [qNum]: !prev[qNum] }));
        setStatus("Unsaved changes...");
    };

    const handleSave = async () => {
        if (!selectedTeam) return;
        setStatus("Saving...");

        // A. Delete old (Clean slate for consistency)
        await supabase
            .from("team_round_responses")
            .delete()
            .eq("team_id", selectedTeam.id);

        // B. Prepare new rows
        const rows = Object.keys(responses).map((qNum) => ({
            team_id: selectedTeam.id,
            question_number: parseInt(qNum),
            is_correct: responses[qNum],
        }));

        // C. Insert new
        if (rows.length > 0) {
            const { error } = await supabase
                .from("team_round_responses")
                .insert(rows);
            if (error) {
                setStatus("Error: " + error.message);
                return;
            }
        }
        setStatus("Team score saved!");
    };

    return (
        <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">
                Team Round Grading
            </h2>

            {/* --- SEARCH BAR --- */}
            <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Find Team
                </label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Type team name..."
                        value={selectedTeam ? selectedTeam.name : searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setSelectedTeam(null);
                            setResponses({});
                            setStatus("");
                        }}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                    />
                    {selectedTeam && (
                        <button
                            onClick={() => {
                                setSelectedTeam(null);
                                setSearchTerm("");
                                setResponses({});
                                setStatus("");
                            }}
                            className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300"
                        >
                            Clear
                        </button>
                    )}
                </div>

                {/* Dropdown Results */}
                {searchTerm && !selectedTeam && (
                    <div className="absolute z-10 w-full bg-white mt-1 border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                        {filteredTeams.length > 0 ? (
                            filteredTeams.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => handleSelect(t)}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700"
                                >
                                    {t.name}
                                </button>
                            ))
                        ) : (
                            <div className="px-4 py-2 text-sm text-gray-500">
                                No matching team found.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* --- GRADING INTERFACE --- */}
            {selectedTeam && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                    <div
                        className={`p-3 rounded-md mb-4 text-sm font-medium flex justify-between items-center ${
                            loadingData
                                ? "bg-yellow-50 text-yellow-800"
                                : "bg-blue-50 text-blue-800"
                        }`}
                    >
                        <span>
                            Grading Team: <strong>{selectedTeam.name}</strong>
                        </span>
                        <span className="text-xs opacity-75">{status}</span>
                    </div>

                    {loadingData ? (
                        <div className="text-center py-8 text-gray-400">
                            Loading saved scores...
                        </div>
                    ) : (
                        <>
                            <p className="text-sm text-gray-500 mb-2">
                                Mark correct answers (Questions 1-10)
                            </p>
                            <div className="grid grid-cols-5 gap-3 mb-6">
                                {Array.from(
                                    { length: 10 },
                                    (_, i) => i + 1
                                ).map((num) => (
                                    <button
                                        key={num}
                                        onClick={() => toggleAnswer(num)}
                                        className={`
                      h-12 w-full rounded-md text-base font-bold transition-all shadow-sm border
                      ${
                          responses[num]
                              ? "bg-blue-600 text-white border-blue-700 ring-2 ring-blue-300"
                              : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                      }
                    `}
                                    >
                                        Q{num}
                                    </button>
                                ))}
                            </div>

                            <div className="flex justify-end">
                                <button
                                    onClick={handleSave}
                                    className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                    Save Team Round
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
