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
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.warn("CINETILE ARCHIVE: Discovery system waiting for API_KEY environment variable.");
      return null;
    }
    
    try {
      return new GoogleGenAI({ apiKey });
    } catch (e) {
      console.error("CINETILE ARCHIVE: Failed to initialize GoogleGenAI client.", e);
      return null;
    }
  }

  static async getMovies(genre: string, year: string, page: number): Promise<MovieResponse> {
    const ai = this.getClient();
    
    if (!ai) {
      throw new Error("Discovery Archive is currently locked. Please verify system configuration.");
    }

    const prompt = `Return a JSON array of 40 unique IMDb IDs (e.g. 'tt0133093') for ${genre} movies released in ${year}. 
    Focus on well-known titles with high-quality posters. Page number: ${page}.
    Important: Return ONLY the raw JSON array string.`;

    try {
      const response = await ai.models.generateContent({
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

      const cleanText = response.text?.trim() || "[]";
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
          const res = await fetch(`https://www.omdbapi.com/?i=${id}&apikey=${OMDB_API_KEY}`);
          const data = await res.json();
          if (data.Response === "True" && data.Poster && data.Poster !== "N/A" && data.Poster.startsWith('http')) {
            const movie = {
              id: data.imdbID,
              title: data.Title,
              year: data.Year,
              genre: data.Genre,
              description: data.Plot,
              posterUrl: data.Poster
            };
            omdbCache.set(id, movie);
            return movie;
          }
          return null;
        } catch (e) { return null; }
      });

      const allResults = await Promise.all(movieDataPromises);
      const uniqueMovies = Array.from(new Map(
        allResults.filter((m): m is Movie => m !== null).map(m => [m.id, m])
      ).values()).slice(0, 12);

      return {
        movies: uniqueMovies,
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