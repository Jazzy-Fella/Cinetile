
import { GoogleGenAI, Type } from "@google/genai";
import { Movie } from "../types";

const OMDB_API_KEY = "7b7b5dac";

export interface MovieResponse {
  movies: Movie[];
  sources: { title: string; uri: string }[];
  isPreview?: boolean;
}

const omdbCache = new Map<string, Movie>();

// Curated preview data for when API is not configured
const MOCK_MOVIES: Movie[] = [
  {
    id: "tt0133093",
    title: "The Matrix",
    year: "1999",
    genre: "Action, Sci-Fi",
    description: "A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.",
    posterUrl: "https://m.media-amazon.com/images/M/MV5BN2NmN2VhMTQtMDNiOS00NDlhLTliMjgtODE2ZTY0ODQyNDRhXkEyXkFqcGc@._V1_SX300.jpg"
  },
  {
    id: "tt0468569",
    title: "The Dark Knight",
    year: "2008",
    genre: "Action, Crime, Drama",
    description: "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.",
    posterUrl: "https://m.media-amazon.com/images/M/MV5BMTMxNTMwODM0NF5BMl5BanBnXkFtZTcwODAyMTk2Mw@@._V1_SX300.jpg"
  },
  {
    id: "tt1375666",
    title: "Inception",
    year: "2010",
    genre: "Action, Adventure, Sci-Fi",
    description: "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.",
    posterUrl: "https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTM0Mw@@._V1_SX300.jpg"
  },
  {
    id: "tt0110912",
    title: "Pulp Fiction",
    year: "1994",
    genre: "Crime, Drama",
    description: "The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine in four tales of violence and redemption.",
    posterUrl: "https://m.media-amazon.com/images/M/MV5BYTViYTE3ZGQtNDVmMC00UU4yLTg5Y2ItN2RkMWFkY2I1MGNlXkEyXkFqcGc@._V1_SX300.jpg"
  },
  {
    id: "tt0068646",
    title: "The Godfather",
    year: "1972",
    genre: "Crime, Drama",
    description: "The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son.",
    posterUrl: "https://m.media-amazon.com/images/M/MV5BYTJkNGIyZGUtZDMyNC00Y2SfLTlmZDMtZDU2Y2I2NGZkMjE4XkEyXkFqcGc@._V1_SX300.jpg"
  },
  {
    id: "tt0111161",
    title: "The Shawshank Redemption",
    year: "1994",
    genre: "Drama",
    description: "Over the course of several years, two convicts form a friendship, seeking consolation and, eventually, redemption through basic compassion.",
    posterUrl: "https://m.media-amazon.com/images/M/MV5BMDAyY2FhYjctNDc5OS00MDN2LWFjN2MtMGE4M2FmZGNmZGRjXkEyXkFqcGc@._V1_SX300.jpg"
  }
];

export class GeminiService {
  private static getClient() {
    const apiKey = process.env.API_KEY || '';
    if (!apiKey) return null;
    
    try {
      return new GoogleGenAI({ apiKey });
    } catch (e) {
      console.error("CINETILE ERROR: Client Init Failed", e);
      return null;
    }
  }

  static async getMovies(genre: string, year: string, page: number): Promise<MovieResponse> {
    const ai = this.getClient();
    
    // Graceful Fallback: Provide high-quality preview if no key is found
    if (!ai) {
      console.warn("CINETILE: API_KEY missing. Returning archived preview data.");
      return {
        movies: MOCK_MOVIES,
        sources: [{ title: "Archive Preview (Offline)", uri: "#" }],
        isPreview: true
      };
    }

    const prompt = `Task: Provide a JSON array of exactly 40 unique IMDb IDs (starting with 'tt') for real movies.
    Target Genre: ${genre}
    Target Year: ${year}
    Page Index: ${page}
    Constraint: Only return movies with known high-quality posters. Return ONLY the raw JSON array.`;

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
          const res = await fetch(`https://www.omdbapi.com/?i=${id}&apikey=${OMDB_API_KEY}`);
          const data = await res.json();
          if (data.Response === "True" && data.Poster && data.Poster !== "N/A") {
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
      const uniqueMovies = allResults.filter((m): m is Movie => m !== null).slice(0, 12);

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
