import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@insforge/sdk/ssr";

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/admin/login") {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  const { accessToken } = await updateSession({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
    requestCookies: { get: (name: string) => request.cookies.get(name) },
    responseCookies: response.cookies,
  });

  if (!accessToken) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
