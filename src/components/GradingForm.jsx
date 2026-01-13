"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function GradingForm({ competitors }) {
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [responses, setResponses] = useState({});
    const [status, setStatus] = useState("");

    // SAFEGUARD: If competitors didn't load yet, don't crash
    if (!competitors) return <div>Loading students...</div>;

    const handleStudentChange = (e) => {
        const studentId = e.target.value;
        if (!studentId) {
            setSelectedStudent(null);
            return;
        }
        // Find the student safely
        const student = competitors.find((c) => c.id === studentId);
        setSelectedStudent(student);
        setResponses({});
        setStatus("");
    };

    const toggleAnswer = (qNum) => {
        setResponses((prev) => ({ ...prev, [qNum]: !prev[qNum] }));
    };

    const handleSave = async () => {
        if (!selectedStudent) return; // Prevent saving if no student selected

        setStatus("Saving...");

        // 1. Delete old responses
        const { error: deleteError } = await supabase
            .from("responses")
            .delete()
            .eq("competitor_id", selectedStudent.id);

        if (deleteError) {
            setStatus("Delete Error: " + deleteError.message);
            return;
        }

        // 2. Prepare new rows
        const rowsToInsert = Object.keys(responses).map((qNum) => ({
            competitor_id: selectedStudent.id,
            question_number: parseInt(qNum),
            is_correct: responses[qNum],
        }));

        // 3. Insert if there are answers
        if (rowsToInsert.length > 0) {
            const { error } = await supabase
                .from("responses")
                .insert(rowsToInsert);
            if (error) {
                setStatus("Error: " + error.message);
                return;
            }
        }

        setStatus("Saved successfully!");
    };

    return (
        <div className="bg-white shadow sm:rounded-lg p-6 mb-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Volunteer Grading Station
            </h3>

            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700">
                    Select Competitor
                </label>
                {/* FIX: Added value control with safe fallback to empty string */}
                <select
                    onChange={handleStudentChange}
                    value={selectedStudent?.id || ""}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
                >
                    <option value="">-- Choose a Student --</option>
                    {competitors.map(
                        (c) =>
                            // FIX: Ensure 'c' exists before accessing 'c.id'
                            c && (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            )
                    )}
                </select>
            </div>

            {selectedStudent && (
                <div className="space-y-6">
                    <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                        <h4 className="text-sm font-bold text-blue-900">
                            Grading: {selectedStudent.name}
                        </h4>
                        <p className="text-xs text-blue-700">
                            Click buttons for CORRECT answers only.
                        </p>
                    </div>

                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                        {Array.from({ length: 20 }, (_, i) => i + 1).map(
                            (num) => (
                                <button
                                    key={num}
                                    onClick={() => toggleAnswer(num)}
                                    className={`
                  h-10 w-full rounded-md text-sm font-medium transition-colors duration-200 border
                  ${
                      responses[num]
                          ? "bg-green-600 text-white border-green-700 hover:bg-green-700"
                          : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                  }
                `}
                                >
                                    Q{num}
                                </button>
                            )
                        )}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                        <span className="text-sm text-gray-500">{status}</span>
                        <button
                            onClick={handleSave}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Submit Grade
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
