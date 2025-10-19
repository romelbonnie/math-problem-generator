import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "@/lib/supabaseClient";

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { session_id, user_answer } = body;

    // Validate input
    if (!session_id || user_answer === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
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

    // Check if answer is correct
    const correctAnswer = Number(session.correct_answer);
    const userAnswerNum = Number(user_answer);
    const isCorrect = Math.abs(correctAnswer - userAnswerNum) < 0.01; // Allow small floating point differences

    // Generate personalized feedback using AI
    const model = genAI.getGenerativeModel({
      model: "models/gemini-2.5-flash",
    });

    const feedbackPrompt = `
      You are a helpful and encouraging Primary 5 math teacher.

      Problem: ${session.problem_text}
      Correct Answer: ${correctAnswer}
      Student's Answer: ${userAnswerNum}
      Result: ${isCorrect ? "CORRECT" : "INCORRECT"}

      Generate a personalized feedback message (2-3 sentences) that:
      ${
        isCorrect
          ? "1. Praises the student for getting the correct answer\n2. Briefly explains why the answer is correct or highlights the key concept\n3. Encourages them to keep practicing"
          : "1. Gently explains what went wrong\n2. Provides a hint or shows the correct approach\n3. Encourages the student to try again"
      }

      Keep the tone friendly, supportive, and appropriate for a 10-11 year old student.
      Return ONLY the feedback text, no additional formatting.
      `;

    const result = await model.generateContent(feedbackPrompt);
    const response = await result.response;
    const feedbackText = response.text().trim();

    // Save submission to database
    const { error: insertError } = await supabase
      .from("math_problem_submissions")
      .insert({
        session_id: session_id,
        user_answer: userAnswerNum,
        is_correct: isCorrect,
        feedback_text: feedbackText,
      });

    if (insertError) {
      console.error("Database error:", insertError);
      throw new Error("Failed to save submission");
    }

    return NextResponse.json({
      is_correct: isCorrect,
      feedback: feedbackText,
      correct_answer: correctAnswer,
    });
  } catch (error) {
    console.error("Error submitting answer:", error);
    return NextResponse.json(
      { error: "Failed to submit answer" },
      { status: 500 }
    );
  }
}
