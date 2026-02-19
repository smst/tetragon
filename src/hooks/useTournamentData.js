import useSWR from "swr";
import { supabase } from "@/lib/supabaseClient";

const fetcher = async () => {
    const [compRes, teamRes] = await Promise.all([
        supabase
            .from("competitors")
            .select(`*, team:teams(id, name, room)`)
            .order("name"),
        supabase.from("teams").select("*").order("name"),
    ]);

    if (compRes.error) throw compRes.error;
    if (teamRes.error) throw teamRes.error;

    return {
        competitors: compRes.data || [],
        teams: teamRes.data || [],
    };
};

export function useTournamentData() {
    const { data, error, mutate } = useSWR("tournamentData", fetcher, {
        refreshInterval: 5000, // Background poll every 5 seconds
        revalidateOnFocus: true, // Refresh instantly when tab is clicked
    });

    return {
        competitors: data?.competitors || [],
        teams: data?.teams || [],
        isLoading: !error && !data,
        isError: error,
        refreshData: mutate,
    };
}
