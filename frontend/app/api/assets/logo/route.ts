export const runtime = "nodejs";

export async function GET(request: Request) {
  const target = new URL("/gttc-logo.png", request.url);
  return Response.redirect(target, 307);
}
