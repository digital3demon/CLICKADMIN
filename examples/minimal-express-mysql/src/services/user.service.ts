import { NotFoundError } from "../errors.js";
import type { User } from "../models/user.js";
import { userRepository } from "../repositories/user.repository.js";

export const userService = {
  async getById(id: number): Promise<User> {
    const user = await userRepository.findById(id);
    if (!user) throw new NotFoundError("Пользователь");
    return user;
  },

  async create(data: Omit<User, "id">): Promise<number> {
    return userRepository.create(data);
  },
};
