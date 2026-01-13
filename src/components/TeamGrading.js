"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function TeamGrading({ teams }) {
    const [selectedTeamId, setSelectedTeamId] = useState("");
    const [responses, setResponses] = useState({});
    const [status, setStatus] = useState("");

    const handleSelect = (e) => {
        setSelectedTeamId(e.target.value);
        setResponses({});
        setStatus("");
    };

    const toggleAnswer = (qNum) => {
        setResponses((prev) => ({ ...prev, [qNum]: !prev[qNum] }));
    };

    const handleSave = async () => {
        if (!selectedTeamId) return;
        setStatus("Saving...");

        // 1. Delete old
        const { error: deleteError } = await supabase
            .from("team_round_responses")
            .delete()
            .eq("team_id", selectedTeamId);

        if (deleteError) {
            setStatus("Error: " + deleteError.message);
            return;
        }

        // 2. Insert new
        const rows = Object.keys(responses).map((qNum) => ({
            team_id: selectedTeamId,
            question_number: parseInt(qNum),
            is_correct: responses[qNum],
        }));

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

            <select
                value={selectedTeamId}
                onChange={handleSelect}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
            >
                <option value="">-- Choose Team --</option>
                {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                        {t.name}
                    </option>
                ))}
            </select>

            {selectedTeamId && (
                <div className="mt-4">
                    <p className="text-sm text-gray-500 mb-2">
                        Mark correct answers (Questions 1-10)
                    </p>
                    <div className="grid grid-cols-5 gap-3 mb-6">
                        {Array.from({ length: 10 }, (_, i) => i + 1).map(
                            (num) => (
                                <button
                                    key={num}
                                    onClick={() => toggleAnswer(num)}
                                    className={`
                  h-12 w-full rounded-md text-base font-bold transition-all shadow-sm border
                  ${
                      responses[num]
                          ? "bg-blue-600 text-white border-blue-700"
                          : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                  }
                `}
                                >
                                    Q{num}
                                </button>
                            )
                        )}
                    </div>
                    <button
                        onClick={handleSave}
                        className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                        Submit Team Round
                    </button>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        {status}
                    </p>
                </div>
            )}
        </div>
    );
}
