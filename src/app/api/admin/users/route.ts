import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

async function checkAdmin(request: Request) {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL as string,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
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

export async function GET(request: Request) {
    try {
        await checkAdmin(request);
        const { data: users, error } =
            await supabaseAdmin.auth.admin.listUsers();
        if (error) throw error;

        const { data: roles, error: rolesError } = await supabaseAdmin
            .from("user_roles")
            .select("*");
        if (rolesError) throw rolesError;

        const merged = users.users.map((u) => {
            const r = roles.find((role) => role.id === u.id);
            return {
                id: u.id,
                email: u.email,
                role: r?.role || "unassigned",
            };
        });

        return NextResponse.json({ users: merged });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const adminUser = await checkAdmin(request);
        const { userId, newRole } = await request.json();

        if (adminUser.id === userId) {
            throw new Error("Action denied: You cannot modify your own role.");
        }

        const { error } = await supabaseAdmin
            .from("user_roles")
            .upsert({ id: userId, role: newRole });

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const adminUser = await checkAdmin(request);
        const { userId } = await request.json();

        if (adminUser.id === userId) {
            throw new Error(
                "Action denied: You cannot delete your own account.",
            );
        }

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
