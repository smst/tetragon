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

        const body = await request.json();

        if (body.teamId !== undefined && body.paid !== undefined) {
            const { error: updateError } = await supabaseAdmin
                .from("teams")
                .update({ paid: body.paid })
                .eq("id", body.teamId);

            if (updateError) throw updateError;
        } else if (
            body.competitorIds !== undefined &&
            body.checked_in !== undefined
        ) {
            if (
                !Array.isArray(body.competitorIds) ||
                body.competitorIds.length === 0
            ) {
                throw new Error("No competitors provided.");
            }

            const { error: updateError } = await supabaseAdmin
                .from("competitors")
                .update({ checked_in: body.checked_in })
                .in("id", body.competitorIds);

            if (updateError) throw updateError;
        } else {
            throw new Error("Invalid payload.");
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
