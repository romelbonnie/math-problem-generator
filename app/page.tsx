"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface MathProblem {
  problem_text: string;
  final_answer: number;
}

export default function Home() {
  const [problem, setProblem] = useState<MathProblem | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [sessionCount, setSessionCount] = useState(0);
  const [isContinuing, setIsContinuing] = useState(false);
  const [hasCorrectAnswer, setHasCorrectAnswer] = useState(false);

  // Load session IDs from localStorage on component mount
  useEffect(() => {
    const savedSessions = localStorage.getItem("math_problem_sessions");
    if (savedSessions) {
      const sessions = JSON.parse(savedSessions);
      setSessionCount(sessions.length);
    }

    // Check if user wants to continue answering a specific problem
    const urlParams = new URLSearchParams(window.location.search);
    const continueSessionId = urlParams.get("continue");

    if (continueSessionId) {
      setIsContinuing(true);
      loadExistingProblem(continueSessionId);
    }
  }, []);

  const checkForCorrectAnswer = async (sessionId: string) => {
    try {
      const response = await fetch("/api/math-problem/history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_ids: [sessionId],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const problem = data.history[0];
        if (
          problem &&
          problem.submissions &&
          problem.submissions.some((sub: any) => sub.is_correct)
        ) {
          setHasCorrectAnswer(true);
        }
      }
    } catch (error) {
      console.error("Error checking for correct answer:", error);
    }
  };

  const loadExistingProblem = async (sessionId: string) => {
    setIsLoading(true);
    setFeedback("");
    setIsCorrect(null);
    setUserAnswer("");
    setHasCorrectAnswer(false);

    try {
      // Fetch the existing problem from the database
      const response = await fetch(`/api/math-problem/${sessionId}`);

      if (!response.ok) {
        throw new Error("Failed to load problem");
      }

      const data = await response.json();
      setProblem({
        problem_text: data.problem_text,
        final_answer: data.final_answer,
      });
      setSessionId(data.session_id);

      // Check if this problem already has a correct answer
      await checkForCorrectAnswer(data.session_id);

      // Clear the URL parameter after loading
      const url = new URL(window.location.href);
      url.searchParams.delete("continue");
      window.history.replaceState({}, "", url.toString());
    } catch (error) {
      console.error("Error loading problem:", error);
      setFeedback("Failed to load problem. Please try generating a new one.");
      setIsContinuing(false);
    } finally {
      setIsLoading(false);
    }
  };

  const generateProblem = async () => {
    setIsLoading(true);
    setFeedback("");
    setIsCorrect(null);
    setUserAnswer("");
    setHasCorrectAnswer(false);

    try {
      const response = await fetch("/api/math-problem", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to generate problem");
      }

      const data = await response.json();
      setProblem({
        problem_text: data.problem_text,
        final_answer: data.final_answer,
      });
      setSessionId(data.session_id);

      // Save session ID to localStorage
      const existingSessions = JSON.parse(
        localStorage.getItem("math_problem_sessions") || "[]"
      );
      const updatedSessions = [...existingSessions, data.session_id];
      localStorage.setItem(
        "math_problem_sessions",
        JSON.stringify(updatedSessions)
      );
      setSessionCount(updatedSessions.length);
    } catch (error) {
      console.error("Error generating problem:", error);
      setFeedback("Failed to generate problem. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const submitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId || !userAnswer) return;

    setIsLoading(true);

    try {
      const response = await fetch("/api/math-problem/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: sessionId,
          user_answer: parseFloat(userAnswer),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit answer");
      }

      const data = await response.json();
      setIsCorrect(data.is_correct);
      setFeedback(data.feedback);

      // If answer is correct, disable further submissions for this problem
      if (data.is_correct) {
        setHasCorrectAnswer(true);
      }
    } catch (error) {
      console.error("Error submitting answer:", error);
      setFeedback("Failed to submit answer. Please try again.");
      setIsCorrect(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="container mx-auto px-6 py-12 max-w-3xl">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-5xl font-bold text-slate-900 mb-2">
              Math Problem Generator
            </h1>
            <p className="text-slate-600 text-lg">Practice makes perfect! 🧮</p>
          </div>
          <Link
            href="/history"
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <span className="text-lg">📚</span>
            History {sessionCount > 0 && `(${sessionCount})`}
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-8">
          <button
            onClick={generateProblem}
            disabled={isLoading}
            className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 text-lg"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Generating...
              </span>
            ) : (
              "✨ Generate New Problem"
            )}
          </button>
        </div>

        {problem && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900 mb-2">
                  Problem
                </h2>
                {isContinuing && (
                  <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-sm font-medium px-3 py-1 rounded-full border border-amber-200">
                    🔄 Continuing Previous Problem
                  </span>
                )}
                {hasCorrectAnswer && (
                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-sm font-medium px-3 py-1 rounded-full border border-emerald-200">
                    ✅ Already Answered Correctly
                  </span>
                )}
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-6 mb-6">
              <p className="text-lg text-slate-800 leading-relaxed">
                {problem.problem_text}
              </p>
            </div>

            <form onSubmit={submitAnswer} className="space-y-6">
              <div>
                <label
                  htmlFor="answer"
                  className="block text-sm font-semibold text-slate-700 mb-3"
                >
                  Your Answer
                </label>
                <input
                  type="number"
                  id="answer"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  className="w-full px-4 py-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors text-lg"
                  placeholder="Enter your answer here..."
                  required
                />
              </div>

              <button
                type="submit"
                disabled={!userAnswer || isLoading || hasCorrectAnswer}
                className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 text-lg"
              >
                {hasCorrectAnswer
                  ? "Already Answered Correctly"
                  : "Submit Answer"}
              </button>
            </form>
          </div>
        )}

        {feedback && (
          <div
            className={`rounded-2xl shadow-sm border p-8 mb-8 ${
              isCorrect
                ? "bg-emerald-50 border-emerald-200"
                : "bg-amber-50 border-amber-200"
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{isCorrect ? "🎉" : "💡"}</span>
              <h2 className="text-2xl font-semibold text-slate-900">
                {isCorrect ? "Excellent work!" : "Keep trying!"}
              </h2>
            </div>
            <p className="text-slate-700 leading-relaxed mb-6 text-lg">
              {feedback}
            </p>
            <button
              onClick={() => {
                setHasCorrectAnswer(false);
                generateProblem();
              }}
              disabled={isLoading}
              className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 text-lg"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Generating...
                </span>
              ) : (
                "✨ Try Another Problem"
              )}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
