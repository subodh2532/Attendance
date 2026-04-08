import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getAttendance, getTodayAttendance } from "../../../lib/attendance";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const [attendance, todayAttendance] = await Promise.all([
    getAttendance(userId),
    getTodayAttendance(userId)
  ]);

  return NextResponse.json({
    attendance,
    todayAttendance
  });
}
