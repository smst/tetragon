import useSWR from "swr";
import { supabase } from "@/lib/supabaseClient";
import { Competitor, Team } from "@/types";

// Define the exact shape of our cache
interface TournamentData {
    competitors: Competitor[];
    teams: Team[];
}

const fetcher = async (): Promise<TournamentData> => {
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
        competitors: (compRes.data as Competitor[]) || [],
        teams: (teamRes.data as Team[]) || [],
    };
};

export function useTournamentData() {
    const { data, error, mutate } = useSWR<TournamentData>(
        "tournamentData",
        fetcher,
        {
            refreshInterval: 5000,
            revalidateOnFocus: true,
        },
    );

    return {
        competitors: data?.competitors || [],
        teams: data?.teams || [],
        isLoading: !error && !data,
        isError: error,
        refreshData: mutate,
    };
}
