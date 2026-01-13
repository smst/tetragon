import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export async function POST() {
    const { data: responses, error } = await supabaseAdmin
        .from("responses")
        .select("*");

    if (error)
        return NextResponse.json({ error: error.message }, { status: 500 });

    // 2. Calculate "x" (difficulty) for each question
    // structure: { question_1: { total: 10, correct: 5 }, ... }
    let questionStats = {};

    responses.forEach((r) => {
        if (!questionStats[r.question_number]) {
            questionStats[r.question_number] = { total: 0, correct: 0 };
        }
        questionStats[r.question_number].total += 1;
        if (r.is_correct) {
            questionStats[r.question_number].correct += 1;
        }
    });

    // 3. Calculate score per student
    let studentScores = {};

    responses.forEach((r) => {
        if (r.is_correct) {
            const stats = questionStats[r.question_number];
            const x = stats.correct / stats.total; // The proportion who got it right

            // YOUR FORMULA: 1 + sqrt(1 - x)
            const points = 1 + Math.sqrt(1 - x);

            if (!studentScores[r.competitor_id]) {
                studentScores[r.competitor_id] = 0;
            }
            studentScores[r.competitor_id] += points;
        }
    });

    // 4. Update the database with final scores
    // (We use a loop here for simplicity, but in production, you'd batch this)
    for (const [competitorId, score] of Object.entries(studentScores)) {
        await supabaseAdmin
            .from("competitors")
            .update({ math_score: score })
            .eq("id", competitorId);
    }

    return NextResponse.json({
        message: "Scores calculated successfully!",
        data: studentScores,
    });
}
