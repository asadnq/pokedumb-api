"use strict";

const Database = use("Database");
const { validate } = use("Validator");

const User = use("App/Models/User");

class AuthController {
  async register({ auth, request, response }) {
    try {
      const rules = {
        username: "required|min:6|max:24",
        email: "required|email|unique:users,email",
        password: "required|min:8|max:30"
      };

      const validation = await validate(request.all(), rules);

      if (validation.fails()) {
        return response.json({
          message: validation.messages()
        });
      } else {
        const { username, email, password } = request.post();

        const user = await User.create({ username, email, password });

        const accessToken = await auth.generate(user);
        return response.json({
          user,
          access_token: accessToken
        });
      }
    } catch (err) {
      return response.json(err);
    }
  }

  async login({ auth, request, response }) {
    try {
      const { email, password } = request.all();

      if (await auth.attempt(email, password)) {
        const user = await User.findBy("email", email);

        const accessToken = await auth.generate(user);

        return response.json({
          user,
          access_token: accessToken
        });
      }
    } catch (err) {
      return response.status(401).json(err);
    }
  }
}

module.exports = AuthController;
