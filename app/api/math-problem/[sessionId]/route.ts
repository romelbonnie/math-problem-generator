import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;

    // Validate session ID
    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Fetch the problem from database
    const { data: session, error: sessionError } = await supabase
      .from("math_problem_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Problem session not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      session_id: session.id,
      problem_text: session.problem_text,
      final_answer: session.correct_answer,
      created_at: session.created_at,
    });
  } catch (error) {
    console.error("Error fetching problem:", error);
    return NextResponse.json(
      { error: "Failed to fetch problem" },
      { status: 500 }
    );
  }
}
