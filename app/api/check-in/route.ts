import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { checkIn } from "../../../lib/attendance";

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { studentId?: string };
    const record = await checkIn(userId, body.studentId ?? "");
    return NextResponse.json({
      message: "Check-in recorded successfully.",
      record
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to check in." },
      { status: 400 }
    );
  }
}
