import "server-only";

export function isDbSplitEnabled(): boolean {
  // PostgreSQL cutover: единая БД, split-режим отключён.
  return false;
}

