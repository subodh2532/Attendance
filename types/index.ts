export type Student = {
  id: string;
  name: string;
  createdAt: string;
};

export type AttendanceRecord = {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  displayDate: string;
  inTime: string;
  outTime: string | null;
  inTimeFormatted: string;
  outTimeFormatted: string;
  duration: string;
};

export type DashboardData = {
  students: Student[];
  attendance: AttendanceRecord[];
  todayAttendance: AttendanceRecord[];
};
