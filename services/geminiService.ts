
import { GoogleGenAI, Type } from "@google/genai";
import { Movie } from "../types";

const OMDB_API_KEY = "7b7b5dac";

export interface MovieResponse {
  movies: Movie[];
  sources: { title: string; uri: string }[];
}

// Simple in-memory cache to prevent redundant OMDb lookups across sessions
const omdbCache = new Map<string, Movie>();

export class GeminiService {
  private static ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

  static async getMovies(genre: string, year: string, page: number): Promise<MovieResponse> {
    // Increase pool to 50 to guarantee we find at least 12 valid movies with posters.
    // Use a more specific prompt to ensure variety and quality.
    const prompt = `Return a JSON array of 50 unique, valid IMDb IDs (ttXXXXXXX) for feature films.
    CRITERIA:
    - Release Year: Exactly ${year}
    - Genre: Strictly ${genre}
    - Quality: Focus on theatrical releases or high-profile streaming movies.
    - Diversity: This is request number ${page}. Ensure results are different from previous pages (offset).
    - Image availability: Prioritize movies that are widely known to have high-resolution posters available on OMDb.
    
    ONLY return a JSON array of strings. No markdown, no text.`;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      });

      const cleanText = response.text.trim();
      let imdbIds: string[] = [];
      try {
        imdbIds = JSON.parse(cleanText);
      } catch (e) {
        // Fallback parsing if JSON is slightly malformed
        const match = cleanText.match(/\[.*\]/s);
        if (match) imdbIds = JSON.parse(match[0]);
      }
      
      if (!imdbIds || imdbIds.length === 0) return { movies: [], sources: [] };

      // Parallelize OMDb fetches with a pool limit or high concurrency since these are small requests
      const movieDataPromises = imdbIds.map(async (id) => {
        if (omdbCache.has(id)) return omdbCache.get(id);

        try {
          // Rapid fetch with a slightly longer timeout for reliability
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4000);

          const res = await fetch(`https://www.omdbapi.com/?i=${id}&apikey=${OMDB_API_KEY}`, {
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          
          if (!res.ok) return null;
          const data = await res.json();
          
          if (data.Response !== "True") return null;

          // STRICT POSTER CHECK: No poster = No movie shown
          const poster = data.Poster;
          const hasValidPoster = poster && poster !== "N/A" && poster.startsWith('http');
          if (!hasValidPoster) return null;

          const movie: Movie = {
            id: data.imdbID,
            title: data.Title,
            year: data.Year,
            genre: data.Genre,
            description: data.Plot,
            posterUrl: poster
          };
          
          omdbCache.set(id, movie);
          return movie;
        } catch (e) {
          return null;
        }
      });

      const allResults = await Promise.all(movieDataPromises);
      // Filter out nulls and duplicates (just in case Gemini repeats IDs)
      const uniqueMovies = Array.from(new Map(allResults.filter((m): m is Movie => m !== null).map(m => [m.id, m])).values());
      
      // Take the first 12 to maintain a consistent grid size
      const movies = uniqueMovies.slice(0, 12);

      return {
        movies,
        sources: [
          { title: "OMDb API", uri: "https://www.omdbapi.com/" },
          { title: "IMDb", uri: "https://www.imdb.com/" }
        ]
      };
    } catch (error) {
      console.error("Discovery Failed:", error);
      return { movies: [], sources: [] };
    }
  }
}
