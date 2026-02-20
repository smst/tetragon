"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@/context/UserContext";

type Period = "Morning" | "Afternoon" | "None";
type Role = "admin" | "proctor" | "grader" | "unassigned";

interface ScheduleEvent {
    id: string;
    time: string; // Used for standard events
    title: string;
    baseLocation: string;
    period: Period;
    roles: Role[];
}

const EVENT_SCHEDULE: ScheduleEvent[] = [
    {
        id: "registration",
        time: "8:30 AM - 9:00 AM",
        title: "Registration",
        baseLocation: "Foyer",
        period: "None",
        roles: ["admin", "proctor", "grader", "unassigned"],
    },
    {
        id: "opening",
        time: "9:00 AM - 9:30 AM",
        title: "Opening Ceremony",
        baseLocation: "Auditorium",
        period: "None",
        roles: ["admin", "proctor", "grader", "unassigned"],
    },
    {
        id: "setup",
        time: "9:40 AM - 9:45 AM",
        title: "Instructions and Setup",
        baseLocation: "Assigned Room",
        period: "Morning",
        roles: ["admin", "proctor"],
    },
    {
        id: "math",
        time: "9:50 AM - 10:35 AM",
        title: "Individual Math Round",
        baseLocation: "Assigned Room",
        period: "Morning",
        roles: ["admin", "proctor"],
    },
    {
        id: "snack",
        time: "10:35 AM - 10:45 AM",
        title: "Snack",
        baseLocation: "Assigned Room",
        period: "Morning",
        roles: ["admin", "proctor"],
    },
    {
        id: "grading",
        time: "10:35 AM - 2:00 PM",
        title: "Grading Operations",
        baseLocation: "Grading Room",
        period: "None",
        roles: ["admin", "grader"],
    },
    {
        id: "science",
        time: "10:45 AM - 11:30 AM",
        title: "Individual Science Round",
        baseLocation: "Assigned Room",
        period: "Morning",
        roles: ["admin", "proctor"],
    },
    {
        id: "lunch_labs_split", // Special ID to trigger dynamic rendering
        time: "11:30 AM - 12:15 PM",
        title: "Lunch / Labs",
        baseLocation: "Cafeteria / Hallways",
        period: "None",
        roles: ["admin", "proctor", "grader", "unassigned"],
    },
    {
        id: "design",
        time: "12:15 PM - 1:15 PM",
        title: "Design Challenge",
        baseLocation: "Assigned Room",
        period: "Afternoon",
        roles: ["admin", "proctor"],
    },
    {
        id: "team",
        time: "1:20 PM - 2:05 PM",
        title: "Team Round",
        baseLocation: "Assigned Room",
        period: "Afternoon",
        roles: ["admin", "proctor"],
    },
    {
        id: "lightning",
        time: "2:15 PM - 3:00 PM",
        title: "Lightning Round",
        baseLocation: "Auditorium",
        period: "None",
        roles: ["admin", "proctor", "grader", "unassigned"],
    },
    {
        id: "awards",
        time: "3:00 PM - 3:45 PM",
        title: "Awards",
        baseLocation: "Auditorium",
        period: "None",
        roles: ["admin", "proctor", "grader", "unassigned"],
    },
];

// Placeholder logic: Determine which rotation group a room falls into.
function isLunchFirstGroup(room: number | null): boolean {
    if (!room) return true;
    // Example: Even numbered rooms eat lunch first
    return room % 2 === 0;
}

