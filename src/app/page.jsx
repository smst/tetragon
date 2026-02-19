import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import DashboardClient from "@/components/dashboard/DashboardClient";

export default async function Home() {
    const cookieStore = await cookies();

    // 1. Setup Supabase for Server Component
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options),
                        );
                    } catch {
                        // Ignored in Server Components
                    }
                },
            },
        },
    );

    // 2. Auth Check
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
        redirect("/login");
    }

    // 3. Parallel Data Fetching
    const [roleResult, compResult, teamResult] = await Promise.all([
        supabase.from("user_roles").select("role").eq("id", user.id).single(),
        supabase
            .from("competitors")
            .select(`*, team:teams(id, name, room)`)
            .order("name"),
        supabase.from("teams").select("*").order("name"),
    ]);

    // 4. Render
    return (
        <DashboardClient
            initialCompetitors={compResult.data || []}
            initialTeams={teamResult.data || []}
            userEmail={user.email}
            userRole={roleResult.data?.role || "unassigned"}
        />
    );
}
