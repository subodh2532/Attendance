import { auth } from "@clerk/nextjs/server";
import { AttendanceDashboard } from "../components/attendance-dashboard";
import { getDashboardData } from "../lib/attendance";

export default async function HomePage() {
  const { userId } = await auth();

  if (!userId) {
    return (
      <main className="page-content">
        <section className="hero-card">
          <p className="eyebrow">Clerk + Supabase</p>
          <h1>Track student attendance with secure sign-in and cloud storage.</h1>
          <p className="hero-copy">
            Sign up from the top-right corner to create your first account. Once you are
            signed in, you can add students, record IN and OUT times, and keep your
            attendance history in Supabase.
          </p>
        </section>
      </main>
    );
  }

  const initialData = await getDashboardData(userId);

  return (
    <main className="page-content">
      <AttendanceDashboard initialData={initialData} />
    </main>
  );
}