export default function SchedulePanel() {
    const { userRole } = useUser();
    const [morningRoom, setMorningRoom] = useState<number | null>(null);
    const [afternoonRoom, setAfternoonRoom] = useState<number | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchRooms = async () => {
            const {
                data: { session },
            } = await supabase.auth.getSession();
            if (!session) return;

            if (userRole === "proctor") {
                const { data } = await supabase
                    .from("user_roles")
                    .select("morning_room, afternoon_room")
                    .eq("id", session.user.id)
                    .single();

                if (data) {
                    setMorningRoom(data.morning_room);
                    setAfternoonRoom(data.afternoon_room);
                }
            }
            setLoading(false);
        };
        fetchRooms();
    }, [userRole]);

    const getLocationText = (event: ScheduleEvent) => {
        if (userRole !== "proctor" || event.period === "None") {
            return event.baseLocation;
        }

        if (event.period === "Morning") {
            return morningRoom ? `Room ${morningRoom}` : "Unassigned (AM)";
        }

        if (event.period === "Afternoon") {
            return afternoonRoom ? `Room ${afternoonRoom}` : "Unassigned (PM)";
        }

        return event.baseLocation;
    };

    const visibleSchedule = EVENT_SCHEDULE.filter((event) =>
        event.roles.includes(userRole as Role),
    );

    const renderEventCard = (
        key: string,
        time: string,
        title: string,
        locationText: string,
        isWarningLocation: boolean,
    ) => {
        // Split time string for stacked display (e.g., "9:50 AM" and "10:35 AM")
        const timeParts = time.split(" - ");

        return (
            <div
                key={key}
                className="flex gap-4 py-3 px-4 border-b border-gray-200 hover:bg-gray-50 transition-colors last:border-0"
            >
                {/* Time Column (Stacked) */}
                <div className="w-14 shrink-0 flex flex-col justify-center text-right mr-2">
                    <span className="text-xs font-bold text-gray-500">
                        {timeParts[0]}
                    </span>
                    {timeParts[1] && (
                        <span className="text-xs font-medium text-gray-500">
                            {timeParts[1]}
                        </span>
                    )}
                </div>
                {/* Content Column */}
                <div className="flex-1 flex flex-col justify-center py-1">
                    <h3 className="text-sm font-semibold text-gray-800 leading-tight">
                        {title}
                    </h3>
                    <p
                        className={`text-xs mt-1 font-medium ${
                            isWarningLocation
                                ? "text-amber-600"
                                : "text-gray-500"
                        }`}
                    >
                        {locationText}
                    </p>
                </div>
            </div>
        );
    };

    return (
        <section className="bg-white shadow-lg border border-gray-300 rounded-2xl p-6 sm:p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Schedule</h2>

            {loading ? (
                <div className="animate-pulse flex flex-col space-y-4 xl:max-w-2xl">
                    <div className="h-12 bg-gray-100 rounded-lg w-full"></div>
                    <div className="h-12 bg-gray-100 rounded-lg w-full"></div>
                    <div className="h-12 bg-gray-100 rounded-lg w-full"></div>
                </div>
            ) : (
                <div className="xl:max-w-2xl border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
                    {visibleSchedule.map((task) => {
                        const isWarning =
                            userRole === "proctor" &&
                            task.period !== "None" &&
                            !morningRoom &&
                            !afternoonRoom;

                        // Dynamic injection for the Lunch/Labs split
                        if (task.id === "lunch_labs_split") {
                            // Admins and Graders see the unified block
                            if (userRole !== "proctor") {
                                return renderEventCard(
                                    task.id,
                                    task.time,
                                    task.title,
                                    task.baseLocation,
                                    false,
                                );
                            }

                            // Proctors get the dynamic split based on their morning room
                            const lunchFirst = isLunchFirstGroup(morningRoom);

                            // Placeholder times, await clarification
                            const block1Time = "11:30 AM - 11:50 AM";
                            const block2Time = "11:55 AM - 12:15 PM";

                            return (
                                <React.Fragment key={task.id}>
                                    {renderEventCard(
                                        `${task.id}-block1`,
                                        block1Time,
                                        lunchFirst ? "Lunch" : "Labs",
                                        lunchFirst ? "Cafeteria" : "Hallways",
                                        false,
                                    )}
                                    {renderEventCard(
                                        `${task.id}-block2`,
                                        block2Time,
                                        lunchFirst ? "Labs Rotation" : "Lunch",
                                        lunchFirst ? "Hallways" : "Cafeteria",
                                        false,
                                    )}
                                </React.Fragment>
                            );
                        }

                        // Standard event render
                        return renderEventCard(
                            task.id,
                            task.time,
                            task.title,
                            getLocationText(task),
                            isWarning,
                        );
                    })}
                </div>
            )}
        </section>
    );
}
