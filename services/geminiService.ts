
import { GoogleGenAI, Type } from "@google/genai";
import { Movie } from "../types";

const OMDB_API_KEY = "7b7b5dac";

export interface MovieResponse {
  movies: Movie[];
  sources: { title: string; uri: string }[];
}

const omdbCache = new Map<string, Movie>();

export class GeminiService {
  private static getClient() {
    try {
      // In some browser environments, accessing process.env directly can throw.
      // We wrap this to prevent a total app crash.
      const apiKey = typeof process !== 'undefined' ? process.env.API_KEY : '';
      if (!apiKey) {
        console.warn("API_KEY not found in process.env");
      }
      return new GoogleGenAI({ apiKey: apiKey || '' });
    } catch (e) {
      console.error("Critical: SDK Initialization failed. Environment might not support process.env.");
      return null;
    }
  }

  static async getMovies(genre: string, year: string, page: number): Promise<MovieResponse> {
    const ai = this.getClient();
    if (!ai) return { movies: [], sources: [] };

    // We use a larger candidate pool (40) to ensure we always find 12 with posters.
    // The prompt explicitly includes the page index to force result variety.
    const prompt = `Task: Provide a JSON array of exactly 40 unique IMDb IDs (starting with 'tt') for real movies.
    Target Genre: ${genre}
    Target Year: ${year}
    Page Index: ${page}
    Constraint: Ensure these are different from the previous results. Focus on films with high-quality poster art available.
    Return ONLY the raw JSON array of strings.`;

    try {
      const result = await ai.models.generateContent({
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

      const cleanText = result.text.trim();
      let imdbIds: string[] = [];
      try {
        imdbIds = JSON.parse(cleanText);
      } catch (e) {
        const match = cleanText.match(/\[.*\]/s);
        if (match) imdbIds = JSON.parse(match[0]);
      }
      
      if (!imdbIds || imdbIds.length === 0) return { movies: [], sources: [] };

      // We use a shorter timeout (2500ms) for OMDb fetches to keep the app responsive.
      const movieDataPromises = imdbIds.map(async (id) => {
        if (omdbCache.has(id)) return omdbCache.get(id);

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2500);

          const res = await fetch(`https://www.omdbapi.com/?i=${id}&apikey=${OMDB_API_KEY}`, {
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          
          if (!res.ok) return null;
          const data = await res.json();
          
          // Strict poster filtering: no poster = no entry
          const poster = data.Poster;
          if (data.Response !== "True" || !poster || poster === "N/A" || !poster.startsWith('http')) {
            return null;
          }

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
      
      // Deduplicate by ID and filter nulls
      const seen = new Set();
      const uniqueMovies = allResults.filter(m => {
        if (!m || seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      }) as Movie[];
      
      // Aim for a full grid row (multiple of 6 or 4)
      const movies = uniqueMovies.slice(0, 12);

      return {
        movies,
        sources: [
          { title: "Gemini 3 Flash", uri: "https://ai.google.dev/" },
          { title: "OMDb API", uri: "https://www.omdbapi.com/" }
        ]
      };
    } catch (error) {
      console.error("Discovery Engine Failure:", error);
      throw error;
    }
  }
}
