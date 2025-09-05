const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const allRoutes = require("./router/router");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const createError = require("http-errors");
const path = require("path");

dotenv.config();

class Application {
  #app = express();
  #PORT = process.env.PORT || 5000;
  #DB_URI = process.env.MONGODB_URI;

  constructor() {
    this.createServer();
    this.connectToDB();
    this.configServer();
    this.initClientSession();
    this.configRoutes();
    this.errorHandling();
  }

  createServer() {
    this.#app.listen(this.#PORT, () =>
      console.log(`Server is running on port ${this.#PORT}`)
    );
  }

  connectToDB() {
    mongoose.set("strictQuery", true);
    mongoose.connect(
      this.#DB_URI,
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        authSource: "admin",
      },
      (err) => {
        if (!err) {
          console.log("MongoDB connected successfully!");
        } else {
          console.error("Failed to connect to MongoDB:", err);
        }
      }
    );
  }

  configServer() {
    // تنظیم CORS قبل از هر روت
    const corsOptions = {
      origin: [
        "http://localhost:3000", // برای توسعه لوکال
        "https://blog-app.online", // فرانت روی Render
      ],
      credentials: true, // اجازه ارسال کوکی‌ها
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization"],
    };

    this.#app.use(cors(corsOptions));
    this.#app.use(express.json());
    this.#app.use(express.urlencoded({ extended: true }));
    this.#app.use(express.static(path.join(__dirname, "..")));
  }

  initClientSession() {
    this.#app.use(cookieParser(process.env.COOKIE_PARSER_SECRET_KEY));
  }

  configRoutes() {
    this.#app.use("/api", allRoutes);
  }

  errorHandling() {
    // Handle 404
    this.#app.use((req, res, next) => {
      next(createError.NotFound("Requested resource not found"));
    });

    // Handle all errors
    this.#app.use((error, req, res, next) => {
      const serverError = createError.InternalServerError();
      const statusCode = error.status || serverError.status;
      const message = error.message || serverError.message;
      return res.status(statusCode).json({
        statusCode,
        message,
      });
    });
  }
}

module.exports = Application;
