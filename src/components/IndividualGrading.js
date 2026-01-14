"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function IndividualGrading({ competitors, roundType, title }) {
    // --- STATE ---
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [responses, setResponses] = useState({});
    const [status, setStatus] = useState("");
    const [loadingData, setLoadingData] = useState(false);

    // Filter competitors based on search
    const filteredCompetitors =
        searchTerm === ""
            ? []
            : competitors
                  .filter((c) =>
                      c.name.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .slice(0, 5); // Limit to top 5 results to keep UI clean

    // --- 1. FETCH SAVED DATA ON SELECTION ---
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
                // Convert array [{question_number: 1, is_correct: true}] -> Object {1: true}
                const loadedResponses = {};
                data.forEach((row) => {
                    loadedResponses[row.question_number] = row.is_correct;
                });
                setResponses(loadedResponses);
                setStatus("Loaded saved grades.");
            } else {
                setResponses({}); // Reset if new student
                setStatus("No previous grades found.");
            }
            setLoadingData(false);
        };

        loadSavedGrades();
    }, [selectedStudent, roundType]);

    // --- 2. HANDLERS ---
    const handleSelect = (student) => {
        setSelectedStudent(student);
        setSearchTerm(""); // Clear search
    };

    const toggleAnswer = (qNum) => {
        setResponses((prev) => ({ ...prev, [qNum]: !prev[qNum] }));
        setStatus("Unsaved changes!");
    };

    const handleSave = async () => {
        if (!selectedStudent) return;
        setStatus("Saving...");

        const tableName = `${roundType}_round_responses`;

        // A. Delete old (Clean slate approach is safest for consistency)
        await supabase
            .from(tableName)
            .delete()
            .eq("competitor_id", selectedStudent.id);

        // B. Prepare new rows
        const rows = Object.keys(responses).map((qNum) => ({
            competitor_id: selectedStudent.id,
            question_number: parseInt(qNum),
            is_correct: responses[qNum],
        }));

        // C. Insert
        if (rows.length > 0) {
            const { error } = await supabase.from(tableName).insert(rows);
            if (error) {
                setStatus("Save Failed: " + error.message);
                return;
            }
        }
        setStatus("Saved successfully!");
    };

    return (
        <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>

            {/* --- SEARCH BAR --- */}
            <div className="relative">
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Search for competitor"
                        value={
                            selectedStudent ? selectedStudent.name : searchTerm
                        }
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setSelectedStudent(null); // Clear selection if typing new name
                            setResponses({});
                            setStatus("");
                        }}
                        className="block w-full rounded-xl border-gray-300 sm:text-md border px-4 py-2"
                    />
                    {selectedStudent && (
                        <button
                            onClick={() => {
                                setSelectedStudent(null);
                                setSearchTerm("");
                                setResponses({});
                                setStatus("");
                            }}
                            className="px-5 py-2 bg-gray-200 text-gray-800 rounded-xl font-medium text-md hover:bg-gray-300 cursor-pointer"
                        >
                            Clear
                        </button>
                    )}
                </div>

                {/* Search Results Dropdown (Only shows when typing) */}
                {searchTerm && !selectedStudent && (
                    <div className="absolute z-10 w-full bg-white mt-1 border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-auto">
                        {filteredCompetitors.length > 0 ? (
                            filteredCompetitors.map((c) => (
                                <button
                                    key={c.id}
                                    onClick={() => handleSelect(c)}
                                    className="w-full text-left px-4 py-2 text-md font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 cursor-pointer"
                                >
                                    {c.name}
                                </button>
                            ))
                        ) : (
                            <div className="px-4 py-2 text-md text-gray-500">
                                No matching student found.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* --- GRADING INTERFACE --- */}
            {selectedStudent && (
                <div>
                    <div
                        className={`px-5 py-3 rounded-xl mb-4 text-md font-medium flex justify-between items-center ${
                            loadingData
                                ? "bg-yellow-50 text-yellow-800"
                                : "bg-blue-50 text-blue-800"
                        }`}
                    >
                        <span>
                            Now Grading: <strong>{selectedStudent.name}</strong>
                        </span>
                        <span className="text-sm">{status}</span>
                    </div>

                    {loadingData ? (
                        <div className="text-center py-8 text-gray-400">
                            Loading saved grades...
                        </div>
                    ) : (
                        <>
                            <p className="text-md text-gray-500 mb-2">
                                Mark correct answers (Questions 1&ndash;20)
                            </p>
                            <div className="grid grid-cols-5 sm:grid-cols-10 gap-3 mb-6">
                                {Array.from(
                                    { length: 20 },
                                    (_, i) => i + 1
                                ).map((num) => (
                                    <button
                                        key={num}
                                        onClick={() => toggleAnswer(num)}
                                        className={`
                      h-10 w-full rounded-xl text-lg font-semibold transition-all cursor-pointer
                      ${
                          responses[num]
                              ? "bg-green-600 text-white hover:bg-green-700"
                              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }
                    `}
                                    >
                                        {num}
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center justify-end border-t border-gray-100 pt-4">
                                <button
                                    onClick={handleSave}
                                    className="inline-flex justify-center py-2 px-6 text-md font-medium rounded-xl cursor-pointer text-white bg-blue-600 hover:bg-blue-700"
                                >
                                    Save Grades
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
