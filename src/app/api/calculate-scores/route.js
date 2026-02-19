import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Ensures that the request comes from an authenticated user. Returns the user.
async function checkAdmin(request) {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
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

// Handle a POST request to the route.
export async function POST(request) {
    console.log("--- STARTING ALGORITHM ---");

    try {
        await checkAdmin(request);

        // Fetch all data.
        const [
            { data: mathResponses },
            { data: scienceResponses },
            { data: teamResponses },
            { data: designEntries },
            { data: competitors },
            { data: teams },
        ] = await Promise.all([
            supabaseAdmin.from("math_round_responses").select("*"),
            supabaseAdmin.from("science_round_responses").select("*"),
            supabaseAdmin.from("team_round_responses").select("*"),
            supabaseAdmin.from("design_challenge_entries").select("*"),
            supabaseAdmin.from("competitors").select("id, team_id"),
            supabaseAdmin.from("teams").select("id"),
        ]);

        const totalCompetitors = competitors.length || 1;

        // Define calculation function for individual rounds.
        const calculateRoundScores = (responses) => {
            const correctCounts = {};
            responses.forEach((r) => {
                if (r.is_correct) {
                    correctCounts[r.question_number] =
                        (correctCounts[r.question_number] || 0) + 1;
                }
            });

            const questionValues = {};
            Object.keys(correctCounts).forEach((qNum) => {
                const correctCount = correctCounts[qNum];
                const x = correctCount / totalCompetitors;
                questionValues[qNum] = 1 + Math.sqrt(1 - x);
            });

            const studentScores = {};
            responses.forEach((r) => {
                if (r.is_correct) {
                    const points = questionValues[r.question_number];
                    studentScores[r.competitor_id] =
                        (studentScores[r.competitor_id] || 0) + points;
                }
            });

            return studentScores;
        };

        // Calculate scores for individual rounds.
        const mathScores = calculateRoundScores(mathResponses || []);
        const scienceScores = calculateRoundScores(scienceResponses || []);

        // Update individual scores.
        console.log(`Updating ${competitors.length} competitors...`);
        const compUpdates = competitors.map((comp) => ({
            id: comp.id,
            math_round_score: mathScores[comp.id] || 0,
            science_round_score: scienceScores[comp.id] || 0,
        }));

        const { error: compError } = await supabaseAdmin
            .from("competitors")
            .upsert(compUpdates);

        if (compError)
            throw new Error("Competitor Update Error: " + compError.message);

        // Calculate team scores.
        console.log("Calculating team scores...");
        const teamStats = {};

        // Initialize teams.
        if (teams) {
            teams.forEach((t) => {
                teamStats[t.id] = {
                    mathSum: 0,
                    sciSum: 0,
                    members: 0,
                    teamRound: 0,
                    design: 0,
                };
            });
        }

        // Calculate sum of individual scores.
        competitors.forEach((c) => {
            if (!c.team_id || !teamStats[c.team_id]) return;

            teamStats[c.team_id].mathSum += mathScores[c.id] || 0;
            teamStats[c.team_id].sciSum += scienceScores[c.id] || 0;
            teamStats[c.team_id].members += 1;
        });

        // Calculate team round score.
        if (teamResponses) {
            teamResponses.forEach((r) => {
                if (r.is_correct && teamStats[r.team_id]) {
                    teamStats[r.team_id].teamRound += 5;
                }
            });
        }

        // Calculate design challenge score.
        if (designEntries) {
            designEntries.forEach((d) => {
                if (teamStats[d.team_id]) {
                    teamStats[d.team_id].design = d.final_score || 0;
                }
            });
        }

        // Update team scores.
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

        console.log("--- SUCCESS ---");
        return NextResponse.json({
            message: "Success",
            teamsUpdated: teamUpdates.length,
        });
    } catch (err) {
        console.error("API FAILURE:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
