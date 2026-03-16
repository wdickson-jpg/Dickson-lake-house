export default function middleware(req) {
  const AUTH_USER = process.env.AUTH_USER || "dickson";
  const AUTH_PASS = process.env.AUTH_PASS || "lakehouse2026";

  const authHeader = req.headers.get("authorization");

  if (authHeader) {
    const [scheme, encoded] = authHeader.split(" ");
    if (scheme === "Basic") {
      const decoded = atob(encoded);
      const [user, pass] = decoded.split(":");
      if (user === AUTH_USER && pass === AUTH_PASS) {
        return; // Allow through
      }
    }
  }

  return new Response("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Dickson Lake House"',
      "Content-Type": "text/plain",
    },
  });
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};
