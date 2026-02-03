"use client";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function IndividualGrading({ competitors, roundType, title }) {
    // --- STATE ---
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [responses, setResponses] = useState({});
    const [status, setStatus] = useState("");
    const [loadingData, setLoadingData] = useState(false);

    // Track which students have been graded to show indicators
    const [gradedIDs, setGradedIDs] = useState(new Set());

    // --- 1. GROUPING LOGIC ---
    const groupedData = useMemo(() => {
        const groups = {};

        competitors.forEach((c) => {
            const room = c.team?.room || "Unassigned Room";
            const teamName = c.team?.name || "No Team";

            if (!groups[room]) groups[room] = {};
            if (!groups[room][teamName]) groups[room][teamName] = [];

            groups[room][teamName].push(c);
        });

        const sortedRooms = Object.keys(groups).sort((a, b) =>
            a.localeCompare(b, undefined, { numeric: true }),
        );

        return { groups, sortedRooms };
    }, [competitors]);

    // --- 2. FETCH GRADED STATUS (On Mount) ---
    useEffect(() => {
        const fetchGradedStatus = async () => {
            const tableName = `${roundType}_round_responses`;
            const { data } = await supabase
                .from(tableName)
                .select("competitor_id");

            if (data) {
                // Create a Set of unique IDs that have at least one response row
                const ids = new Set(data.map((row) => row.competitor_id));
                setGradedIDs(ids);
            }
        };

        fetchGradedStatus();
    }, [roundType]);

    // --- 3. FETCH GRADES (When a student is clicked) ---
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

    // --- 4. HANDLERS ---
    const toggleAnswer = (qNum) => {
        setResponses((prev) => ({ ...prev, [qNum]: !prev[qNum] }));
        setStatus("Unsaved changes!");
    };

    const handleSave = async () => {
        if (!selectedStudent) return;
        setStatus("Saving...");

        const tableName = `${roundType}_round_responses`;

        // 1. Delete old responses to ensure clean slate
        await supabase
            .from(tableName)
            .delete()
            .eq("competitor_id", selectedStudent.id);

        // 2. Generate rows for ALL 20 questions (Default to false if not clicked)
        const rows = Array.from({ length: 20 }, (_, i) => i + 1).map(
            (qNum) => ({
                competitor_id: selectedStudent.id,
                question_number: qNum,
                is_correct: !!responses[qNum], // Forces true/false
            }),
        );

        // 3. Insert new rows
        const { error } = await supabase.from(tableName).insert(rows);

        if (error) {
            setStatus("Save Failed: " + error.message);
            return;
        }

        // 4. Update UI State
        setStatus("Saved successfully!");
        setGradedIDs((prev) => new Set(prev).add(selectedStudent.id)); // Add checkmark immediately
        setSelectedStudent(null);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                {selectedStudent && (
                    <button
                        onClick={() => setSelectedStudent(null)}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
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
                                                ].map((student) => {
                                                    const isGraded =
                                                        gradedIDs.has(
                                                            student.id,
                                                        );
                                                    return (
                                                        <button
                                                            key={student.id}
                                                            onClick={() =>
                                                                setSelectedStudent(
                                                                    student,
                                                                )
                                                            }
                                                            className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-blue-50 hover:shadow-sm hover:text-blue-700 rounded-lg flex justify-between items-center group cursor-pointer"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                {/* GRADED INDICATOR */}
                                                                <div className="w-4 flex justify-center">
                                                                    {isGraded ? (
                                                                        <span className="text-green-600 font-bold text-xs">
                                                                            ✓
                                                                        </span>
                                                                    ) : (
                                                                        <span className="w-2 h-2 rounded-full bg-gray-200"></span>
                                                                    )}
                                                                </div>
                                                                <span>
                                                                    {
                                                                        student.name
                                                                    }
                                                                </span>
                                                            </div>
                                                            <span className="text-gray-500 group-hover:text-blue-600">
                                                                →
                                                            </span>
                                                        </button>
                                                    );
                                                })}
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
                            <p className="text-md text-gray-500 mb-4 font-medium">
                                Select Correct Answers (1&ndash;20)
                            </p>

                            <div className="grid grid-cols-5 sm:grid-cols-10 gap-3 mb-8">
                                {Array.from(
                                    { length: 20 },
                                    (_, i) => i + 1,
                                ).map((num) => (
                                    <button
                                        key={num}
                                        onClick={() => toggleAnswer(num)}
                                        className={`
                                            h-12 w-full rounded-full text-lg font-bold transition-all shadow-sm border cursor-pointer
                                            ${
                                                responses[num]
                                                    ? "bg-green-600 text-white border-green-700 hover:bg-green-700 hover:border-green-800 shadow-green-800"
                                                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-100 hover:border-gray-300"
                                            }
                                        `}
                                    >
                                        {num}
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center justify-end gap-3 border-t border-gray-300 pt-6">
                                <button
                                    onClick={() => setSelectedStudent(null)}
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
