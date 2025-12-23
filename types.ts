
export interface Movie {
  id: string;
  title: string;
  year: string;
  genre: string;
  description: string;
  posterUrl: string;
}

export type Genre = 'Action' | 'Comedy' | 'Drama' | 'Sci-Fi' | 'Horror' | 'Romance' | 'Animation' | 'Documentary' | 'Thriller';

export const GENRES: Genre[] = [
  'Action', 'Comedy', 'Drama', 'Sci-Fi', 'Horror', 'Romance', 'Animation', 'Documentary', 'Thriller'
];

// Generate years from 2024 down to 1950
const startYear = 1950;
const endYear = 2024;
export const YEARS: string[] = Array.from(
  { length: endYear - startYear + 1 },
  (_, i) => (endYear - i).toString()
);
