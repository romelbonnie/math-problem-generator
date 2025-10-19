import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { session_ids } = body;

    // Validate input
    if (
      !session_ids ||
      !Array.isArray(session_ids) ||
      session_ids.length === 0
    ) {
      return NextResponse.json({ history: [] });
    }

    // Fetch sessions with their submissions
    const { data: sessions, error: sessionsError } = await supabase
      .from("math_problem_sessions")
      .select("*")
      .in("id", session_ids)
      .order("created_at", { ascending: false });

    if (sessionsError) {
      throw new Error("Failed to fetch sessions");
    }

    // Fetch submissions for these sessions
    const { data: submissions, error: submissionsError } = await supabase
      .from("math_problem_submissions")
      .select("*")
      .in("session_id", session_ids);

    if (submissionsError) {
      throw new Error("Failed to fetch submissions");
    }

    // Combine sessions with their submissions
    const history = sessions.map((session) => {
      const sessionSubmissions = submissions
        .filter((sub) => sub.session_id === session.id)
        .map((submission) => ({
          user_answer: submission.user_answer,
          is_correct: submission.is_correct,
          feedback_text: submission.feedback_text,
          submitted_at: submission.created_at,
          is_revealed: submission.is_revealed || false,
        }))
        .sort(
          (a, b) =>
            new Date(a.submitted_at).getTime() -
            new Date(b.submitted_at).getTime()
        ); // Sort by submission time

      return {
        session_id: session.id,
        problem_text: session.problem_text,
        correct_answer: session.correct_answer,
        created_at: session.created_at,
        submissions: sessionSubmissions,
      };
    });

    return NextResponse.json({ history });
  } catch (error) {
    console.error("Error fetching history:", error);
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}
