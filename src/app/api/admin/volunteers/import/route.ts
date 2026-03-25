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

export async function POST(request: Request) {
    try {
        await checkAdmin(request);
        const { volunteers } = await request.json();

        const requestUrl = new URL(request.url);
        const redirectUrl = `${requestUrl.origin}/auth/confirm?next=/reset-password`;

        let importedCount = 0;
        const errors: string[] = [];

        const { data: listData, error: listError } =
            await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
        if (listError) throw listError;
        const existingUsers = listData.users;

        for (const vol of volunteers) {
            try {
                let userId = existingUsers.find(
                    (u) => u.email === vol.email,
                )?.id;

                if (!userId) {
                    const { data, error } =
                        await supabaseAdmin.auth.admin.inviteUserByEmail(
                            vol.email,
                            {
                                redirectTo: redirectUrl,
                            },
                        );
                    if (error) throw error;
                    if (!data.user) throw new Error("Failed to create user");
                    userId = data.user.id;
                }

                const amRoom = vol.morningRoom
                    ? parseInt(vol.morningRoom.replace(/\D/g, ""), 10) || null
                    : null;
                const pmRoom = vol.afternoonRoom
                    ? parseInt(vol.afternoonRoom.replace(/\D/g, ""), 10) || null
                    : null;

                const { error: roleError } = await supabaseAdmin
                    .from("user_roles")
                    .upsert({
                        id: userId,
                        role: "proctor",
                        morning_room: amRoom,
                        afternoon_room: pmRoom,
                    });

                if (roleError) throw roleError;
                importedCount++;
            } catch (err: any) {
                errors.push(`${vol.email}: ${err.message}`);
            }
        }

        return NextResponse.json({ success: true, importedCount, errors });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
