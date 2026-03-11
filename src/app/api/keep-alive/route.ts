import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response("Unauthorized", { status: 401 });
    }

    const { error } = await supabase.from("teams").select("id").limit(1);

    if (error) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 },
        );
    }

    return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
    });
}
