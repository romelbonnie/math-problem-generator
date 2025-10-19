-- Add is_revealed column to math_problem_submissions table
-- This column will identify if the correct answer was revealed instead of user submitting a correct answer

ALTER TABLE math_problem_submissions 
ADD COLUMN is_revealed BOOLEAN DEFAULT FALSE;

-- Add a comment to explain the column purpose
COMMENT ON COLUMN math_problem_submissions.is_revealed IS 'Indicates if this submission was created by revealing the answer rather than user submitting their own answer';

-- Create an index for better query performance when filtering by is_revealed
CREATE INDEX idx_math_problem_submissions_is_revealed ON math_problem_submissions(is_revealed);
