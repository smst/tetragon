"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function IndividualGrading({ competitors, roundType, title }) {
    // roundType should be 'math' or 'science'
    const [selectedId, setSelectedId] = useState("");
    const [responses, setResponses] = useState({});
    const [status, setStatus] = useState("");

    const handleSelect = (e) => {
        setSelectedId(e.target.value);
        setResponses({});
        setStatus("");
    };

    const toggleAnswer = (qNum) => {
        setResponses((prev) => ({ ...prev, [qNum]: !prev[qNum] }));
    };

    const handleSave = async () => {
        if (!selectedId) return;
        setStatus("Saving...");

        // 1. Construct table name dynamically based on schema
        // schema: math_round_responses OR science_round_responses
        const tableName = `${roundType}_round_responses`;

        // 2. Delete old responses
        const { error: deleteError } = await supabase
            .from(tableName)
            .delete()
            .eq("competitor_id", selectedId);

        if (deleteError) {
            setStatus("Delete Failed: " + deleteError.message);
            return;
        }

        // 3. Insert new responses
        const rows = Object.keys(responses).map((qNum) => ({
            competitor_id: selectedId,
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
    };

    const selectedStudent = competitors.find((c) => c.id === selectedId);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                <span className="text-xs font-mono bg-gray-100 text-gray-500 px-2 py-1 rounded">
                    Table: {roundType}_round_responses
                </span>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Competitor
                </label>
                <select
                    value={selectedId}
                    onChange={handleSelect}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                >
                    <option value="">-- Choose Student --</option>
                    {competitors.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.name}
                        </option>
                    ))}
                </select>
            </div>

            {selectedStudent && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="bg-indigo-50 border border-indigo-100 rounded-md p-4 mb-4">
                        <p className="text-sm text-indigo-800 font-medium">
                            Grading: {selectedStudent.name}
                        </p>
                    </div>

                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 mb-6">
                        {/* Generate 20 Questions */}
                        {Array.from({ length: 20 }, (_, i) => i + 1).map(
                            (num) => (
                                <button
                                    key={num}
                                    onClick={() => toggleAnswer(num)}
                                    className={`
                  h-10 w-full rounded text-sm font-semibold transition-all shadow-sm border
                  ${
                      responses[num]
                          ? "bg-green-600 text-white border-green-700 hover:bg-green-700 ring-2 ring-green-300"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }
                `}
                                >
                                    {num}
                                </button>
                            )
                        )}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <span
                            className={`text-sm font-medium ${
                                status.includes("Failed")
                                    ? "text-red-600"
                                    : "text-green-600"
                            }`}
                        >
                            {status}
                        </span>
                        <button
                            onClick={handleSave}
                            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Submit Grade
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
