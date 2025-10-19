"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Submission {
  user_answer: number;
  is_correct: boolean;
  feedback_text: string;
  submitted_at: string;
  is_revealed?: boolean;
}

interface ProblemHistory {
  session_id: string;
  problem_text: string;
  correct_answer: number;
  created_at: string;
  submissions: Submission[];
}

export default function HistoryPage() {
  const [history, setHistory] = useState<ProblemHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedProblems, setExpandedProblems] = useState<Set<string>>(
    new Set()
  );
  const [revealingAnswers, setRevealingAnswers] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      // Get session IDs from localStorage
      const sessionIds = JSON.parse(
        localStorage.getItem("math_problem_sessions") || "[]"
      );

      if (sessionIds.length === 0) {
        setHistory([]);
        setIsLoading(false);
        return;
      }

      const response = await fetch("/api/math-problem/history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_ids: sessionIds,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch history");
      }

      const data = await response.json();
      setHistory(data.history);
    } catch (error) {
      console.error("Error fetching history:", error);
      setError("Failed to load history. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const toggleExpanded = (sessionId: string) => {
    setExpandedProblems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  };

  const revealAnswer = async (sessionId: string) => {
    setRevealingAnswers((prev) => new Set(prev).add(sessionId));

    try {
      const response = await fetch("/api/math-problem/reveal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to reveal answer");
      }

      // Refresh the history to show the revealed answer
      await fetchHistory();
    } catch (error) {
      console.error("Error revealing answer:", error);
      setError("Failed to reveal answer. Please try again.");
    } finally {
      setRevealingAnswers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(sessionId);
        return newSet;
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <main className="container mx-auto px-6 py-12 max-w-5xl">
          <div className="text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-900 border-t-transparent"></div>
            </div>
            <p className="text-slate-600 text-lg">
              Loading your problem history...
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="container mx-auto px-6 py-12 max-w-5xl">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-5xl font-bold text-slate-900 mb-2">
              Problem History
            </h1>
            <p className="text-slate-600 text-lg">
              Track your learning progress 📈
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <span className="text-lg">←</span>
            Back to Generator
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xl">⚠️</span>
              <p className="text-red-800 font-medium">{error}</p>
            </div>
            <button
              onClick={fetchHistory}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
            >
              Try Again
            </button>
          </div>
        )}

        {history.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">📚</span>
            </div>
            <h2 className="text-3xl font-semibold text-slate-900 mb-3">
              No Problems Yet
            </h2>
            <p className="text-slate-600 mb-8 text-lg">
              You haven't generated any math problems yet. Start practicing!
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-4 px-8 rounded-xl transition-all duration-200 text-lg"
            >
              ✨ Generate Your First Problem
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {history.map((item, index) => {
              const isExpanded = expandedProblems.has(item.session_id);
              return (
                <div
                  key={item.session_id}
                  className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6"
                >
                  <div
                    className="flex justify-between items-start mb-4 cursor-pointer hover:bg-slate-50 -m-2 p-3 rounded-xl transition-colors"
                    onClick={() => toggleExpanded(item.session_id)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-xl font-semibold text-slate-900">
                          Problem #{index + 1}
                        </h3>
                        <span className="text-slate-400 text-lg">
                          {isExpanded ? "▼" : "▶"}
                        </span>
                      </div>
                      {item.submissions.length > 0 && (
                        <p className="text-sm text-slate-600">
                          {item.submissions.length} submission
                          {item.submissions.length !== 1 ? "s" : ""} • Latest:{" "}
                          <span
                            className={`font-medium ${
                              item.submissions[item.submissions.length - 1]
                                .is_revealed
                                ? "text-blue-600"
                                : item.submissions[item.submissions.length - 1]
                                    .is_correct
                                ? "text-emerald-600"
                                : "text-amber-600"
                            }`}
                          >
                            {item.submissions[item.submissions.length - 1]
                              .is_revealed
                              ? "🔍 Revealed"
                              : item.submissions[item.submissions.length - 1]
                                  .is_correct
                              ? "✅ Correct"
                              : "❌ Incorrect"}
                          </span>
                          {!isExpanded && " • Click to view details"}
                        </p>
                      )}
                      {item.submissions.length === 0 && !isExpanded && (
                        <p className="text-sm text-slate-500 italic">
                          No submissions yet • Click to view details
                        </p>
                      )}
                    </div>
                    <span className="text-sm text-slate-500">
                      {formatDate(item.created_at)}
                    </span>
                  </div>

                  <div className="mb-6">
                    <div className="bg-slate-50 rounded-xl p-6">
                      <p className="text-slate-800 leading-relaxed text-lg">
                        {item.problem_text}
                      </p>
                    </div>
                    {isExpanded && (
                      <div className="bg-slate-100 rounded-xl p-6 mt-4">
                        {item.submissions.some((sub) => sub.is_correct) ? (
                          <div className="text-center">
                            <p className="text-sm font-semibold text-slate-600 mb-2">
                              Correct Answer
                            </p>
                            <p className="text-3xl font-bold text-slate-900">
                              {item.correct_answer}
                            </p>
                          </div>
                        ) : (
                          <div className="text-center">
                            <p className="text-sm font-medium text-slate-600 mb-4">
                              Want to see the correct answer?
                            </p>
                            <button
                              onClick={() => revealAnswer(item.session_id)}
                              disabled={revealingAnswers.has(item.session_id)}
                              className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
                            >
                              {revealingAnswers.has(item.session_id)
                                ? "Revealing..."
                                : "🔍 Reveal Answer"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {isExpanded && item.submissions.length > 0 && (
                    <div className="border-t border-slate-200 pt-6">
                      <div className="flex justify-between items-center mb-6">
                        <h4 className="text-xl font-semibold text-slate-900">
                          Submissions ({item.submissions.length})
                        </h4>
                        {!item.submissions.some((sub) => sub.is_correct) && (
                          <Link
                            href={`/?continue=${item.session_id}`}
                            className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 text-sm"
                          >
                            🔄 Continue Answering
                          </Link>
                        )}
                      </div>
                      <div className="space-y-4">
                        {item.submissions.map((submission, submissionIndex) => (
                          <div
                            key={submissionIndex}
                            className="bg-slate-50 rounded-xl p-6 border border-slate-200"
                          >
                            <div className="grid md:grid-cols-2 gap-6 mb-4">
                              <div>
                                <p className="text-sm font-semibold text-slate-600 mb-3">
                                  Answer #{submissionIndex + 1}
                                  {submission.is_revealed && (
                                    <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                                      Revealed
                                    </span>
                                  )}
                                </p>
                                <div
                                  className={`p-4 rounded-xl border ${
                                    submission.is_correct
                                      ? submission.is_revealed
                                        ? "bg-blue-50 border-blue-200"
                                        : "bg-emerald-50 border-emerald-200"
                                      : "bg-amber-50 border-amber-200"
                                  }`}
                                >
                                  <p
                                    className={`text-xl font-bold ${
                                      submission.is_correct
                                        ? submission.is_revealed
                                          ? "text-blue-700"
                                          : "text-emerald-700"
                                        : "text-amber-700"
                                    }`}
                                  >
                                    {submission.user_answer}
                                    {submission.is_correct ? " ✅" : " ❌"}
                                  </p>
                                </div>
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-slate-600 mb-2">
                                  Submitted
                                </p>
                                <p className="text-sm text-slate-500">
                                  {formatDate(submission.submitted_at)}
                                </p>
                              </div>
                            </div>

                            <div>
                              <p className="text-sm font-semibold text-slate-600 mb-3">
                                {submission.is_revealed
                                  ? "Explanation"
                                  : "Feedback"}
                              </p>
                              <div
                                className={`p-4 rounded-xl border ${
                                  submission.is_correct
                                    ? submission.is_revealed
                                      ? "bg-blue-50 border-blue-200"
                                      : "bg-emerald-50 border-emerald-200"
                                    : "bg-amber-50 border-amber-200"
                                }`}
                              >
                                <p className="text-slate-700 leading-relaxed">
                                  {submission.feedback_text}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {isExpanded && item.submissions.length === 0 && (
                    <div className="border-t border-slate-200 pt-6">
                      <div className="bg-slate-50 rounded-xl p-6 text-center">
                        <p className="text-slate-600">
                          This problem hasn't been answered yet.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
