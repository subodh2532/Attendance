import type { Metadata } from "next";
import Link from "next/link";
import {
  ClerkProvider,
  Show,
  SignInButton,
  SignUpButton,
  UserButton
} from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"]
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"]
});

export const metadata: Metadata = {
  title: "Attendance Tracker",
  description: "Attendance Tracker with Clerk authentication and Supabase storage."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <ClerkProvider>
          <div className="site-shell">
            <header className="topbar">
              <Link href="/" className="brand">
                Attendance Tracker
              </Link>

              <div className="nav-actions">
                <Show when="signed-out">
                  <SignInButton mode="modal">
                    <button className="ghost-button">Sign in</button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="primary-button">Sign up</button>
                  </SignUpButton>
                </Show>

                <Show when="signed-in">
                  <UserButton />
                </Show>
              </div>
            </header>

            {children}
          </div>
        </ClerkProvider>
      </body>
    </html>
  );
}
