"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function DesignGrading({ teams }) {
    const [selectedTeamId, setSelectedTeamId] = useState("");
    const [distance, setDistance] = useState("");
    const [materials, setMaterials] = useState("");
    const [calculatedScore, setCalculatedScore] = useState(0);
    const [status, setStatus] = useState("");

    // --- CUSTOM SCORING FORMULA ---
    // Adjust this math to match your specific tournament rules
    useEffect(() => {
        const d = parseFloat(distance) || 0;
        const m = parseFloat(materials) || 0;

        // Example Formula: Distance * 2 + (100 - Materials)
        let score = d * 2 + (100 - m);

        // Ensure score doesn't go below zero if materials are too high
        if (score < 0) score = 0;

        setCalculatedScore(score);
    }, [distance, materials]);

    const handleSave = async () => {
        if (!selectedTeamId) return;
        setStatus("Saving...");

        // Upsert: Updates if exists, Inserts if new
        // We match on 'team_id' to ensure one entry per team
        const { error } = await supabase
            .from("design_challenge_entries")
            .upsert(
                {
                    team_id: selectedTeamId,
                    distance_traveled: parseFloat(distance) || 0,
                    materials_cost: parseFloat(materials) || 0,
                    final_score: calculatedScore,
                },
                { onConflict: "team_id" }
            );

        if (error) {
            setStatus("Error: " + error.message);
        } else {
            setStatus("Saved successfully!");
            // Optional: Clear form to grade next team
            // setDistance(""); setMaterials(""); setSelectedTeamId("");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                    Design Challenge Grading
                </h2>
                <span className="text-xs font-mono bg-gray-100 text-gray-500 px-2 py-1 rounded">
                    Table: design_challenge_entries
                </span>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Team
                </label>
                <select
                    value={selectedTeamId}
                    onChange={(e) => {
                        setSelectedTeamId(e.target.value);
                        setStatus("");
                    }}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                >
                    <option value="">-- Choose Team --</option>
                    {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                            {t.name}
                        </option>
                    ))}
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        Distance Traveled (cm)
                    </label>
                    <input
                        type="number"
                        value={distance}
                        onChange={(e) => setDistance(e.target.value)}
                        placeholder="0.00"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        Materials Cost (count)
                    </label>
                    <input
                        type="number"
                        value={materials}
                        onChange={(e) => setMaterials(e.target.value)}
                        placeholder="0"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                    />
                </div>
            </div>

            {/* Live Calculator Preview */}
            <div className="bg-indigo-50 rounded-lg p-4 flex items-center justify-between border border-indigo-100">
                <div>
                    <span className="text-sm font-medium text-indigo-900 block">
                        Calculated Score
                    </span>
                    <span className="text-xs text-indigo-700">
                        Formula: (Dist * 2) + (100 - Mat)
                    </span>
                </div>
                <span className="text-3xl font-bold text-indigo-600">
                    {calculatedScore.toFixed(0)}
                </span>
            </div>

            <div className="flex items-center justify-between pt-2">
                <span
                    className={`text-sm font-medium ${
                        status.includes("Error")
                            ? "text-red-600"
                            : "text-green-600"
                    }`}
                >
                    {status}
                </span>
                <button
                    onClick={handleSave}
                    disabled={!selectedTeamId}
                    className={`
            inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white 
            ${
                selectedTeamId
                    ? "bg-indigo-600 hover:bg-indigo-700"
                    : "bg-gray-300 cursor-not-allowed"
            }
          `}
                >
                    Submit Design Score
                </button>
            </div>
        </div>
    );
}
