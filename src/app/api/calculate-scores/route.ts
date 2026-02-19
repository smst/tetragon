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

export async function POST(request: Request) {
    console.log("--- STARTING ALGORITHM ---");

    try {
        await checkAdmin(request);

        const [
            { data: mathResponses },
            { data: scienceResponses },
            { data: teamResponses },
            { data: designEntries },
            { data: competitors },
            { data: allTeams },
        ] = await Promise.all([
            supabaseAdmin.from("math_round_responses").select("*"),
            supabaseAdmin.from("science_round_responses").select("*"),
            supabaseAdmin.from("team_round_responses").select("*"),
            supabaseAdmin.from("design_challenge_entries").select("*"),
            supabaseAdmin.from("competitors").select("id, team_id"),
            supabaseAdmin.from("teams").select("id"),
        ]);

        const totalCompetitors = competitors?.length || 1;

        const calculateRoundScores = (responses: any[]) => {
            const correctCounts: Record<string, number> = {};
            responses.forEach((r) => {
                if (r.is_correct) {
                    correctCounts[r.question_number] =
                        (correctCounts[r.question_number] || 0) + 1;
                }
            });

            const questionValues: Record<string, number> = {};
            Object.keys(correctCounts).forEach((qNum) => {
                const correctCount = correctCounts[qNum];
                const x = correctCount / totalCompetitors;
                questionValues[qNum] = 1 + Math.sqrt(1 - x);
            });

            const studentScores: Record<string, number> = {};
            responses.forEach((r) => {
                if (r.is_correct) {
                    const points = questionValues[r.question_number];
                    studentScores[r.competitor_id] =
                        (studentScores[r.competitor_id] || 0) + points;
                }
            });

            return studentScores;
        };

        const mathScores = calculateRoundScores(mathResponses || []);
        const scienceScores = calculateRoundScores(scienceResponses || []);

        const compUpdates = (competitors || []).map((comp) => ({
            id: comp.id,
            math_round_score: mathScores[comp.id] || 0,
            science_round_score: scienceScores[comp.id] || 0,
        }));

        if (compUpdates.length > 0) {
            const { error: compError } = await supabaseAdmin
                .from("competitors")
                .upsert(compUpdates);
            if (compError)
                throw new Error(
                    "Competitor Update Error: " + compError.message,
                );
        }

        const teamStats: Record<string, any> = {};

        if (allTeams) {
            allTeams.forEach((t) => {
                teamStats[t.id] = {
                    mathSum: 0,
                    sciSum: 0,
                    members: 0,
                    teamRound: 0,
                    design: 0,
                };
            });
        }

        (competitors || []).forEach((c) => {
            if (!c.team_id || !teamStats[c.team_id]) return;
            teamStats[c.team_id].mathSum += mathScores[c.id] || 0;
            teamStats[c.team_id].sciSum += scienceScores[c.id] || 0;
            teamStats[c.team_id].members += 1;
        });

        if (teamResponses) {
            teamResponses.forEach((r) => {
                if (r.is_correct && teamStats[r.team_id]) {
                    teamStats[r.team_id].teamRound += 5;
                }
            });
        }

        if (designEntries) {
            designEntries.forEach((d) => {
                if (teamStats[d.team_id]) {
                    teamStats[d.team_id].design = d.final_score || 0;
                }
            });
        }

        const teamUpdates = Object.keys(teamStats).map((teamId) => {
            const s = teamStats[teamId];
            const avgMath = s.members > 0 ? s.mathSum / s.members : 0;
            const avgSci = s.members > 0 ? s.sciSum / s.members : 0;
            const overall = avgMath + avgSci + s.teamRound + s.design;

            return {
                id: teamId,
                team_round_score: s.teamRound,
                design_round_score: s.design,
                overall_score: overall,
            };
        });

        if (teamUpdates.length > 0) {
            const { error: teamError } = await supabaseAdmin
                .from("teams")
                .upsert(teamUpdates);
            if (teamError)
                throw new Error("Team Update Error: " + teamError.message);
        }

        return NextResponse.json({
            message: "Success",
            teamsUpdated: teamUpdates.length,
        });
    } catch (err: any) {
        console.error("API FAILURE:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
