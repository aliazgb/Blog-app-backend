const {
  VerifyRefreshToken,
  setAccessToken,
  setRefreshToken,
} = require("../../utils/functions");
const Controller = require("./controller");
const createError = require("http-errors");
const { StatusCodes: HttpStatus } = require("http-status-codes");
const {
  validateSignupSchema,
  validateSigninSchema,
  validateUpdateProfileSchema,
} = require("../validators/user/auth.schema");
const path = require("path");
const { UserModel } = require("../../models/user");
const bcrypt = require("bcryptjs");

class UserAuthController extends Controller {
  constructor() {
    super();
  }

  async signup(req, res) {
    await validateSignupSchema(req.body);
    const { name, email, password } = req.body;

    // checking if the user already exists in the database
    const existedUser = await this.checkUserExist(email);
    if (existedUser)
      throw createError.BadRequest("A user with this email already exists");

    // HASH PASSWORD
    const salt = await bcrypt.genSaltSync(10);
    const hashedPassword = await bcrypt.hashSync(password, salt);

    const user = await UserModel.create({
      name: name,
      email: email.toLowerCase().trim(),
      password: hashedPassword,
    });

    await setAccessToken(res, user);
    await setRefreshToken(res, user);

    let WELCOME_MESSAGE = `Signup was successful`;

    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data: {
        message: WELCOME_MESSAGE,
        user,
      },
    });
  }

  async signin(req, res) {
    await validateSigninSchema(req.body);
    const { email, password } = req.body;

    // checking if the user exists in the database
    const user = await this.checkUserExist(email.toLowerCase());
    if (!user)
      throw createError.BadRequest("No user found with this email");

    // check if password is correct
    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass)
      throw createError.BadRequest("Email or password is incorrect");

    await setAccessToken(res, user);
    await setRefreshToken(res, user);

    let WELCOME_MESSAGE = `Login was successful`;

    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data: {
        message: WELCOME_MESSAGE,
        user,
      },
    });
  }

  async updateProfile(req, res) {
    const { _id: userId } = req.user;
    await validateUpdateProfileSchema(req.body);
    const { name, email } = req.body;

    const updateResult = await UserModel.updateOne(
      { _id: userId },
      {
        $set: { name, email },
      }
    );
    if (!updateResult.modifiedCount === 0)
      throw createError.BadRequest("Profile information was not updated");

    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data: {
        message: "Profile information updated successfully",
      },
    });
  }

  async updateAvatar(req, res) {
    const { _id: userId } = req.user;
    const { fileUploadPath, filename } = req.body;
    const fileAddress = path.join(fileUploadPath, filename);
    const avatarAddress = fileAddress.replace(/\\/g, "/");

    const updateResult = await UserModel.updateOne(
      { _id: userId },
      {
        $set: { avatar: avatarAddress },
      }
    );
    if (!updateResult.modifiedCount === 0)
      throw createError.BadRequest("Avatar upload failed");

    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data: {
        message: "Avatar uploaded successfully",
      },
    });
  }

  async getUserProfile(req, res) {
    const { _id: userId } = req.user;
    const user = await UserModel.findById(userId, { otp: 0 });

    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data: {
        user,
      },
    });
  }

  async getAllUsers(req, res) {
    const users = await UserModel.find();

    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data: {
        users,
      },
    });
  }

  async refreshToken(req, res) {
    const userId = await VerifyRefreshToken(req);
    const user = await UserModel.findById(userId);
    await setAccessToken(res, user);
    await setRefreshToken(res, user);

    return res.status(HttpStatus.OK).json({
      StatusCode: HttpStatus.OK,
      data: {
        user,
      },
    });
  }

  async checkUserExist(email) {
    const user = await UserModel.findOne({ email });
    return user;
  }

  logout(req, res) {
    const cookieOptions = {
      maxAge: 1,
      expires: Date.now(),
      httpOnly: true,
      signed: true,
      sameSite: "Lax",
      secure: true,
      path: "/",
      domain: process.env.DOMAIN,
    };
    res.cookie("accessToken", null, cookieOptions);
    res.cookie("refreshToken", null, cookieOptions);

    return res.status(HttpStatus.OK).json({
      StatusCode: HttpStatus.OK,
      auth: false,
    });
  }
}

module.exports = {
  UserAuthController: new UserAuthController(),
};
