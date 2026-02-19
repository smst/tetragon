"use client";
import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useTournamentData } from "@/hooks/useTournamentData";

type CheckInPeriod = "Morning Arrival" | "Post-Lunch" | "Award Ceremony";

export default function AttendancePanel() {
    const { competitors } = useTournamentData();

    const [period, setPeriod] = useState<CheckInPeriod>("Morning Arrival");
    const [status, setStatus] = useState<string>("");
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [presentIds, setPresentIds] = useState<Set<string>>(new Set());

    const toggleAttendance = (id: string) => {
        const newSet = new Set(presentIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setPresentIds(newSet);
    };

    const submitAttendance = async () => {
        setIsSaving(true);
        setStatus("Saving...");

        const {
            data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
            setStatus("Error: Not authenticated.");
            setIsSaving(false);
            return;
        }

        const payload = Array.from(presentIds).map((compId) => ({
            competitor_id: compId,
            recorded_by: session.user.id,
            check_in_period: period,
        }));

        if (payload.length === 0) {
            setStatus("No students selected.");
            setIsSaving(false);
            return;
        }

        const { error } = await supabase
            .from("attendance_logs")
            .insert(payload);

        if (error) {
            setStatus("Error: " + error.message);
        } else {
            setStatus("Attendance logged successfully!");
            setPresentIds(new Set());
        }
        setIsSaving(false);
    };

    return (
        <section className="bg-white shadow-lg border border-gray-300 rounded-2xl p-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Roll Call</h2>
                <select
                    value={period}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        setPeriod(e.target.value as CheckInPeriod)
                    }
                    className="border border-gray-300 rounded-md py-1.5 px-3 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm cursor-pointer"
                >
                    <option value="Morning Arrival">Morning Arrival</option>
                    <option value="Post-Lunch">Post-Lunch</option>
                    <option value="Award Ceremony">Award Ceremony</option>
                </select>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden mb-4 max-h-96 overflow-y-auto">
                <table className="min-w-full">
                    <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Present
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Team
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {competitors.map((c) => (
                            <tr
                                key={c.id}
                                className="hover:bg-gray-50 transition-colors"
                            >
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <input
                                        type="checkbox"
                                        checked={presentIds.has(c.id)}
                                        onChange={() => toggleAttendance(c.id)}
                                        className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                    />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {c.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {c.team?.name || "No Team"}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex items-center justify-between mt-6">
                <span
                    className={`text-sm font-medium ${status.includes("Error") ? "text-red-600" : "text-green-600"}`}
                >
                    {status}
                </span>
                <button
                    onClick={submitAttendance}
                    disabled={isSaving}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-md transition-all active:scale-95 cursor-pointer disabled:bg-blue-400 disabled:cursor-not-allowed"
                >
                    {isSaving ? "Saving..." : "Submit Attendance"}
                </button>
            </div>
        </section>
    );
}
