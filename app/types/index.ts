export interface ResultItem {
  swimmers: string[];
  place: number;
  time: string;
}

export type RaceType = 
  | "200 MR"
  | "200 Free"
  | "200 IM"
  | "50 Free"
  | "100 Fly"
  | "100 Free"
  | "500 Free"
  | "200 FR"
  | "100 Back"
  | "100 Breast"
  | "400 FR";

export interface RaceResult {
  race: RaceType;
  results: ResultItem[];
}

export type RaceResults = RaceResult[];

export interface EventInfo {
  date: string;
  result: string;
  opponent: string;
}

export interface SubmitResultsRequest {
  username: string;
  password: string;
  sport: string;
  eventDate: string;
  data: RaceResults;
  requestId: string;
}

export interface SubmitResultsResponse {
  success: boolean;
  error?: string;
  details?: string;
  suggestion?: string;
}
