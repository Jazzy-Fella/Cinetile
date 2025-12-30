import { Movie, Genre, GENRE_MAP } from "../types";

const TMDB_API_KEY = "b14f24c2e189996413174a9e9d3fa115"; 
const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p/original"; 
const THUMB_BASE = "https://image.tmdb.org/t/p/w500";

/**
 * Strict language whitelist as requested:
 * English (en), Italian (it), French (fr), German (de), 
 * Cantonese (cn), Chinese (zh), Korean (ko), Japanese (ja)
 */
const ALLOWED_LANGS_ARRAY = ["en", "it", "fr", "de", "cn", "zh", "ko", "ja"];

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
        page: page.toString(),
      };

      if (selectedGenre === 'All') {
        params.sort_by = 'vote_average.desc';
        // Keep a reasonable vote count to ensure quality after language filtering
        params['vote_count.gte'] = '100'; 
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

      // Strict enforcement of the whitelist during transformation
      const filteredMovies = this.transformAndFilterResults(data.results, selectedGenre);

      return { 
        movies: filteredMovies,
        totalPages: data.total_pages
      };
    } catch (error) {
      console.error("Discovery Error:", error);
      throw error;
    }
  }

  /**
   * Fetches extended details including director and cast.
   */
  static async getMovieDetails(movieId: string): Promise<{ director: string, cast: string[] }> {
    try {
      const url = `${BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}&append_to_response=credits`;
      const response = await fetch(url);
      if (!response.ok) return { director: 'N/A', cast: [] };
      
      const data = await response.json();
      const director = data.credits?.crew?.find((person: any) => person.job === 'Director')?.name || 'N/A';
      const cast = data.credits?.cast?.slice(0, 15).map((person: any) => person.name) || [];

      return { director, cast };
    } catch (error) {
      console.error("Details Error:", error);
      return { director: 'N/A', cast: [] };
    }
  }

  /**
   * Fetches the official trailer key for a movie.
   */
  static async getTrailerKey(movieId: string): Promise<string | null> {
    try {
      const url = `${BASE_URL}/movie/${movieId}/videos?api_key=${TMDB_API_KEY}`;
      const response = await fetch(url);
      if (!response.ok) return null;
      
      const data = await response.json();
      const trailer = data.results?.find((v: any) => 
        v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
      );

      return trailer?.key || null;
    } catch (error) {
      console.error("Trailer Error:", error);
      return null;
    }
  }

  private static transformAndFilterResults(results: any[], selectedGenre: string): Movie[] {
    return results
      .filter((item: any) => {
        // 1. Core requirement: Must have a poster
        if (!item.poster_path) return false;
        
        // 2. STRICT WHITELIST ENFORCEMENT:
        // Discard any movie whose original_language is not in the allowed 8 languages.
        // This effectively blocks Hindi (hi), Spanish (es), Portuguese (pt), etc.
        if (!ALLOWED_LANGS_ARRAY.includes(item.original_language)) {
          return false;
        }

        return true;
      })
      .map((item: any) => ({
        id: item.id.toString(),
        title: item.title,
        year: item.release_date ? item.release_date.split('-')[0] : 'N/A',
        genre: selectedGenre,
        description: item.overview || "No description provided.",
        posterUrl: `${IMAGE_BASE}${item.poster_path}`,
        thumbUrl: `${THUMB_BASE}${item.poster_path}`,
        backdropUrl: item.backdrop_path ? `${IMAGE_BASE}${item.backdrop_path}` : undefined,
        rating: item.vote_average ? item.vote_average.toFixed(1) : null,
        originalLanguage: item.original_language
      }));
  }
}