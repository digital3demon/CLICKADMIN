/** Пресеты аватаров (эмодзи-животные). id сохраняется в User.avatarPresetId */
export const PROFILE_AVATAR_PRESETS = [
  { id: "bear", emoji: "🐻", label: "Медведь" },
  { id: "fox", emoji: "🦊", label: "Лиса" },
  { id: "rabbit", emoji: "🐰", label: "Заяц" },
  { id: "cat", emoji: "🐱", label: "Кот" },
  { id: "dog", emoji: "🐶", label: "Собака" },
  { id: "panda", emoji: "🐼", label: "Панда" },
  { id: "koala", emoji: "🐨", label: "Коала" },
  { id: "tiger", emoji: "🐯", label: "Тигр" },
  { id: "lion", emoji: "🦁", label: "Лев" },
  { id: "frog", emoji: "🐸", label: "Лягушка" },
  { id: "monkey", emoji: "🐵", label: "Обезьяна" },
  { id: "penguin", emoji: "🐧", label: "Пингвин" },
  { id: "owl", emoji: "🦉", label: "Сова" },
  { id: "bee", emoji: "🐝", label: "Пчела" },
  { id: "butterfly", emoji: "🦋", label: "Бабочка" },
  { id: "turtle", emoji: "🐢", label: "Черепаха" },
  { id: "octopus", emoji: "🐙", label: "Осьминог" },
  { id: "whale", emoji: "🐋", label: "Кит" },
  { id: "dolphin", emoji: "🐬", label: "Дельфин" },
  { id: "unicorn", emoji: "🦄", label: "Единорог" },
] as const;

export type ProfileAvatarPresetId = (typeof PROFILE_AVATAR_PRESETS)[number]["id"];

const ids = new Set(PROFILE_AVATAR_PRESETS.map((p) => p.id));

export function isProfileAvatarPresetId(id: string | null | undefined): id is ProfileAvatarPresetId {
  return typeof id === "string" && ids.has(id as ProfileAvatarPresetId);
}

export function profileAvatarEmoji(id: string | null | undefined): string {
  if (!id) return "👤";
  const p = PROFILE_AVATAR_PRESETS.find((x) => x.id === id);
  return p?.emoji ?? "👤";
}
