const MARKDOWN_IMAGE_RE =
  /!\[[^\]]*\]\((?:https?:\/\/[^\s)\]]+?\.(?:png|jpe?g|gif|webp|svg)(?:[^\s)\]]*)?|cid:[^\s)\]]+)\)/giu;
const BRACKET_IMAGE_RE =
  /\[(?:https?:\/\/[^\s\]]+?\.(?:png|jpe?g|gif|webp|svg)(?:[^\s\]]*)?|cid:[^\s\]]+)\]/giu;

export function cleanMailTextBody(text: string | null | undefined): string {
  return (text ?? "")
    .replace(MARKDOWN_IMAGE_RE, " ")
    .split(/\r?\n/)
    .map((line) => {
      let next = line.replace(BRACKET_IMAGE_RE, " ");
      // JS \b не считает кириллицу word-символами, поэтому границы задаём через \p{L}.
      next = next.replace(/(?<!\p{L})(?:логотип|logo|image|изображение|картинка)(?!\p{L})/giu, " ");
      return next.replace(/\s+/g, " ").trim();
    })
    .filter(Boolean)
    .join("\n")
    .trim();
}
