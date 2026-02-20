import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// ── Time window config (US/Eastern) ──────────────────────────────────────────
// Adjust these if tournament times change.

const TIMEZONE = "America/New_York";

const TIME_WINDOWS = {
    Morning: { openHour: 9, openMin: 0, closeHour: 9, closeMin: 30 },
    Afternoon: { openHour: 12, openMin: 15, closeHour: 22, closeMin: 0 },
} as const;

type Period = keyof typeof TIME_WINDOWS;

function getNowInEastern(): { hour: number; minute: number } {
    const now = new Date();
    // toLocaleTimeString with a fixed timezone gives us the wall-clock time
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: TIMEZONE,
        hour: "numeric",
        minute: "numeric",
        hour12: false,
    }).formatToParts(now);

    const hour = parseInt(parts.find((p) => p.type === "hour")!.value, 10);
    const minute = parseInt(parts.find((p) => p.type === "minute")!.value, 10);
    return { hour, minute };
}

function toMinutes(hour: number, minute: number): number {
    return hour * 60 + minute;
}

function getWindowStatus(period: Period): "before" | "open" | "closed" {
    const { hour, minute } = getNowInEastern();
    const now = toMinutes(hour, minute);
    const win = TIME_WINDOWS[period];
    const open = toMinutes(win.openHour, win.openMin);
    const close = toMinutes(win.closeHour, win.closeMin);

    if (now < open) return "before";
    if (now > close) return "closed";
    return "open";
}

// ── Auth helper ───────────────────────────────────────────────────────────────

async function getProctor(request: Request) {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL as string,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    );

    const token = request.headers.get("Authorization")?.split(" ")[1];
    if (!token) throw new Error("Missing token");

    const {
        data: { user },
        error,
    } = await supabase.auth.getUser(token);
    if (error || !user) throw new Error("Invalid token");

    const { data: roleData } = await supabaseAdmin
        .from("user_roles")
        .select("role, morning_room, afternoon_room")
        .eq("id", user.id)
        .single();

    if (!roleData || !["proctor", "admin"].includes(roleData.role)) {
        throw new Error("Unauthorized");
    }

    return { user, roleData };
}

// ── POST /api/attendance ──────────────────────────────────────────────────────

export async function POST(request: Request) {
    try {
        const { user, roleData } = await getProctor(request);
        const body = await request.json();

        const period: Period = body.period;
        const competitorIds: string[] = body.competitor_ids;

        if (!period || !["Morning", "Afternoon"].includes(period)) {
            return NextResponse.json(
                { error: "Invalid period" },
                { status: 400 },
            );
        }

        // ── Time window enforcement ───────────────────────────────────────────
        const windowStatus = getWindowStatus(period);
        const hasExisting = body.has_existing as boolean;

        // Block if window hasn't opened yet
        if (windowStatus === "before") {
            const win = TIME_WINDOWS[period];
            return NextResponse.json(
                {
                    error: `${period} attendance window has not opened yet (opens ${win.openHour}:${String(win.openMin).padStart(2, "0")} ET)`,
                },
                { status: 403 },
            );
        }

        // Block if window is closed AND they already submitted (no edits after close)
        if (windowStatus === "closed" && hasExisting) {
            return NextResponse.json(
                {
                    error: `${period} attendance window is closed and attendance was already submitted`,
                },
                { status: 403 },
            );
        }
        // If closed but never submitted (hasExisting = false), allow late submission

        // ── Room validation ───────────────────────────────────────────────────
        const assignedRoom =
            period === "Morning"
                ? roleData.morning_room
                : roleData.afternoon_room;

        if (!assignedRoom) {
            return NextResponse.json(
                { error: `You have no ${period.toLowerCase()} room assigned` },
                { status: 403 },
            );
        }

        // ── Overwrite: delete existing logs for this proctor + period + today ─
        await supabaseAdmin
            .from("attendance_logs")
            .delete()
            .eq("recorded_by", user.id)
            .eq("check_in_period", period);

        // ── Insert new logs ───────────────────────────────────────────────────
        if (competitorIds.length > 0) {
            const rows = competitorIds.map((id) => ({
                competitor_id: id,
                recorded_by: user.id,
                check_in_period: period,
            }));

            const { error } = await supabaseAdmin
                .from("attendance_logs")
                .insert(rows);

            if (error) throw new Error("Insert failed: " + error.message);
        }

        return NextResponse.json({
            message: "Attendance saved",
            count: competitorIds.length,
        });
    } catch (err: any) {
        console.error("Attendance API error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
