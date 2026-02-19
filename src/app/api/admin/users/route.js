import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Ensures that the request comes from an authenticated user. Returns the user.
async function checkAdmin(request) {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );

    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.split(" ")[1];

    if (!token) throw new Error("Missing Token");

    const {
        data: { user },
        error,
    } = await supabase.auth.getUser(token);
    if (error || !user) throw new Error("Invalid Token");

    const { data: roleData } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (roleData?.role !== "admin")
        throw new Error("Unauthorized: Admins only");

    return user;
}

export async function GET(request) {
    try {
        await checkAdmin(request);

        const {
            data: { users },
            error: authError,
        } = await supabaseAdmin.auth.admin.listUsers();
        if (authError) throw authError;

        const { data: roles, error: roleError } = await supabaseAdmin
            .from("user_roles")
            .select("*");
        if (roleError) throw roleError;

        const combined = users.map((u) => {
            const roleEntry = roles.find((r) => r.id === u.id);
            return {
                id: u.id,
                email: u.email,
                role: roleEntry ? roleEntry.role : "unassigned",
                last_sign_in: u.last_sign_in_at,
            };
        });

        return NextResponse.json({ users: combined });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 401 });
    }
}

export async function POST(request) {
    try {
        await checkAdmin(request);
        const { email } = await request.json();

        if (!email) throw new Error("Email is required");

        // 1. Send the standard Supabase Invite Email
        const {
            data: { user },
            error: inviteError,
        } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            redirectTo: `${request.headers.get("origin")}/auth/confirm?next=/reset-password`,
        });

        if (inviteError) throw inviteError;

        // 2. Assign 'proctor' role immediately
        // We use upsert in case the user already existed but had no role
        const { error: roleError } = await supabaseAdmin
            .from("user_roles")
            .upsert({ id: user.id, role: "proctor" });

        if (roleError) throw roleError;

        return NextResponse.json({ success: true, user });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PATCH(request) {
    try {
        const adminUser = await checkAdmin(request);
        const { userId, newRole } = await request.json();

        // Prevent self-modification.
        if (adminUser.id === userId) {
            throw new Error("You cannot modify your own role.");
        }

        const { error } = await supabaseAdmin
            .from("user_roles")
            .upsert({ id: userId, role: newRole });

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const adminUser = await checkAdmin(request);
        const { userId } = await request.json();

        // Prevent self-deletion.
        if (adminUser.id === userId) {
            throw new Error("You cannot delete your own account.");
        }

        // Delete entry from user_roles.
        const { error: roleError } = await supabaseAdmin
            .from("user_roles")
            .delete()
            .eq("id", userId);

        if (roleError) throw roleError;

        // Delete user from auth.user.
        const { error: authError } =
            await supabaseAdmin.auth.admin.deleteUser(userId);
        if (authError) throw authError;

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
