/** Сообщение 500 на публичном входе: в production без CLI и путей. */
export function loginPublicServerErrorMessage(devDetail: string): string {
  if (process.env.NODE_ENV === "production") {
    return "Ошибка входа. Повторите позже или обратитесь к администратору.";
  }
  return devDetail;
}
