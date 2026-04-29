import { redirect } from "next/navigation";

/** Старая ссылка: привязка перенесена в профиль. */
export default function TelegramLinkLegacyPage() {
  redirect("/directory/profile");
}
