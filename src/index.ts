import type { ExecutionContext } from "@cloudflare/workers-types";
import { Router, Method } from "tiny-request-router";
import { pageRoute } from "./routes/page";
import { tableRoute } from "./routes/table";
import { userRoute } from "./routes/user";
import { searchRoute } from "./routes/search";
import { createResponse } from "./response";
import { getCacheKey } from "./get-cache-key";
import * as types from "./api/types";

export interface Env {
  NOTION_PAGE: string;
  NOTION_TOKEN?: string;
}

export type Handler = (
  req: types.HandlerRequest & {
    env: Env;
    notionPages: string[];
    notionToken?: string;
  }
) => Promise<Response> | Response;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
};

const router = new Router<Handler>();

router.options("*", () => new Response(null, { headers: corsHeaders }));
router.get("/v1/page/:pageId", pageRoute);
router.get("/v1/table/:pageId", tableRoute);
router.get("/v1/user/:userId", userRoute);
router.get("/v1/search", searchRoute);

router.get("*", async () =>
  createResponse(
    {
      error: `Route not found!`,
      routes: ["/v1/page/:pageId", "/v1/table/:pageId", "/v1/user/:pageId"],
    },
    {},
    404
  )
);

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const { pathname, searchParams } = url;

    const notionPages = env.NOTION_PAGE.split(",").map(id => id.trim()).filter(Boolean);

    const notionToken =
      env.NOTION_TOKEN ||
      (request.headers.get("Authorization") || "").split("Bearer ")[1] ||
      undefined;

    const match = router.match(request.method as Method, pathname);

    if (!match) {
      return new Response("Endpoint not found.", { status: 404 });
    }

    const cache = (caches as any).default;
    const cacheKey = getCacheKey(request);
    let cachedResponse;

    if (cacheKey) {
      try {
        cachedResponse = await cache.match(cacheKey);
      } catch (err) { }
    }

    const getResponseAndCache = async () => {
      const res = await match.handler({
        request,
        searchParams,
        params: match.params,
        notionToken,
        notionPages,
        env,
      });

      if (cacheKey) {
        ctx.waitUntil(cache.put(cacheKey, res.clone()));
      }

      return res;
    };

    if (cachedResponse) {
      ctx.waitUntil(getResponseAndCache());
      return cachedResponse;
    }

    return getResponseAndCache();
  },
};
