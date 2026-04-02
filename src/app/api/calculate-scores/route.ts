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

    if (!roleData || !["admin", "grader"].includes(roleData.role))
        throw new Error("Unauthorized: Admins and Graders only");

    return user;
}

async function fetchAllRecords(tableName: string, selectQuery: string = "*") {
    let allData: any[] = [];
    let start = 0;
    const limit = 1000;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await supabaseAdmin
            .from(tableName)
            .select(selectQuery)
            .range(start, start + limit - 1);

        if (error) throw error;

        if (data) {
            allData.push(...data);
            if (data.length < limit) {
                hasMore = false;
            } else {
                start += limit;
            }
        } else {
            hasMore = false;
        }
    }
    return allData;
}

export async function POST(request: Request) {
    try {
        await checkAdmin(request);

        const [
            mathResponses,
            scienceResponses,
            teamResponses,
            designEntries,
            competitors,
            allTeams,
        ] = await Promise.all([
            fetchAllRecords("math_round_responses", "*"),
            fetchAllRecords("science_round_responses", "*"),
            fetchAllRecords(
                "team_round_responses",
                "team_id, is_correct, points_possible",
            ),
            fetchAllRecords("design_challenge_entries", "*"),
            fetchAllRecords("competitors", "id, team_id"),
            fetchAllRecords("teams", "id"),
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
            const studentCorrectCounts: Record<string, number> = {};

            responses.forEach((r) => {
                if (r.is_correct) {
                    const points = questionValues[r.question_number];
                    studentScores[r.competitor_id] =
                        (studentScores[r.competitor_id] || 0) + points;
                    studentCorrectCounts[r.competitor_id] =
                        (studentCorrectCounts[r.competitor_id] || 0) + 1;
                }
            });

            return { scores: studentScores, counts: studentCorrectCounts };
        };

        const mathResults = calculateRoundScores(mathResponses || []);
        const scienceResults = calculateRoundScores(scienceResponses || []);

        const compUpdates = (competitors || []).map((comp) => ({
            id: comp.id,
            math_round_score: mathResults.scores[comp.id] || 0,
            math_correct_count: mathResults.counts[comp.id] || 0,
            science_round_score: scienceResults.scores[comp.id] || 0,
            science_correct_count: scienceResults.counts[comp.id] || 0,
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
            teamStats[c.team_id].mathSum += mathResults.scores[c.id] || 0;
            teamStats[c.team_id].sciSum += scienceResults.scores[c.id] || 0;
            teamStats[c.team_id].members += 1;
        });

        if (teamResponses) {
            teamResponses.forEach((r) => {
                if (r.is_correct && teamStats[r.team_id]) {
                    teamStats[r.team_id].teamRound +=
                        Number(r.points_possible) || 0;
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
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
