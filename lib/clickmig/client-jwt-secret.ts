/** Секрет JWT кабинета КликМиг: свой или AUTH_SECRET. Строка-заглушка только вне production. */
export function clickMigClientJwtSecretSource(): string {
  const secret =
    process.env.CLICKMIG_CLIENT_JWT_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim();
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("CLICKMIG_CLIENT_JWT_SECRET or AUTH_SECRET required");
  }
  return "clickmig-dev-secret-change-me";
}
