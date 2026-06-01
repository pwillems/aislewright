import { createServer } from "./server.js";
import { env } from "./env.js";

const server = await createServer();

try {
  await server.listen({ host: env.API_HOST, port: env.API_PORT });
  console.log("Wedding API listening on http://" + env.API_HOST + ":" + env.API_PORT);
} catch (error) {
  server.log.error(error);
  process.exit(1);
}
