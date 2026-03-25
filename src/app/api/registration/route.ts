import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function PATCH(request: Request) {
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL as string,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
        );

        const token = request.headers.get("Authorization")?.split(" ")[1];
        if (!token) throw new Error("Missing token");

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser(token);
        if (authError || !user) throw new Error("Invalid token");

        const { data: roleData, error: roleError } = await supabaseAdmin
            .from("user_roles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (
            roleError ||
            !roleData ||
            !["admin", "grader"].includes(roleData.role)
        ) {
            throw new Error(
                "Unauthorized: Registration desk is for admins and graders only.",
            );
        }

        const { competitorIds, checked_in } = await request.json();

        if (!Array.isArray(competitorIds) || competitorIds.length === 0) {
            throw new Error("No competitors provided.");
        }

        const { error: updateError } = await supabaseAdmin
            .from("competitors")
            .update({ checked_in })
            .in("id", competitorIds);

        if (updateError) throw updateError;

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
