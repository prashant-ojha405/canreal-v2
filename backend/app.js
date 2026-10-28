require('dotenv').config();

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const cookieParser = require('cookie-parser');
const path = require("path");
const cors = require('cors');


const MONGO_URL = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/canreal";

async function main(){
    await mongoose.connect(MONGO_URL);
}

main()
    .then(() =>{
        console.log("connected to Db");
    })
    .catch(err =>{
        console.log(err);
    });


app.set("views", path.join(__dirname, "views"));
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cookieParser());

app.use(express.static('public'));
app.set('view engine', 'ejs');

const port = 3000;

// Allow requests from your React development server
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true, // Needed if your auth uses cookies/sessions
}));


// Browse/Home Route
const homeRoute = require("./routes/home.js");
app.use("/", homeRoute);

// Subject Route
const subjectRoute = require("./routes/subjects.js");
app.use("/subjects", subjectRoute);

//Auth/OTP Route
const authRoutes = require("./routes/auth");
app.use('/auth', authRoutes);

//Document/Upload Route
const uploadRoute = require("./routes/documents");
app.use("/documents", uploadRoute);

//Dashboard Route
const dashboardRoutes = require('./routes/dashboardRoutes');
app.use('/dashboard', dashboardRoutes);


// Add Courses Route
const courseRoutes = require('./routes/courses');
app.use('/courses', courseRoutes);

// In backend/app.js
const reportRoutes = require('./routes/reports'); 
app.use('/reports', reportRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});







// app.js (At the very bottom)

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.message);

  // Catch Multer-specific errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds the 15MB limit.'
      });
    }
    return res.status(400).json({
      success: false,
      message: `File upload error: ${err.message}`
    });
  }

  // Catch general application errors
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});



app.listen(port, ()=>{
    console.log(`server is listening to the port :${port}`);
});