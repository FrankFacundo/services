import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/_next")) {
    return NextResponse.next();
  }
  if (request.nextUrl.pathname.startsWith("/favicon.ico")) {
    return NextResponse.next();
  }
  // const allCookies = request.cookies.getAll();
  // console.log(allCookies); // => [{ name: 'nextjs', value: 'fast' }]

  const hasToken = request.cookies.has("token"); // => true
  // console.log(request.url);
  // console.log(request.nextUrl);
  // console.log(request.nextUrl.pathname);
  if (!hasToken && request.nextUrl.pathname !== "/login") {
    // If no token, redirect to "/login"
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // request.cookies.delete("nextjs");
  // request.cookies.has("nextjs"); // => false

  // Setting cookies on the response using the `ResponseCookies` API
  const response = NextResponse.next();
  //   response.cookies.set("vercel", "fast");
  //   response.cookies.set({
  //     name: "vercel",
  //     value: "fast",
  //     path: "/",
  //   });
  //   cookie = response.cookies.get("vercel");
  //   console.log(cookie); // => { name: 'vercel', value: 'fast', Path: '/' }
  // The outgoing response will have a `Set-Cookie:vercel=fast;path=/` header.

  return response;
}
