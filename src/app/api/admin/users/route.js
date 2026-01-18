import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Security Helper: Ensure requester is an Admin
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

    // Verify role in database
    const { data: roleData } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (roleData?.role !== "admin")
        throw new Error("Unauthorized: Admins only");

    return true;
}

export async function GET(request) {
    try {
        await checkAdmin(request);

        // 1. Get all users from Auth (Supabase Admin specific)
        const {
            data: { users },
            error: authError,
        } = await supabaseAdmin.auth.admin.listUsers();
        if (authError) throw authError;

        // 2. Get all roles from public table
        const { data: roles, error: roleError } = await supabaseAdmin
            .from("user_roles")
            .select("*");
        if (roleError) throw roleError;

        // 3. Merge data
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

export async function PATCH(request) {
    try {
        await checkAdmin(request);
        const { userId, newRole } = await request.json();

        // Upsert role to user_roles table
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
        await checkAdmin(request);
        const { userId } = await request.json();

        // Delete from Auth system (Cascades to tables usually, but we clean up to be safe)
        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (error) throw error;

        // Clean up role entry
        await supabaseAdmin.from("user_roles").delete().eq("id", userId);

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
