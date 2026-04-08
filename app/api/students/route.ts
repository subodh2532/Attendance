import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { addStudent, getStudents } from "../../../lib/attendance";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const students = await getStudents(userId);
  return NextResponse.json(students);
}

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { name?: string };
    const student = await addStudent(userId, body.name ?? "");
    return NextResponse.json(
      {
        message: "Student added successfully.",
        student
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to add student." },
      { status: 400 }
    );
  }
}
