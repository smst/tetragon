import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// 1. Add 'request' as an argument to the function
export async function POST(request) {
    console.log("--- STARTING ALGORITHM ---");

    try {
        // --- SECURITY CHECK ---
        // Verify the user is logged in before running expensive calculations
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        );

        const authHeader = request.headers.get("Authorization");
        const token = authHeader?.split(" ")[1]; // Remove "Bearer " prefix

        if (!token) {
            return NextResponse.json(
                { error: "Missing Authorization Token" },
                { status: 401 },
            );
        }

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json(
                { error: "Unauthorized: Invalid Token" },
                { status: 401 },
            );
        }

        // --- CALCULATION LOGIC ---
        // 1. FETCH EVERYTHING
        const [
            { data: mathResponses },
            { data: scienceResponses },
            { data: teamResponses },
            { data: designEntries },
            { data: competitors },
        ] = await Promise.all([
            supabaseAdmin.from("math_round_responses").select("*"),
            supabaseAdmin.from("science_round_responses").select("*"),
            supabaseAdmin.from("team_round_responses").select("*"),
            supabaseAdmin.from("design_challenge_entries").select("*"),
            supabaseAdmin.from("competitors").select("id, team_id"),
        ]);

        const totalCompetitors = competitors.length || 1; // Avoid divide by zero

        // --- HELPER: THE ALGORITHM ---
        const calculateRoundScores = (responses) => {
            // Step A: Count how many people got each question correct
            const correctCounts = {};
            responses.forEach((r) => {
                if (r.is_correct) {
                    correctCounts[r.question_number] =
                        (correctCounts[r.question_number] || 0) + 1;
                }
            });

            // Step B: Calculate the "Value" of each question
            const questionValues = {};
            Object.keys(correctCounts).forEach((qNum) => {
                const correctCount = correctCounts[qNum];
                const x = correctCount / totalCompetitors;
                questionValues[qNum] = 1 + Math.sqrt(1 - x);
            });

            // Step C: Assign points to students
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

        // 2. RUN CALCULATIONS
        const mathScores = calculateRoundScores(mathResponses || []);
        const scienceScores = calculateRoundScores(scienceResponses || []);

        // 3. UPDATE COMPETITORS
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

        // 4. CALCULATE TEAM SCORES
        console.log("Calculating Team Aggregate Scores...");
        const teamStats = {};

        // A. Sum up individual scores
        competitors.forEach((c) => {
            if (!c.team_id) return;
            if (!teamStats[c.team_id]) {
                teamStats[c.team_id] = {
                    mathSum: 0,
                    sciSum: 0,
                    members: 0,
                    teamRound: 0,
                    design: 0,
                };
            }

            teamStats[c.team_id].mathSum += mathScores[c.id] || 0;
            teamStats[c.team_id].sciSum += scienceScores[c.id] || 0;
            teamStats[c.team_id].members += 1;
        });

        // B. Add Team Round
        if (teamResponses) {
            teamResponses.forEach((r) => {
                if (r.is_correct && teamStats[r.team_id]) {
                    teamStats[r.team_id].teamRound += 5;
                }
            });
        }

        // C. Add Design Round
        if (designEntries) {
            designEntries.forEach((d) => {
                if (teamStats[d.team_id]) {
                    teamStats[d.team_id].design = d.final_score || 0;
                }
            });
        }

        // 5. UPDATE TEAMS
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
