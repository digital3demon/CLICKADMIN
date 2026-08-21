/** Публичный ответ /api/auth/status: без численности пользователей. */
export function authStatusPublicJson(input: {
  needsBootstrap: boolean;
  singleUser?: boolean;
}): { needsBootstrap: boolean; singleUser?: boolean } {
  if (input.singleUser) {
    return { needsBootstrap: false, singleUser: true };
  }
  return { needsBootstrap: input.needsBootstrap };
}
