"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ProctorSchedule } from "@/types";

export default function SchedulePanel() {
    const [schedule, setSchedule] = useState<ProctorSchedule[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchSchedule = async () => {
            const {
                data: { session },
            } = await supabase.auth.getSession();
            if (!session) return;

            const { data, error } = await supabase
                .from("proctor_schedules")
                .select("*")
                .eq("user_id", session.user.id)
                .order("start_time", { ascending: true });

            if (data) setSchedule(data as ProctorSchedule[]);
            setLoading(false);
        };
        fetchSchedule();
    }, []);

    return (
        <section className="bg-white shadow-lg border border-gray-300 rounded-2xl p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Schedule</h2>

            {loading ? (
                <div className="animate-pulse flex space-x-4">
                    <div className="flex-1 space-y-4 py-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                </div>
            ) : schedule.length === 0 ? (
                <p className="text-gray-500 italic">
                    No tasks assigned yet. Check with admin.
                </p>
            ) : (
                <div className="space-y-4">
                    {schedule.map((task) => (
                        <div
                            key={task.id}
                            className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-xl hover:bg-blue-50 transition-colors"
                        >
                            <div>
                                <h3 className="text-md font-bold text-gray-900">
                                    {task.task_description}
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    Location: {task.location || "TBD"}
                                </p>
                            </div>
                            <div className="text-right mt-2 sm:mt-0">
                                <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2.5 py-1 rounded-full font-semibold border border-blue-200">
                                    {new Date(
                                        task.start_time,
                                    ).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}{" "}
                                    -
                                    {new Date(task.end_time).toLocaleTimeString(
                                        [],
                                        { hour: "2-digit", minute: "2-digit" },
                                    )}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
