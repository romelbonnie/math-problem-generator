import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "@/lib/supabaseClient";

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { session_id } = body;

    // Validate input
    if (!session_id) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Get the problem from database
    const { data: session, error: sessionError } = await supabase
      .from("math_problem_sessions")
      .select("*")
      .eq("id", session_id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Problem session not found" },
        { status: 404 }
      );
    }

    const correctAnswer = Number(session.correct_answer);

    // Generate feedback for revealing the answer
    const model = genAI.getGenerativeModel({
      model: "models/gemini-2.5-flash",
    });

    const feedbackPrompt = `
      You are a helpful and encouraging Primary 5 math teacher.

      Problem: ${session.problem_text}
      Correct Answer: ${correctAnswer}

      The student has chosen to reveal the correct answer instead of continuing to try solving it themselves.

      Generate a supportive feedback message (2-3 sentences) that:
      1. Acknowledges their decision to reveal the answer
      2. Explains the correct answer and the key concepts involved
      3. Encourages them to try similar problems in the future

      Keep the tone friendly, supportive, and appropriate for a 10-11 year old student.
      Return ONLY the feedback text, no additional formatting.
    `;

    const result = await model.generateContent(feedbackPrompt);
    const response = await result.response;
    const feedbackText = response.text().trim();

    // Save the revealed answer as a submission
    const { error: insertError } = await supabase
      .from("math_problem_submissions")
      .insert({
        session_id: session_id,
        user_answer: correctAnswer,
        is_correct: true,
        is_revealed: true,
        feedback_text: feedbackText,
      });

    if (insertError) {
      console.error("Database error:", insertError);
      throw new Error("Failed to save revealed answer");
    }

    return NextResponse.json({
      is_correct: true,
      feedback: feedbackText,
      correct_answer: correctAnswer,
      is_revealed: true,
    });
  } catch (error) {
    console.error("Error revealing answer:", error);
    return NextResponse.json(
      { error: "Failed to reveal answer" },
      { status: 500 }
    );
  }
}
