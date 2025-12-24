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
    // Accessing process.env.API_KEY directly as required.
    // Ensure it's treated as a string even if the environment variable is missing.
    const apiKey = process.env.API_KEY || '';
    
    if (!apiKey) {
      console.error("CINETILE ERROR: API_KEY is missing from environment variables.");
      return null;
    }
    
    try {
      return new GoogleGenAI({ apiKey });
    } catch (e) {
      console.error("CINETILE ERROR: Failed to initialize GoogleGenAI client.", e);
      return null;
    }
  }

  static async getMovies(genre: string, year: string, page: number): Promise<MovieResponse> {
    const ai = this.getClient();
    if (!ai) {
      throw new Error("API_KEY missing. Please configure it in your Vercel Dashboard Environment Variables.");
    }

    const prompt = `Task: Provide a JSON array of exactly 40 unique IMDb IDs (starting with 'tt') for real movies.
    Target Genre: ${genre}
    Target Year: ${year}
    Page Index: ${page}
    Constraint: Ensure high variety. Only return popular or well-reviewed films.
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

      const movieDataPromises = imdbIds.map(async (id) => {
        if (omdbCache.has(id)) return omdbCache.get(id);

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);

          const res = await fetch(`https://www.omdbapi.com/?i=${id}&apikey=${OMDB_API_KEY}`, {
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          
          if (!res.ok) return null;
          const data = await res.json();
          
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
      const uniqueMovies = Array.from(new Map(allResults.filter((m): m is Movie => m !== null).map(m => [m.id, m])).values());
      const movies = uniqueMovies.slice(0, 12);

      return {
        movies,
        sources: [
          { title: "Gemini 3 Flash", uri: "https://ai.google.dev/" },
          { title: "OMDb API", uri: "https://www.omdbapi.com/" }
        ]
      };
    } catch (error) {
      console.error("CINETILE ERROR: Discovery Engine Failure:", error);
      throw error;
    }
  }
}