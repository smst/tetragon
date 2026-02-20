import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

async function checkAdmin(request: Request) {
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
        .select("role")
        .eq("id", user.id)
        .single();

    if (roleData?.role !== "admin")
        throw new Error("Unauthorized: Admins only");

    return user;
}

// ── GET: list all users with roles, rooms, and last sign-in ──────────────────

export async function GET(request: Request) {
    try {
        await checkAdmin(request);

        const { data: authData, error: authError } =
            await supabaseAdmin.auth.admin.listUsers();
        if (authError) throw authError;

        const { data: roles, error: rolesError } = await supabaseAdmin
            .from("user_roles")
            .select("id, role, morning_room, afternoon_room");
        if (rolesError) throw rolesError;

        const merged = authData.users.map((u) => {
            const r = roles.find((role) => role.id === u.id);
            return {
                id: u.id,
                email: u.email,
                // last_sign_in_at comes from auth.users via admin API
                last_sign_in: u.last_sign_in_at ?? null,
                role: r?.role ?? "unassigned",
                morning_room: r?.morning_room ?? null,
                afternoon_room: r?.afternoon_room ?? null,
            };
        });

        return NextResponse.json({ users: merged });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// ── POST: invite new user or resend invite ───────────────────────────────────

export async function POST(request: Request) {
    try {
        await checkAdmin(request);
        const { email, resend } = await request.json();

        if (!email) throw new Error("Email is required");

        // Dynamically grab the origin URL from the request to guarantee a valid redirect path
        const requestUrl = new URL(request.url);
        const origin = requestUrl.origin;
        const redirectUrl = `${origin}/auth/confirm?next=/reset-password`;

        if (resend) {
            // resetPasswordForEmail actively dispatches a recovery email.
            const { error } = await supabaseAdmin.auth.resetPasswordForEmail(
                email,
                { redirectTo: redirectUrl },
            );

            if (error) throw error;
        } else {
            // Invite new user — creates auth record + sends email
            const { data, error } =
                await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
                    redirectTo: redirectUrl,
                });
            if (error) throw error;

            // Seed user_roles row so they appear in the panel immediately
            await supabaseAdmin
                .from("user_roles")
                .upsert({ id: data.user.id, role: "unassigned" });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// ── PATCH: update role OR room assignments ───────────────────────────────────

export async function PATCH(request: Request) {
    try {
        const adminUser = await checkAdmin(request);
        const body = await request.json();
        const { userId } = body;

        if (!userId) throw new Error("userId is required");
        if (adminUser.id === userId)
            throw new Error(
                "Action denied: You cannot modify your own account.",
            );

        // Room assignment update — use update, not upsert, to avoid nulling other columns
        if (
            body.morning_room !== undefined ||
            body.afternoon_room !== undefined
        ) {
            const { error } = await supabaseAdmin
                .from("user_roles")
                .update({
                    morning_room: body.morning_room ?? null,
                    afternoon_room: body.afternoon_room ?? null,
                })
                .eq("id", userId);
            if (error) throw error;
            return NextResponse.json({ success: true });
        }

        // Role update — use update, not upsert, to avoid nulling room assignments
        if (body.newRole !== undefined) {
            const { error } = await supabaseAdmin
                .from("user_roles")
                .update({ role: body.newRole })
                .eq("id", userId);
            if (error) throw error;
            return NextResponse.json({ success: true });
        }

        throw new Error("Nothing to update — provide newRole or room fields.");
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// ── DELETE: remove user from auth + user_roles ───────────────────────────────

export async function DELETE(request: Request) {
    try {
        const adminUser = await checkAdmin(request);
        const { userId } = await request.json();

        if (!userId) throw new Error("userId is required");
        if (adminUser.id === userId)
            throw new Error(
                "Action denied: You cannot delete your own account.",
            );

        const { error: roleError } = await supabaseAdmin
            .from("user_roles")
            .delete()
            .eq("id", userId);
        if (roleError) throw roleError;

        const { error: authError } =
            await supabaseAdmin.auth.admin.deleteUser(userId);
        if (authError) throw authError;

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
