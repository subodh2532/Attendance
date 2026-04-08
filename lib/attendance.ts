import "server-only";

import { getSupabaseAdminClient } from "./supabase/admin";
import type { AttendanceRecord, DashboardData, Student } from "../types";

const APP_TIMEZONE = process.env.APP_TIMEZONE || "Asia/Kolkata";

type RawStudent = {
  id: string;
  name: string;
  created_at: string;
};

type RawAttendanceRecord = {
  id: string;
  student_id: string;
  attendance_date: string;
  in_time: string;
  out_time: string | null;
};

function getTodayDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE
  }).format(new Date());
}

function formatDisplayDate(dateString: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: APP_TIMEZONE
  }).format(new Date(`${dateString}T00:00:00`));
}

function formatDisplayTime(value: string | null) {
  if (!value) {
    return "Not checked out";
  }

  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: APP_TIMEZONE
  }).format(new Date(value));
}

function formatDuration(inTime: string, outTime: string | null) {
  if (!outTime) {
    return "Pending";
  }

  const totalMinutes = Math.max(
    0,
    Math.floor((new Date(outTime).getTime() - new Date(inTime).getTime()) / 60000)
  );

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
}

async function getStudentMap(userId: string) {
  const students = await getStudents(userId);
  return new Map(students.map((student) => [student.id, student.name]));
}

async function assertStudentBelongsToUser(userId: string, studentId: string) {
  if (!studentId.trim()) {
    throw new Error("Student ID is required.");
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("students")
    .select("id")
    .eq("id", studentId)
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error("Unable to validate the selected student.");
  }

  if (!data) {
    throw new Error("Student not found.");
  }
}

function mapAttendanceRecord(
  record: RawAttendanceRecord,
  studentName: string | undefined
): AttendanceRecord {
  return {
    id: record.id,
    studentId: record.student_id,
    studentName: studentName || "Unknown Student",
    date: record.attendance_date,
    displayDate: formatDisplayDate(record.attendance_date),
    inTime: record.in_time,
    outTime: record.out_time,
    inTimeFormatted: formatDisplayTime(record.in_time),
    outTimeFormatted: formatDisplayTime(record.out_time),
    duration: formatDuration(record.in_time, record.out_time)
  };
}

export async function getStudents(userId: string): Promise<Student[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("students")
    .select("id, name, created_at")
    .eq("clerk_user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Unable to load students from Supabase.");
  }

  return (data as RawStudent[]).map((student) => ({
    id: student.id,
    name: student.name,
    createdAt: student.created_at
  }));
}

export async function addStudent(userId: string, name: string): Promise<Student> {
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error("Student name is required.");
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("students")
    .insert({
      clerk_user_id: userId,
      name: trimmedName
    })
    .select("id, name, created_at")
    .single();

  if (error) {
    throw new Error("Unable to add the student to Supabase.");
  }

  const student = data as RawStudent;

  return {
    id: student.id,
    name: student.name,
    createdAt: student.created_at
  };
}

export async function getAttendance(userId: string): Promise<AttendanceRecord[]> {
  const supabase = getSupabaseAdminClient();
  const [studentMap, attendanceResponse] = await Promise.all([
    getStudentMap(userId),
    supabase
      .from("attendance_records")
      .select("id, student_id, attendance_date, in_time, out_time")
      .eq("clerk_user_id", userId)
      .order("attendance_date", { ascending: false })
      .order("in_time", { ascending: false })
  ]);

  if (attendanceResponse.error) {
    throw new Error("Unable to load attendance records from Supabase.");
  }

  return (attendanceResponse.data as RawAttendanceRecord[]).map((record) =>
    mapAttendanceRecord(record, studentMap.get(record.student_id))
  );
}

export async function getTodayAttendance(userId: string) {
  const today = getTodayDateKey();
  const attendance = await getAttendance(userId);
  return attendance.filter((record) => record.date === today);
}

export async function checkIn(userId: string, studentId: string) {
  await assertStudentBelongsToUser(userId, studentId);

  const supabase = getSupabaseAdminClient();
  const today = getTodayDateKey();
  const { data: existingRecord, error: existingError } = await supabase
    .from("attendance_records")
    .select("id")
    .eq("clerk_user_id", userId)
    .eq("student_id", studentId)
    .eq("attendance_date", today)
    .maybeSingle();

  if (existingError) {
    throw new Error("Unable to verify today's attendance.");
  }

  if (existingRecord) {
    throw new Error("Already checked in for today.");
  }

  const { data, error } = await supabase
    .from("attendance_records")
    .insert({
      clerk_user_id: userId,
      student_id: studentId,
      attendance_date: today,
      in_time: new Date().toISOString()
    })
    .select("id, student_id, attendance_date, in_time, out_time")
    .single();

  if (error) {
    throw new Error("Unable to store the check-in in Supabase.");
  }

  const studentMap = await getStudentMap(userId);
  return mapAttendanceRecord(data as RawAttendanceRecord, studentMap.get(studentId));
}

export async function checkOut(userId: string, studentId: string) {
  await assertStudentBelongsToUser(userId, studentId);

  const supabase = getSupabaseAdminClient();
  const today = getTodayDateKey();
  const { data: existingRecord, error: existingError } = await supabase
    .from("attendance_records")
    .select("id, student_id, attendance_date, in_time, out_time")
    .eq("clerk_user_id", userId)
    .eq("student_id", studentId)
    .eq("attendance_date", today)
    .maybeSingle();

  if (existingError) {
    throw new Error("Unable to verify today's attendance.");
  }

  if (!existingRecord) {
    throw new Error("Check-in is required before check-out.");
  }

  if (existingRecord.out_time) {
    throw new Error("Already checked out for today.");
  }

  const { data, error } = await supabase
    .from("attendance_records")
    .update({
      out_time: new Date().toISOString()
    })
    .eq("id", existingRecord.id)
    .select("id, student_id, attendance_date, in_time, out_time")
    .single();

  if (error) {
    throw new Error("Unable to store the check-out in Supabase.");
  }

  const studentMap = await getStudentMap(userId);
  return mapAttendanceRecord(data as RawAttendanceRecord, studentMap.get(studentId));
}

export async function getDashboardData(userId: string): Promise<DashboardData> {
  const [students, attendance] = await Promise.all([getStudents(userId), getAttendance(userId)]);
  const today = getTodayDateKey();

  return {
    students,
    attendance,
    todayAttendance: attendance.filter((record) => record.date === today)
  };
}
