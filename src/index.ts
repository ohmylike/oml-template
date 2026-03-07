import { Hono } from "hono";

type Bindings = {
  CACHE: KVNamespace;
  UPLOADS: R2Bucket;
  ENVIRONMENT: string;
  SERVICE_NAME: string;
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/", (c) => {
  return c.json({
    service: c.env.SERVICE_NAME,
    environment: c.env.ENVIRONMENT,
  });
});

app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

export default app;
