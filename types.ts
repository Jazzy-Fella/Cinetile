
export interface Movie {
  id: string;
  title: string;
  year: string;
  genre: string;
  description: string;
  posterUrl: string;
  thumbUrl: string;
  rating?: string | null;
}

export type Genre = 'Action' | 'Comedy' | 'Drama' | 'Sci-Fi' | 'Horror' | 'Romance' | 'Animation' | 'Documentary' | 'Thriller';

export const GENRE_MAP: Record<Genre, number> = {
  'Action': 28,
  'Comedy': 35,
  'Drama': 18,
  'Sci-Fi': 878,
  'Horror': 27,
  'Romance': 10749,
  'Animation': 16,
  'Documentary': 99,
  'Thriller': 53
};

export const GENRES: Genre[] = Object.keys(GENRE_MAP) as Genre[];

const startYear = 1950;
const endYear = 2024;
export const YEARS: string[] = Array.from(
  { length: endYear - startYear + 1 },
  (_, i) => (endYear - i).toString()
);
