import { Movie, Genre, GENRE_MAP } from "../types";

const TMDB_API_KEY = "b14f24c2e189996413174a9e9d3fa115"; 
const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p/original"; 
const THUMB_BASE = "https://image.tmdb.org/t/p/w500";

export interface MovieResponse {
  movies: Movie[];
  totalPages: number;
}

export class MovieService {
  /**
   * Fetches movies using TMDB's discover API with pagination.
   */
  static async getMovies(selectedGenre: Genre, year: string, page: number = 1): Promise<MovieResponse> {
    try {
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;
      
      const params: Record<string, string> = {
        api_key: TMDB_API_KEY,
        'primary_release_date.gte': startDate,
        'primary_release_date.lte': endDate,
        include_adult: 'false',
        language: 'en-US',
        page: page.toString()
      };

      if (selectedGenre === 'All') {
        // When pulling all genres, we prioritize the highest rated movies
        // We add a vote_count threshold to filter out movies with very few ratings
        params.sort_by = 'vote_average.desc';
        params['vote_count.gte'] = '500'; 
      } else {
        const genreId = GENRE_MAP[selectedGenre as Exclude<Genre, 'All'>];
        params.with_genres = genreId.toString();
        params.sort_by = 'popularity.desc';
      }

      const queryParams = new URLSearchParams(params);
      const url = `${BASE_URL}/discover/movie?${queryParams.toString()}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      const data = await response.json();

      if (!data.results || data.results.length === 0) {
        return { movies: [], totalPages: 0 };
      }

      return { 
        movies: this.transformResults(data.results, selectedGenre),
        totalPages: data.total_pages
      };
    } catch (error) {
      console.error("Discovery Error:", error);
      throw error;
    }
  }

  private static transformResults(results: any[], selectedGenre: string): Movie[] {
    return results
      .filter((item: any) => item.poster_path)
      .map((item: any) => ({
        id: item.id.toString(),
        title: item.title,
        year: item.release_date ? item.release_date.split('-')[0] : 'N/A',
        genre: selectedGenre,
        description: item.overview || "No description provided.",
        posterUrl: `${IMAGE_BASE}${item.poster_path}`,
        thumbUrl: `${THUMB_BASE}${item.poster_path}`,
        backdropUrl: item.backdrop_path ? `${IMAGE_BASE}${item.backdrop_path}` : undefined,
        rating: item.vote_average ? item.vote_average.toFixed(1) : null
      }));
  }
}