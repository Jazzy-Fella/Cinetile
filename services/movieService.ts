
import { Movie, Genre, GENRE_MAP } from "../types";

const TMDB_API_KEY = "b14f24c2e189996413174a9e9d3fa115"; 
const OMDB_API_KEY = "42ebe43b";
const BASE_URL = "https://api.themoviedb.org/3";
const OMDB_URL = "https://www.omdbapi.com/";
const IMAGE_BASE = "https://image.tmdb.org/t/p/original"; 
const THUMB_BASE = "https://image.tmdb.org/t/p/w500";

export interface MovieResponse {
  movies: Movie[];
  totalPages: number;
}

export class MovieService {
  /**
   * Fetches movies using TMDB's discover API, then enriches them with OMDb/IMDb data
   * and sorts them by IMDb rating/popularity.
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
        'with_runtime.gte': '60',
      };

      if (selectedGenre === 'All') {
        params.sort_by = 'popularity.desc';
      } else {
        const genreId = GENRE_MAP[selectedGenre as Exclude<Genre, 'All'>];
        params.with_genres = genreId.toString();
        params.sort_by = 'popularity.desc';
      }

      const queryParams = new URLSearchParams(params);
      const url = `${BASE_URL}/discover/movie?${queryParams.toString()}`;
      const response = await fetch(url);
      
      if (!response.ok) throw new Error(`TMDB Error: ${response.status}`);
      const data = await response.json();

      if (!data.results || data.results.length === 0) {
        return { movies: [], totalPages: 0 };
      }

      // 1. Initial filter for specific language requirements
      const filteredResults = data.results.filter((item: any) => {
        if (!item.poster_path || item.adult) return false;
        
        const lang = item.original_language;
        const isActionGenre = selectedGenre === 'Action';

        if (isActionGenre) {
          // ACTION GENRE: Cantonese (cn), Mandarin (zh), English (en), Italian (it), and French (fr)
          return ['cn', 'zh', 'en', 'it', 'fr'].includes(lang);
        } else {
          // OTHER GENRES: ONLY English (en), Italian (it), and French (fr)
          return ['en', 'it', 'fr'].includes(lang);
        }
      });

      // 2. Enrich with OMDb data (IMDb Ratings & Votes)
      const enrichedMovies = await Promise.all(
        filteredResults.map(async (tmdbMovie: any) => {
          try {
            // Get IMDb ID first from TMDB
            const extUrl = `${BASE_URL}/movie/${tmdbMovie.id}/external_ids?api_key=${TMDB_API_KEY}`;
            const extRes = await fetch(extUrl);
            const extData = await extRes.json();
            const imdbId = extData.imdb_id;

            if (!imdbId) return this.transformTmdbOnly(tmdbMovie, selectedGenre);

            // Fetch from OMDb using provided key: 42ebe43b
            const omdbRes = await fetch(`${OMDB_URL}?i=${imdbId}&apikey=${OMDB_API_KEY}`);
            const omdbData = await omdbRes.json();

            if (omdbData.Response === "False") return this.transformTmdbOnly(tmdbMovie, selectedGenre);

            return {
              id: tmdbMovie.id.toString(),
              title: tmdbMovie.title,
              year: tmdbMovie.release_date ? tmdbMovie.release_date.split('-')[0] : 'N/A',
              genre: selectedGenre,
              description: tmdbMovie.overview || "No description provided.",
              posterUrl: `${IMAGE_BASE}${tmdbMovie.poster_path}`,
              thumbUrl: `${THUMB_BASE}${tmdbMovie.poster_path}`,
              backdropUrl: tmdbMovie.backdrop_path ? `${IMAGE_BASE}${tmdbMovie.backdrop_path}` : undefined,
              rating: omdbData.imdbRating && omdbData.imdbRating !== 'N/A' ? omdbData.imdbRating : (tmdbMovie.vote_average?.toFixed(1) || null),
              imdbVotes: omdbData.imdbVotes ? parseInt(omdbData.imdbVotes.replace(/,/g, '')) : 0,
              originalLanguage: tmdbMovie.original_language
            };
          } catch (e) {
            return this.transformTmdbOnly(tmdbMovie, selectedGenre);
          }
        })
      );

      // 3. Rank by IMDb Rating Descending, then by Votes (Popularity)
      const rankedMovies = enrichedMovies.sort((a, b) => {
        const ratingA = parseFloat(a.rating || '0');
        const ratingB = parseFloat(b.rating || '0');
        if (ratingB !== ratingA) return ratingB - ratingA;
        // Secondary sort by votes
        return (b.imdbVotes || 0) - (a.imdbVotes || 0);
      });

      return { 
        movies: rankedMovies,
        totalPages: data.total_pages
      };
    } catch (error) {
      console.error("Discovery Error:", error);
      throw error;
    }
  }

  private static transformTmdbOnly(item: any, selectedGenre: string): Movie {
    return {
      id: item.id.toString(),
      title: item.title,
      year: item.release_date ? item.release_date.split('-')[0] : 'N/A',
      genre: selectedGenre,
      description: item.overview || "No description provided.",
      posterUrl: `${IMAGE_BASE}${item.poster_path}`,
      thumbUrl: `${THUMB_BASE}${item.poster_path}`,
      backdropUrl: item.backdrop_path ? `${IMAGE_BASE}${item.backdrop_path}` : undefined,
      rating: item.vote_average ? item.vote_average.toFixed(1) : null,
      imdbVotes: item.vote_count || 0,
      originalLanguage: item.original_language
    };
  }

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
      return { director: 'N/A', cast: [] };
    }
  }

  static async getTrailerKey(movieId: string): Promise<string | null> {
    try {
      const url = `${BASE_URL}/movie/${movieId}/videos?api_key=${TMDB_API_KEY}`;
      const response = await fetch(url);
      if (!response.ok) return null;
      const data = await response.json();
      const trailer = data.results?.find((v: any) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'));
      return trailer?.key || null;
    } catch (error) {
      return null;
    }
  }
}
