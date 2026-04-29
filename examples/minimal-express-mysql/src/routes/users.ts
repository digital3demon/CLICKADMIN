import { Router } from "express";
import { z } from "zod";
import { asyncHandler, ValidationError } from "../errors.js";
import { userService } from "../services/user.service.js";

const router = Router();

const createBodySchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params["id"]);
    if (!Number.isFinite(id) || id <= 0) {
      throw new ValidationError("Некорректный id");
    }
    const user = await userService.getById(id);
    res.json(user);
  }),
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = createBodySchema.safeParse(req.body);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join("; ");
      throw new ValidationError(msg || "Неверные данные");
    }
    const newId = await userService.create(parsed.data);
    res.status(201).json({ id: newId });
  }),
);

export default router;
