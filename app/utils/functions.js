const mongoose = require("mongoose");
const emailValidator = require("email-validator");
const JWT = require("jsonwebtoken");
const { UserModel } = require("../models/user");
const createError = require("http-errors");
const cookieParser = require("cookie-parser");
const { intervalToDuration } = require("date-fns");

function deleteInvalidPropertyInObject(data = {}, blackListFields = []) {
  let nullishData = ["", " ", null, undefined];
  Object.keys(data).forEach((key) => {
    if (blackListFields.includes(key)) delete data[key];
    if (typeof data[key] == "string") data[key] = data[key].trim();
    if (Array.isArray(data[key]) && data[key].length > 0)
      data[key] = data[key].map((item) => item.trim());
    if (Array.isArray(data[key]) && data[key].length == 0) delete data[key];
    if (nullishData.includes(data[key])) delete data[key];
  });
}

function copyObject(object) {
  return JSON.parse(JSON.stringify(object));
}

function checkEmail(email) {
  return { isEmail: emailValidator.validate(email), email };
}

function toPersianDigits(n) {
  const farsiDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return n.toString().replace(/\d/g, (x) => farsiDigits[parseInt(x)]);
}

function generateToken(user, expiresIn, secret) {
  return new Promise((resolve, reject) => {
    const payload = { _id: user._id };
    const options = { expiresIn };
    JWT.sign(payload, secret || process.env.TOKEN_SECRET_KEY, options, (err, token) => {
      if (err) reject(createError.InternalServerError("Server error"));
      resolve(token);
    });
  });
}

async function setAccessToken(res, user) {
  const cookieOptions = {
    maxAge: 1000 * 60 * 60 * 24 * 365, 
    httpOnly: true,
    signed: true,
    sameSite: "None",   
    secure: true,       
    domain: ".blog-app.online", 
  };

  const token = await generateToken(user, "1d", process.env.ACCESS_TOKEN_SECRET_KEY);
  res.cookie("accessToken", token, cookieOptions);
}

async function setRefreshToken(res, user) {
  const cookieOptions = {
    maxAge: 1000 * 60 * 60 * 24 * 365, 
    httpOnly: true,
    signed: true,
    sameSite: "None",   
    secure: true,       
    domain: ".blog-app.online", 
  };

  const token = await generateToken(user, "1y", process.env.REFRESH_TOKEN_SECRET_KEY);
  res.cookie("refreshToken", token, cookieOptions);
}

function VerifyRefreshToken(req) {
  const refreshToken = req.signedCookies["refreshToken"];
  if (!refreshToken) throw createError.Unauthorized("Please log in");

  const token = cookieParser.signedCookie(
    refreshToken,
    process.env.COOKIE_PARSER_SECRET_KEY
  );

  return new Promise((resolve, reject) => {
    JWT.verify(token, process.env.REFRESH_TOKEN_SECRET_KEY, async (err, payload) => {
      try {
        if (err) reject(createError.Unauthorized("Please log in"));
        const { _id } = payload;
        const user = await UserModel.findById(_id, { password: 0, otp: 0, resetLink: 0 });
        if (!user) reject(createError.Unauthorized("User not found"));
        resolve(_id);
      } catch (error) {
        reject(createError.Unauthorized("User not found"));
      }
    });
  });
}

async function checkPostExist(id) {
  const { PostModel } = require("../models/post");
  if (!mongoose.isValidObjectId(id))
    throw createError.BadRequest("Invalid post ID");
  const post = await PostModel.findById(id);
  if (!post) throw createError.NotFound("Post not found");
  return post;
}

function calculateDateDuration(endTime) {
  const { years, months, days, hours, minutes, seconds } = intervalToDuration({
    start: new Date(),
    end: new Date(endTime),
  });

  if (years) return `${toPersianNumbers(years)} years ago`;
  if (months) return `${toPersianNumbers(months)} months ago`;
  if (days && days > 7) return `${toPersianNumbers((days / 7).toFixed(0))} weeks ago`;
  if (days) return `${toPersianNumbers(days)} days ago`;
  if (hours) return `${toPersianNumbers(hours)} hours ago`;
  if (minutes) return `${toPersianNumbers(minutes)} minutes ago`;
  if (seconds) return `${toPersianNumbers(seconds)} seconds ago`;
}

const farsiDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
function toPersianNumbers(n) {
  return n.toString().replace(/\d/g, (x) => farsiDigits[parseInt(x)]);
}

module.exports = {
  calculateDateDuration,
  checkEmail,
  toPersianDigits,
  generateToken,
  setAccessToken,
  setRefreshToken,
  VerifyRefreshToken,
  copyObject,
  deleteInvalidPropertyInObject,
  checkPostExist,
};
