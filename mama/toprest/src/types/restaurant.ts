export interface Restaurant {
  id: number;
  category: string | null;
  recommender: string | null;
  location: string | null;
  name: string;
  genre: string | null;
  notes: string | null;
  link: string | null;
  payco: string | null;
  verified: boolean;
  verifiers: string | null;
  review: string | null;
  solo_possible: string | null;
  created_at: string;
}

export interface RestaurantInput {
  category: string;
  recommender: string;
  location: string;
  name: string;
  genre: string;
  notes: string;
  link: string;
  payco: string;
  verified: boolean;
  verifiers: string;
  review: string;
  solo_possible: string;
}
