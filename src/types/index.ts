export type UserRole = "admin" | "grader" | "proctor" | "unassigned";

export interface Team {
    id: string;
    name: string;
    team_round_score: number;
    design_round_score: number;
    overall_score: number;
    room: string | number; // Matches the numeric/string room assignment
}

export interface Competitor {
    id: string;
    name: string;
    math_round_score: number;
    science_round_score: number;
    grade: string | number;
    team_id: string | null;
    math_round_graded: boolean;
    science_round_graded: boolean;
    // Joined relational data from Supabase
    team?: {
        id: string;
        name: string;
        room: string | number;
    } | null;
}

export interface DesignChallengeEntry {
    id: string;
    team_id: string;
    mass_used: number;
    time_taken: number;
    distance_traveled: number;
    is_finished: boolean;
    final_score: number;
}

export interface ProctorSchedule {
    id: string;
    user_id: string;
    start_time: string; // ISO timestamp
    end_time: string; // ISO timestamp
    location: string;
    task_description: string;
}

export interface AttendanceLog {
    id: string;
    competitor_id: string;
    recorded_by: string;
    check_in_period: string;
    timestamp: string;
}
