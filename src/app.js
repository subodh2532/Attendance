const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

// Generates a simple unique ID without needing a database yet.
function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function formatDateKey(date) {
  return date.toISOString().split("T")[0];
}

function formatDisplayDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
}

function formatDuration(inTime, outTime) {
  if (!inTime || !outTime) {
    return "Pending";
  }

  const differenceInMs = new Date(outTime) - new Date(inTime);

  if (differenceInMs <= 0) {
    return "0m";
  }

  const totalMinutes = Math.floor(differenceInMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
}

// Repository layer keeps storage details separate so upgrading to MongoDB is easier later.
class StudentRepository {
  constructor() {
    this.students = [];
  }

  getAll() {
    return this.students;
  }

  add(student) {
    this.students.push(student);
    return student;
  }

  findById(studentId) {
    return this.students.find((student) => student.id === studentId);
  }
}

class AttendanceRepository {
  constructor() {
    this.records = [];
  }

  getAll() {
    return this.records;
  }

  add(record) {
    this.records.push(record);
    return record;
  }

  findByStudentAndDate(studentId, date) {
    return this.records.find(
      (record) => record.studentId === studentId && record.date === date
    );
  }
}

class AttendanceService {
  constructor(studentRepository, attendanceRepository) {
    this.studentRepository = studentRepository;
    this.attendanceRepository = attendanceRepository;
  }

  getStudents() {
    return this.studentRepository.getAll();
  }

  addStudent(name) {
    const trimmedName = String(name || "").trim();

    if (!trimmedName) {
      return { error: "Student name is required." };
    }

    const student = {
      id: createId("student"),
      name: trimmedName
    };

    return this.studentRepository.add(student);
  }

  checkIn(studentId) {
    const student = this.studentRepository.findById(studentId);

    if (!student) {
      return { error: "Student not found." };
    }

    const now = new Date();
    const today = formatDateKey(now);
    const existingRecord = this.attendanceRepository.findByStudentAndDate(studentId, today);

    if (existingRecord) {
      return { error: "Student has already checked in today." };
    }

    const record = {
      id: createId("attendance"),
      studentId,
      date: today,
      inTime: now.toISOString(),
      outTime: null
    };

    return this.attendanceRepository.add(record);
  }

  checkOut(studentId) {
    const student = this.studentRepository.findById(studentId);

    if (!student) {
      return { error: "Student not found." };
    }

    const now = new Date();
    const today = formatDateKey(now);
    const record = this.attendanceRepository.findByStudentAndDate(studentId, today);

    if (!record) {
      return { error: "Check-in is required before check-out." };
    }

    if (record.outTime) {
      return { error: "Student has already checked out today." };
    }

    record.outTime = now.toISOString();
    return record;
  }

  getAttendance() {
    const students = this.studentRepository.getAll();
    const studentMap = new Map(students.map((student) => [student.id, student.name]));

    return this.attendanceRepository
      .getAll()
      .map((record) => ({
        ...record,
        studentName: studentMap.get(record.studentId) || "Unknown Student",
        displayDate: formatDisplayDate(record.date),
        inTimeFormatted: formatTime(record.inTime),
        outTimeFormatted: record.outTime ? formatTime(record.outTime) : "Not checked out",
        duration: formatDuration(record.inTime, record.outTime)
      }))
      .sort((first, second) => {
        const secondTime = second.outTime || second.inTime;
        const firstTime = first.outTime || first.inTime;
        return new Date(secondTime) - new Date(firstTime);
      });
  }
}

const studentRepository = new StudentRepository();
const attendanceRepository = new AttendanceRepository();
const attendanceService = new AttendanceService(studentRepository, attendanceRepository);

app.post("/add-student", (req, res) => {
  const result = attendanceService.addStudent(req.body.name);

  if (result.error) {
    return res.status(400).json({ message: result.error });
  }

  return res.status(201).json({
    message: "Student added successfully.",
    student: result
  });
});

app.get("/students", (req, res) => {
  res.json(attendanceService.getStudents());
});

app.post("/check-in", (req, res) => {
  const result = attendanceService.checkIn(req.body.studentId);

  if (result.error) {
    return res.status(400).json({ message: result.error });
  }

  return res.status(200).json({
    message: "Check-in recorded successfully.",
    record: result
  });
});

app.post("/check-out", (req, res) => {
  const result = attendanceService.checkOut(req.body.studentId);

  if (result.error) {
    return res.status(400).json({ message: result.error });
  }

  return res.status(200).json({
    message: "Check-out recorded successfully.",
    record: result
  });
});

app.get("/attendance", (req, res) => {
  res.json(attendanceService.getAttendance());
});

module.exports = {
  app,
  PORT
};
