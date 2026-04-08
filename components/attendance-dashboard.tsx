"use client";

import { useEffect, useState } from "react";
import type { DashboardData, Student } from "../types";

type MessageState = {
  type: "success" | "error";
  text: string;
} | null;

type AttendanceDashboardProps = {
  initialData: DashboardData;
};

export function AttendanceDashboard({
  initialData
}: AttendanceDashboardProps) {
  const [students, setStudents] = useState(initialData.students);
  const [attendance, setAttendance] = useState(initialData.attendance);
  const [todayAttendance, setTodayAttendance] = useState(initialData.todayAttendance);
  const [studentName, setStudentName] = useState("");
  const [message, setMessage] = useState<MessageState>(null);
  const [busyStudentId, setBusyStudentId] = useState<string | null>(null);
  const [isAddingStudent, setIsAddingStudent] = useState(false);

  async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json"
      },
      ...options
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Something went wrong.");
    }

    return data as T;
  }

  async function refreshDashboard() {
    const [studentsResponse, attendanceResponse] = await Promise.all([
      requestJson<Student[]>("/api/students"),
      requestJson<{ attendance: DashboardData["attendance"]; todayAttendance: DashboardData["todayAttendance"] }>(
        "/api/attendance"
      )
    ]);

    setStudents(studentsResponse);
    setAttendance(attendanceResponse.attendance);
    setTodayAttendance(attendanceResponse.todayAttendance);
  }

  useEffect(() => {
    if (!message) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setMessage(null);
    }, 3200);

    return () => window.clearTimeout(timeoutId);
  }, [message]);

  function showMessage(type: "success" | "error", text: string) {
    setMessage({ type, text });
  }

  async function handleAddStudent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!studentName.trim()) {
      showMessage("error", "Please enter a student name.");
      return;
    }

    setIsAddingStudent(true);

    try {
      const response = await requestJson<{ message: string }>("/api/students", {
        method: "POST",
        body: JSON.stringify({ name: studentName.trim() })
      });

      setStudentName("");
      await refreshDashboard();
      showMessage("success", response.message);
    } catch (error) {
      showMessage("error", error instanceof Error ? error.message : "Unable to add student.");
    } finally {
      setIsAddingStudent(false);
    }
  }

  async function handleAttendance(studentId: string, action: "in" | "out") {
    setBusyStudentId(studentId);

    try {
      const response = await requestJson<{ message: string }>(
        action === "in" ? "/api/check-in" : "/api/check-out",
        {
          method: "POST",
          body: JSON.stringify({ studentId })
        }
      );

      await refreshDashboard();
      showMessage("success", response.message);
    } catch (error) {
      showMessage(
        "error",
        error instanceof Error ? error.message : "Unable to update attendance."
      );
    } finally {
      setBusyStudentId(null);
    }
  }

  return (
    <div className="dashboard-grid">
      <section className="hero-card dashboard-header">
        <p className="eyebrow">Dashboard</p>
        <h1>Attendance tracking for your classroom or coaching center</h1>
        <p className="section-copy">
          Every student can check in once per day, check out after check-in, and the
          total time is calculated automatically from the recorded timestamps stored in
          Supabase.
        </p>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Add Student</h2>
          <p>Create a student record linked to your signed-in Clerk account.</p>
        </div>

        <form className="form-row" onSubmit={handleAddStudent}>
          <input
            className="text-input"
            type="text"
            value={studentName}
            onChange={(event) => setStudentName(event.target.value)}
            placeholder="Enter student name"
          />
          <button className="primary-button" type="submit" disabled={isAddingStudent}>
            {isAddingStudent ? "Adding..." : "Add Student"}
          </button>
        </form>

        {message ? (
          <div className={`message-box ${message.type}`}>{message.text}</div>
        ) : null}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Students</h2>
          <p>Use the IN and OUT buttons to record attendance.</p>
        </div>

        <div className="student-list">
          {students.length ? (
            students.map((student) => (
              <article key={student.id} className="student-card">
                <div>
                  <h3>{student.name}</h3>
                  <p className="student-meta">ID: {student.id}</p>
                </div>

                <div className="button-row">
                  <button
                    className="action-button"
                    onClick={() => handleAttendance(student.id, "in")}
                    disabled={busyStudentId === student.id}
                  >
                    IN
                  </button>
                  <button
                    className="secondary-button"
                    onClick={() => handleAttendance(student.id, "out")}
                    disabled={busyStudentId === student.id}
                  >
                    OUT
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="empty-state">No students added yet.</div>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Today's Attendance</h2>
          <p>A quick snapshot of today&apos;s check-ins and check-outs.</p>
        </div>

        <AttendanceTable
          rows={todayAttendance}
          emptyText="No attendance records for today."
          showDate={false}
        />
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Attendance History</h2>
          <p>Review all attendance records stored in Supabase.</p>
        </div>

        <AttendanceTable
          rows={attendance}
          emptyText="No attendance history available yet."
          showDate
        />
      </section>
    </div>
  );
}

type AttendanceTableProps = {
  rows: DashboardData["attendance"];
  emptyText: string;
  showDate: boolean;
};

function AttendanceTable({ rows, emptyText, showDate }: AttendanceTableProps) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Student</th>
            {showDate ? <th>Date</th> : null}
            <th>IN</th>
            <th>OUT</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((record) => (
              <tr key={record.id}>
                <td>{record.studentName}</td>
                {showDate ? <td>{record.displayDate}</td> : null}
                <td>{record.inTimeFormatted}</td>
                <td>{record.outTimeFormatted}</td>
                <td>{record.duration}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={showDate ? 5 : 4} className="empty-state">
                {emptyText}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
