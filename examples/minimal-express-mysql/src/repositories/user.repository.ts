import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool } from "../db.js";
import type { User } from "../models/user.js";

export const userRepository = {
  async findById(id: number): Promise<User | undefined> {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id, name, email FROM users WHERE id = ? LIMIT 1",
      [id],
    );
    const r = rows[0];
    if (!r) return undefined;
    return {
      id: Number(r["id"]),
      name: String(r["name"]),
      email: String(r["email"]),
    };
  },

  async create(data: Omit<User, "id">): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      "INSERT INTO users (name, email) VALUES (?, ?)",
      [data.name, data.email],
    );
    return result.insertId;
  },
};
