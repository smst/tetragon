"use client";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function IndividualGrading({ competitors, roundType, title }) {
    // --- STATE ---
    // If selectedStudent is null, we show the Room List.
    // If selectedStudent is set, we show the Grading Interface.
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [responses, setResponses] = useState({});
    const [status, setStatus] = useState("");
    const [loadingData, setLoadingData] = useState(false);

    // --- 1. GROUPING LOGIC (The new "Room View") ---
    const groupedData = useMemo(() => {
        const groups = {};

        competitors.forEach((c) => {
            // Safe access in case team is missing (e.g. independents)
            const room = c.team?.room || "Unassigned Room";
            const teamName = c.team?.name || "No Team";

            if (!groups[room]) groups[room] = {};
            if (!groups[room][teamName]) groups[room][teamName] = [];

            groups[room][teamName].push(c);
        });

        // Sort Rooms: Numeric if possible, else alphabetical
        const sortedRooms = Object.keys(groups).sort((a, b) =>
            a.localeCompare(b, undefined, { numeric: true })
        );

        return { groups, sortedRooms };
    }, [competitors]);

    // --- 2. FETCH GRADES (When a student is clicked) ---
    useEffect(() => {
        if (!selectedStudent) return;

        const loadSavedGrades = async () => {
            setLoadingData(true);
            setStatus("Checking for saved data...");

            const tableName = `${roundType}_round_responses`;
            const { data, error } = await supabase
                .from(tableName)
                .select("question_number, is_correct")
                .eq("competitor_id", selectedStudent.id);

            if (error) {
                setStatus("Error loading data");
            } else if (data && data.length > 0) {
                const loadedResponses = {};
                data.forEach((row) => {
                    loadedResponses[row.question_number] = row.is_correct;
                });
                setResponses(loadedResponses);
                setStatus("Loaded saved grades.");
            } else {
                setResponses({});
                setStatus("No previous grades found.");
            }
            setLoadingData(false);
        };

        loadSavedGrades();
    }, [selectedStudent, roundType]);

    // --- 3. HANDLERS ---
    const toggleAnswer = (qNum) => {
        setResponses((prev) => ({ ...prev, [qNum]: !prev[qNum] }));
        setStatus("Unsaved changes!");
    };

    const handleSave = async () => {
        if (!selectedStudent) return;
        setStatus("Saving...");

        const tableName = `${roundType}_round_responses`;

        // Clean slate approach (Delete old -> Insert new)
        await supabase
            .from(tableName)
            .delete()
            .eq("competitor_id", selectedStudent.id);

        const rows = Object.keys(responses).map((qNum) => ({
            competitor_id: selectedStudent.id,
            question_number: parseInt(qNum),
            is_correct: responses[qNum],
        }));

        if (rows.length > 0) {
            const { error } = await supabase.from(tableName).insert(rows);
            if (error) {
                setStatus("Save Failed: " + error.message);
                return;
            }
        }
        setStatus("Saved successfully!");
        // Optional: Auto-go back to list after save?
        // setSelectedStudent(null);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                {/* Back Button (Only visible when grading) */}
                {selectedStudent && (
                    <button
                        onClick={() => setSelectedStudent(null)}
                        className="text-sm font-medium text-blue-600 hover:underline cursor-pointer"
                    >
                        ← Back to Rooms
                    </button>
                )}
            </div>

            {/* --- VIEW 1: THE ROOM LIST --- */}
            {!selectedStudent && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {groupedData.sortedRooms.length === 0 && (
                        <p className="text-gray-500 italic">
                            No competitors found.
                        </p>
                    )}

                    {groupedData.sortedRooms.map((room) => (
                        <div
                            key={room}
                            className="border-t border-gray-300 pt-6"
                        >
                            <h3 className="text-lg shadow-sm font-bold text-gray-800 mb-4 bg-gray-100 border border-gray-300 inline-block px-3 py-1 rounded-lg">
                                {room}
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {/* Sort Teams alphabetically within room */}
                                {Object.keys(groupedData.groups[room])
                                    .sort()
                                    .map((teamName) => (
                                        <div
                                            key={teamName}
                                            className="bg-white rounded-xl border border-gray-300 shadow-md overflow-hidden"
                                        >
                                            <div className="bg-gray-100 px-4 py-2 border-b border-gray-300">
                                                <h4
                                                    className="font-semibold text-gray-700 truncate"
                                                    title={teamName}
                                                >
                                                    {teamName}
                                                </h4>
                                            </div>
                                            <div className="p-2 space-y-1">
                                                {groupedData.groups[room][
                                                    teamName
                                                ].map((student) => (
                                                    <button
                                                        key={student.id}
                                                        onClick={() =>
                                                            setSelectedStudent(
                                                                student
                                                            )
                                                        }
                                                        className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-blue-50 hover:shadow-sm hover:text-blue-700 rounded-lg transition-colors flex justify-between items-center group cursor-pointer"
                                                    >
                                                        <span>
                                                            {student.name}
                                                        </span>
                                                        <span className="text-gray-300 group-hover:text-blue-400">
                                                            →
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* --- VIEW 2: THE GRADING PAD --- */}
            {selectedStudent && (
                <div className="animate-in zoom-in-95 duration-200">
                    <div
                        className={`px-5 py-3 rounded-xl mb-4 text-md font-medium flex flex-col sm:flex-row justify-between items-center gap-2 ${
                            loadingData
                                ? "bg-yellow-50 text-yellow-800"
                                : "bg-blue-50 text-blue-800"
                        }`}
                    >
                        <span>
                            Grading: <strong>{selectedStudent.name}</strong>
                            <span className="text-sm font-normal opacity-75 ml-2">
                                {selectedStudent.team?.name}
                            </span>
                        </span>
                        <span className="text-sm bg-white/50 px-2 py-1 rounded">
                            {status}
                        </span>
                    </div>

                    {loadingData ? (
                        <div className="text-center py-12 text-gray-400">
                            Loading scores...
                        </div>
                    ) : (
                        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                            <p className="text-md text-gray-500 mb-4 font-medium">
                                Select Correct Answers (1&ndash;20)
                            </p>

                            <div className="grid grid-cols-5 sm:grid-cols-10 gap-3 mb-8">
                                {Array.from(
                                    { length: 20 },
                                    (_, i) => i + 1
                                ).map((num) => (
                                    <button
                                        key={num}
                                        onClick={() => toggleAnswer(num)}
                                        className={`
                                            h-12 w-full rounded-xl text-lg font-bold transition-all shadow-sm border cursor-pointer
                                            ${
                                                responses[num]
                                                    ? "bg-green-600 text-white border-green-700 hover:bg-green-700 ring-2 ring-green-200"
                                                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                                            }
                                        `}
                                    >
                                        {num}
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-6">
                                <button
                                    onClick={() => setSelectedStudent(null)}
                                    className="px-6 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="px-8 py-2.5 text-white bg-blue-600 hover:bg-blue-700 font-medium rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95 cursor-pointer"
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
