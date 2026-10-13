export function GET() {
  return Response.json({
    status: "ok",
    environment: process.env.VERCEL_ENV ?? "development",
  });
}
