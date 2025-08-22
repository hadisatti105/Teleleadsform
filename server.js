import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import morgan from "morgan";

const app = express();
const PORT = process.env.PORT || 10000;

// ✅ Allow all origins (for now)
app.use(cors());

// If you want to restrict:
// app.use(cors({ origin: "https://teleleadsform.onrender.com" }));

app.use(bodyParser.json());
app.use(morgan("dev"));

// Serve static files (your frontend)
app.use(express.static("public"));

// API route
app.post("/api/lead", (req, res) => {
  try {
    const { callerid } = req.body;

    if (!callerid) {
      return res.status(400).json({
        success: false,
        message: "Missing callerid field"
      });
    }

    if (!/^\+?[1-9]\d{6,14}$/.test(callerid)) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number",
        phone: callerid
      });
    }

    res.json({
      success: true,
      message: "Lead received successfully",
      data: {
        callerid,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
