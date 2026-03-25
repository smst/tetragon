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

export async function GET(request: Request) {
    try {
        await checkAdmin(request);

        const { data: authData, error: authError } =
            await supabaseAdmin.auth.admin.listUsers();
        if (authError) throw authError;

        const { data: roles, error: rolesError } = await supabaseAdmin
            .from("user_roles")
            .select(
                "id, role, morning_room, afternoon_room, checked_in, checked_out",
            );
        if (rolesError) throw rolesError;

        const merged = authData.users.map((u) => {
            const r = roles.find((role) => role.id === u.id);
            return {
                id: u.id,
                email: u.email,
                last_sign_in: u.last_sign_in_at ?? null,
                role: r?.role ?? "unassigned",
                morning_room: r?.morning_room ?? null,
                afternoon_room: r?.afternoon_room ?? null,
                checked_in: r?.checked_in ?? false,
                checked_out: r?.checked_out ?? false,
            };
        });

        return NextResponse.json({ users: merged });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        await checkAdmin(request);
        const { email, resend } = await request.json();

        if (!email) throw new Error("Email is required");

        const requestUrl = new URL(request.url);
        const origin = requestUrl.origin;
        const redirectUrl = `${origin}/auth/confirm?next=/reset-password`;

        if (resend) {
            const { error } = await supabaseAdmin.auth.resetPasswordForEmail(
                email,
                { redirectTo: redirectUrl },
            );

            if (error) throw error;
        } else {
            const { data, error } =
                await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
                    redirectTo: redirectUrl,
                });
            if (error) throw error;
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const adminUser = await checkAdmin(request);
        const body = await request.json();
        const {
            userId,
            newRole,
            morning_room,
            afternoon_room,
            checked_in,
            checked_out,
        } = body;

        if (!userId) throw new Error("userId is required");
        if (adminUser.id === userId)
            throw new Error(
                "Action denied: You cannot modify your own account.",
            );

        let updated = false;

        if (morning_room !== undefined || afternoon_room !== undefined) {
            const { error } = await supabaseAdmin
                .from("user_roles")
                .update({
                    morning_room: morning_room ?? null,
                    afternoon_room: afternoon_room ?? null,
                })
                .eq("id", userId);
            if (error) throw error;
            updated = true;
        }

        if (checked_in !== undefined || checked_out !== undefined) {
            const payload: any = {};
            if (checked_in !== undefined) payload.checked_in = checked_in;
            if (checked_out !== undefined) payload.checked_out = checked_out;

            const { error } = await supabaseAdmin
                .from("user_roles")
                .update(payload)
                .eq("id", userId);
            if (error) throw error;
            updated = true;
        }

        if (newRole !== undefined) {
            const { data, error } = await supabaseAdmin
                .from("user_roles")
                .update({ role: newRole })
                .eq("id", userId)
                .select();

            if (error) throw error;

            if (!data || data.length === 0) {
                const { error: insertError } = await supabaseAdmin
                    .from("user_roles")
                    .insert({ id: userId, role: newRole });

                if (insertError) throw insertError;
            }

            updated = true;
        }

        if (!updated) {
            throw new Error(
                "Nothing to update — provide newRole, room, or attendance fields.",
            );
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

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
