import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "@/lib/supabaseClient";

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

const P5_SYLLABUS_CONTEXT = `
You are generating math word problems for Primary 5 students in Singapore.
Primary 5 topics include:
- Whole numbers up to 10 million
- Four operations with fractions (proper, improper, mixed numbers)
- Decimals up to 3 decimal places
- Percentage (up to 100%)
- Ratio
- Rate
- Basic algebra
- Geometry (angles, triangles, quadrilaterals, circles)
- Area and perimeter (triangles, parallelograms, trapeziums)
- Volume (cubes, cuboids)

Generate a word problem that:
1. Is appropriate for Primary 5 level (age 10-11)
2. Uses real-world context that students can relate to
3. Has ONE clear numerical answer
4. Is not too simple but not overly complex

Return ONLY a JSON object with this format:
{
  "problem_text": "The word problem here",
  "final_answer": 123
}

The final_answer should be a number (can be decimal or whole number).
`;

export async function POST(request: NextRequest) {
  try {
    // Generate problem using Gemini AI
    const model = genAI.getGenerativeModel({ model: "models/gemini-2.5-flash" });

    const result = await model.generateContent(P5_SYLLABUS_CONTEXT);
    const response = await result.response;
    const text = response.text();

    // Parse the JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse AI response");
    }

    const problemData = JSON.parse(jsonMatch[0]);

    // Save to database
    const { data, error } = await supabase
      .from("math_problem_sessions")
      .insert({
        problem_text: problemData.problem_text,
        correct_answer: problemData.final_answer,
      })
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      throw new Error("Failed to save problem to database");
    }

    return NextResponse.json({
      session_id: data.id,
      problem_text: data.problem_text,
      final_answer: data.correct_answer,
    });
  } catch (error) {
    console.error("Error generating problem:", error);
    return NextResponse.json(
      { error: "Failed to generate problem" },
      { status: 500 }
    );
  }
}
