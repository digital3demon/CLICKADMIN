/**
 * Смена пароля пользователя с ролью OWNER по email (без повторного seed).
 *
 *   node --env-file=.env scripts/set-owner-password.cjs owner@lab.ru 'НовыйПароль9+'
 *
 * или без пароля в argv (удобнее для сложных символов):
 *   OWNER_EMAIL=owner@lab.ru NEW_PASSWORD='...' node --env-file=.env scripts/set-owner-password.cjs
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const ROUNDS = 11; // как в lib/auth/password.ts

async function main() {
  const emailRaw =
    process.argv[2]?.trim() || process.env.OWNER_EMAIL?.trim() || "";
  const password =
    process.argv[3] ?? process.env.NEW_PASSWORD ?? "";

  const email = emailRaw.toLowerCase();
  if (!email || !email.includes("@")) {
    console.error("Укажите email владельца: argv[1] или OWNER_EMAIL");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Пароль не короче 8 символов (argv[2] или NEW_PASSWORD)");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true, displayName: true },
    });
    if (!user) {
      console.error("Пользователь с такой почтой не найден:", email);
      process.exit(1);
    }
    if (user.role !== "OWNER") {
      console.error("У этой записи роль не OWNER, отмена:", user.role);
      process.exit(1);
    }

    const passwordHash = await bcrypt.hash(password, ROUNDS);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        inviteCodeHash: null,
      },
    });
    console.log("Пароль обновлён для:", email, "(" + (user.displayName || "") + ")");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
