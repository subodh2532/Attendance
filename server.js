const { app, PORT } = require("./src/app");

app.listen(PORT, () => {
  console.log(`Attendance Tracker is running at http://localhost:${PORT}`);
});
