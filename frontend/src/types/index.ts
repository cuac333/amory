// Auth
export interface User {
  id: number;
  name: string;
  email: string;
  avatar_url: string | null;
  role: string | null;
  couple_id: number | null;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface CoupleResponse {
  id: number;
  anniversary_date: string;
  invite_code: string;
  photo_url: string | null;
  created_at: string;
}

// Book
export interface BookPage {
  id: number;
  couple_id: number;
  created_by: number | null;
  title: string | null;
  photo_url: string | null;
  text: string | null;
  audio_url: string | null;
  page_type: "cover" | "inner" | "back_cover";
  order: number;
  particle_type: string | null;
  created_at: string;
  likes_count: number;
  comments_count: number;
}

export interface Comment {
  id: number;
  page_id: number;
  user_id: number;
  user_name: string;
  content: string;
  created_at: string;
}

export interface ReactionCount {
  emoji: string;
  count: number;
}

export interface StickerData {
  id: number;
  emoji: string;
  position_x: number;
  position_y: number;
  scale: number;
  rotation: number;
}

export interface SecretLetter {
  id: number;
  content: string | null;
  is_unlocked: boolean;
  created_at: string;
}

export interface GuestBookEntry {
  id: number;
  author_name: string;
  message: string;
  created_at: string;
}

// Monthly
export interface MonthlyActivity {
  id: number;
  couple_id: number;
  created_by: number | null;
  month: number;
  year: number;
  title: string;
  description: string | null;
  category: string;
  status: "pending" | "in_progress" | "waiting_partner" | "completed";
  created_at: string;
  completed_at: string | null;
  entries: MonthlyEntry[];
}

export interface MonthlyEntry {
  id: number;
  activity_id: number;
  user_id: number;
  user_name: string;
  photo_url: string;
  feeling_text: string;
  created_at: string;
}

export interface Streak {
  current_streak: number;
  best_streak: number;
  last_completed_month: number | null;
  last_completed_year: number | null;
}

// Outings
export interface Outing {
  id: number;
  couple_id: number;
  proposed_by: number;
  proposed_by_name: string;
  title: string;
  description: string | null;
  place: string | null;
  place_url: string | null;
  latitude: number | null;
  longitude: number | null;
  category: string;
  proposed_date: string | null;
  status: "proposed" | "approved" | "completed" | "documented";
  created_at: string;
  completed_at: string | null;
  voted_by: string | null;
  complete_confirmed_by: string | null;
  documented_by: string | null;
}

export interface BucketListItem {
  id: number;
  couple_id: number;
  added_by: number;
  title: string;
  description: string | null;
  category: string | null;
  completed: boolean;
  completed_at: string | null;
  confirmed_by: string | null;
  created_at: string;
}

// Wishlist
export interface WishlistItem {
  id: number;
  couple_id: number;
  added_by: number;
  category: string;
  title: string;
  description: string | null;
  url: string | null;
  image_url: string | null;
  completed: boolean;
  rating: number | null;
  review: string | null;
  is_secret: boolean;
  created_at: string;
  completed_at: string | null;
}

// Diary
export interface DiaryEntry {
  id: number;
  couple_id: number;
  user_id: number;
  user_name: string;
  content: string;
  mood: string | null;
  photo_url: string | null;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
  comments_count: number;
}

export interface DiaryComment {
  id: number;
  diary_entry_id: number;
  user_id: number;
  user_name: string;
  content: string;
  created_at: string;
}

export interface MoodEntry {
  date: string;
  mood: string;
  user_id: number;
}

// Extras
export interface QuizQuestion {
  id: number;
  question: string;
  category: string;
  options: string[] | null;
  correct_answer: string | null;
  difficulty: string;
  is_preset: boolean;
  created_by: number;
  answers: QuizAnswer[];
  created_at: string;
}

export interface QuizStats {
  total_questions: number;
  answered_both: number;
  matches: number;
  match_rate: number;
  by_category: Record<string, { total: number; answered: number; matches: number }>;
}

export interface QuizAnswer {
  id: number;
  user_id: number;
  user_name: string;
  answer: string;
  created_at: string;
}

export interface MemoryPin {
  id: number;
  couple_id: number;
  created_by: number | null;
  title: string;
  description: string | null;
  photo_url: string | null;
  latitude: number;
  longitude: number;
  visited_at: string | null;
  created_at: string;
}

// Book Clues
export interface BookClue {
  id: number;
  couple_id: number;
  section: string;
  hint_text: string;
  answer_fragment: string;
  order: number;
  created_at: string;
}

// Scratch Cards
export interface ScratchCard {
  id: number;
  couple_id: number;
  created_by: number | null;
  for_user_id: number | null;
  title: string;
  hidden_message: string | null;
  color: string;
  scratched_by: number | null;
  scratched_at: string | null;
  created_at: string;
}

// Vouchers
export interface Voucher {
  id: number;
  couple_id: number;
  created_by: number | null;
  for_user_id: number | null;
  title: string;
  description: string | null;
  icon: string;
  redeemed_by: number | null;
  redeemed_at: string | null;
  created_at: string;
}

// Truth or Dare
export interface TruthOrDare {
  id: number;
  couple_id: number;
  text: string;
  card_type: "truth" | "dare";
  category: "normal" | "couples" | "hot";
  is_preset: boolean;
  created_by: number;
  created_at: string;
}

// Spinner
export interface SpinnerOption {
  id: number;
  couple_id: number;
  created_by: number | null;
  text: string;
  created_at: string;
}

// Secret Letters (Game)
export interface SecretLetterGame {
  id: number;
  couple_id: number;
  author_id: number;
  content: string | null;
  opens_at: string;
  opened_by: number | null;
  opened_at: string | null;
  created_at: string;
}

// Love Reasons
export interface LoveReason {
  id: number;
  couple_id: number;
  author_id: number;
  text: string;
  category: string;
  is_preset: boolean;
  created_at: string;
}

// Event Countdown
export interface EventCountdown {
  id: number;
  couple_id: number;
  created_by: number | null;
  title: string;
  description: string | null;
  event_date: string;
  icon: string;
  created_at: string;
}

// Bingo
export interface BingoCell {
  id: number;
  couple_id: number;
  created_by: number | null;
  text: string;
  completed: boolean;
  completed_at: string | null;
  order: number;
  created_at: string;
}

// Who's Most Likely
export interface WhosMostLikely {
  id: number;
  couple_id: number;
  question: string;
  is_preset: boolean;
  created_by: number;
  votes: WhosMostLikelyVote[];
  created_at: string;
}

export interface WhosMostLikelyVote {
  id: number;
  question_id: number;
  user_id: number;
  voted_for: number;
  created_at: string;
}

// Deletion Requests
export interface DeletionRequest {
  id: number;
  couple_id: number;
  requested_by: number;
  requested_by_name: string;
  entity_type: string;
  entity_id: number;
  entity_title: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  resolved_at: string | null;
  resolved_by: number | null;
}

export interface LoveCounter {
  anniversary_date: string;
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total_days: number;
}

// Daily Question
export interface DailyAnswer {
  id: number;
  question_id: number;
  user_id: number;
  user_name: string;
  answer_text: string;
  created_at: string;
}

export interface DailyQuestion {
  id: number;
  couple_id: number;
  question_text: string;
  is_preset: boolean;
  date: string;
  answers: DailyAnswer[];
  created_at: string;
}

// Thinking of You
export interface ThinkingOfYou {
  id: number;
  couple_id: number;
  sender_id: number;
  sender_name: string;
  message: string | null;
  seen: boolean;
  created_at: string;
}

// Shared Playlist
export interface SharedSong {
  id: number;
  couple_id: number;
  added_by: number;
  title: string;
  artist: string;
  song_url: string | null;
  note: string | null;
  created_at: string;
}

// Recipes
export interface Recipe {
  id: number;
  couple_id: number;
  added_by: number;
  title: string;
  description: string | null;
  ingredients: string[] | null;
  instructions: string | null;
  photo_url: string | null;
  rating: number | null;
  cooked: boolean;
  created_at: string;
}

// Timeline
export interface TimelineEvent {
  id: number;
  couple_id: number;
  added_by: number;
  title: string;
  description: string | null;
  photo_url: string | null;
  event_date: string;
  icon: string;
  created_at: string;
}

// Dream Board
export interface DreamItem {
  id: number;
  couple_id: number;
  added_by: number;
  title: string;
  description: string | null;
  image_url: string | null;
  category: string;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
}

// Achievements
export interface Achievement {
  id: number;
  couple_id: number;
  created_by: number | null;
  key: string;
  title: string;
  description: string;
  icon: string;
  unlocked_at: string | null;
  created_at: string;
}

// Weekly Challenges
export interface WeeklyChallenge {
  id: number;
  couple_id: number;
  title: string;
  description: string | null;
  week_start: string;
  status: "active" | "completed" | "skipped";
  completed_by: number | null;
  completed_at: string | null;
  is_preset: boolean;
  created_at: string;
}

// Date Budget
export interface DateExpense {
  id: number;
  couple_id: number;
  added_by: number;
  title: string;
  amount: number;
  category: string;
  expense_date: string;
  note: string | null;
  created_at: string;
}

export interface MonthBudgetEntry {
  month: string;
  budget: number;
  rollover: number;
  spent: number;
  remaining: number;
}

export interface BudgetSummary {
  total: number;
  by_category: Record<string, number>;
  month_total: number;
  this_month: string;
  default_budget: number;
  effective_budget: number;
  remaining: number;
  custom_categories: string[];
  monthly_history: MonthBudgetEntry[];
  per_month_budgets: Record<string, number>;
}

export interface BudgetConfig {
  id: number;
  couple_id: number;
  default_budget: number;
  custom_categories: string[];
  updated_at: string;
}

// Open When Letters
export interface OpenWhenLetter {
  id: number;
  couple_id: number;
  author_id: number;
  category: string;
  content: string | null;
  opened_by: number | null;
  opened_at: string | null;
  created_at: string;
}

// Time Capsule
export interface TimeCapsule {
  id: number;
  couple_id: number;
  author_id: number;
  title: string;
  message: string | null;
  photo_url: string | null;
  opens_at: string;
  opened: boolean;
  opened_at: string | null;
  created_at: string;
}

// XP / Levels
export interface CoupleXP {
  total_xp: number;
  level: number;
  xp_for_current_level: number;
  xp_for_next_level: number;
  progress_percent: number;
}

export interface XPLogEntry {
  id: number;
  user_id: number;
  action: string;
  xp_amount: number;
  created_at: string;
}

// Chat
export interface ChatMessage {
  id: number;
  couple_id: number;
  sender_id: number;
  sender_name: string;
  text: string | null;
  image_url: string | null;
  reply_to_id: number | null;
  reply_preview: string | null;
  reactions: Record<string, number[]>;
  pinned: boolean;
  created_at: string;
}

// Movie Picker
export interface MoviePick {
  id: number;
  couple_id: number;
  title: string;
  year: number | null;
  category: string;
  media_type: "movie" | "series";
  poster_emoji: string;
  is_preset: boolean;
  watched: boolean;
  watched_at: string | null;
  rating: number | null;
  added_by: number | null;
  created_at: string;
}

// Song Picker
export interface SongPick {
  id: number;
  couple_id: number;
  title: string;
  artist: string;
  year: number | null;
  genre: string;
  mood: string;
  is_preset: boolean;
  listened: boolean;
  listened_at: string | null;
  rating: number | null;
  added_by: number | null;
  created_at: string;
}

// Shared Calendar
export interface SharedCalendarEvent {
  id: number;
  couple_id: number;
  added_by: number;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  category: string;
  icon: string;
  recurring: string | null;
  created_at: string;
}
