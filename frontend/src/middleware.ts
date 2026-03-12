import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  const { userId } = await auth();
  const isPublic = isPublicRoute(request);

  // If user is logged in and tries to access sign-in or sign-up, redirect to onboarding or dashboard
  if (userId && (request.nextUrl.pathname.startsWith('/sign-in') || request.nextUrl.pathname.startsWith('/sign-up'))) {
    return NextResponse.redirect(new URL('/onboarding', request.url));
  }

  // Optional: Redirect from root to dashboard if logged in
  if (userId && request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (!isPublic) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
