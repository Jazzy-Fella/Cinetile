
import { GoogleGenAI, Type } from "@google/genai";
import { Movie } from "../types";

const OMDB_API_KEY = "7b7b5dac";

export interface MovieResponse {
  movies: Movie[];
  sources: { title: string; uri: string }[];
}

// In-memory cache for the session
const omdbCache = new Map<string, Movie>();

export class GeminiService {
  // We initialize the AI client inside the method to ensure process.env is accessed 
  // only when needed, reducing initialization crashes.
  private static getClient() {
    // Accessing process.env.API_KEY directly as per requirements.
    // If this fails on your deployment, ensure your build tool or platform 
    // is correctly injecting environment variables into the client bundle.
    try {
      return new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    } catch (e) {
      console.error("Gemini SDK Initialization failed:", e);
      return null;
    }
  }

  static async getMovies(genre: string, year: string, page: number): Promise<MovieResponse> {
    const ai = this.getClient();
    if (!ai) return { movies: [], sources: [] };

    // We reduce the pool to 30. It's enough to find 12 with posters and much faster to fetch.
    // We strictly instruct Gemini to provide a specific "offset" for the page.
    const prompt = `Return a JSON array of 30 unique IMDb IDs (ttXXXXXXX) for ${genre} films released in ${year}.
    This is page ${page} of the results. DO NOT return movies from previous pages.
    Return ONLY a JSON array of strings.`;

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

      // Optimized parallel fetching with a strict 3-second timeout per movie
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
          
          if (data.Response !== "True") return null;

          // STRICT POSTER CHECK: If 'N/A' or missing, return null so it's filtered out.
          const poster = data.Poster;
          if (!poster || poster === "N/A" || !poster.startsWith('http')) return null;

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
      
      // Return 12 movies to ensure a full grid row
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
