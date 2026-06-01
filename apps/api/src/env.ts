import dotenv from "dotenv";
import path from "node:path";

const rootEnvPath = path.resolve(process.cwd(), "../../.env");
dotenv.config({ path: rootEnvPath });
dotenv.config();

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error("Missing required environment variable: " + name);
  }
  return value;
}

export const env = {
  DATABASE_URL: requireEnv("DATABASE_URL", "postgres://wedding:wedding@localhost:5432/wedding"),
  API_HOST: requireEnv("API_HOST", "0.0.0.0"),
  API_PORT: Number(requireEnv("API_PORT", "4000")),
  WEB_ORIGIN: requireEnv("WEB_ORIGIN", "http://localhost:5173"),
  PUBLIC_SITE_URL: requireEnv("PUBLIC_SITE_URL", "http://localhost:5173"),
  COOKIE_SECRET: requireEnv("COOKIE_SECRET", "dev-cookie-secret-change-me")
};
