export interface Movie {
  id: string;
  title: string;
  year: string;
  genre: string;
  description: string;
  posterUrl: string;
  thumbUrl: string;
  backdropUrl?: string;
  rating?: string | null;
  director?: string;
  cast?: string[];
  originalLanguage?: string;
}

export type Genre = 'All' | 'Action' | 'Comedy' | 'Drama' | 'Sci-Fi' | 'Horror' | 'Romance' | 'Animation' | 'Documentary' | 'Thriller' | 'Fantasy' | 'Family' | 'War' | 'Western';

export const GENRE_MAP: Record<Exclude<Genre, 'All'>, number> = {
  'Action': 28,
  'Comedy': 35,
  'Drama': 18,
  'Sci-Fi': 878,
  'Horror': 27,
  'Romance': 10749,
  'Animation': 16,
  'Documentary': 99,
  'Thriller': 53,
  'Fantasy': 14,
  'Family': 10751,
  'War': 10752,
  'Western': 37
};

export const GENRES: Genre[] = ['All', ...Object.keys(GENRE_MAP) as Genre[]];

const startYear = 1950;
const endYear = 2024;
export const YEARS: string[] = Array.from(
  { length: endYear - startYear + 1 },
  (_, i) => (endYear - i).toString()
);