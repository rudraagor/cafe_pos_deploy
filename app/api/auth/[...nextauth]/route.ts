import { handlers } from "@/auth";
import type { NextRequest } from "next/server";
import {
  checkRateLimit,
  clientIpFromHeaders,
  rateLimitResponse,
} from "@/lib/security/rate-limit";

export const GET = handlers.GET;

export async function POST(request: NextRequest) {
  const result = checkRateLimit({
    scope: "api:auth:post",
    identifier: clientIpFromHeaders(request.headers),
    limit: 20,
    windowMs: 15 * 60 * 1000,
  });
  if (!result.ok) return rateLimitResponse(result);
  return handlers.POST(request);
}
