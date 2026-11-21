type HtmlCharacter = "&" | "<" | ">" | "\"";

const CHARACTER_TO_ENTITY: Record<HtmlCharacter, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "\"": "&quot;",
};

export class HtmlUtil {
  static escape(text: string): string {
    return text.replace(/[&<>"]/g, (character) => CHARACTER_TO_ENTITY[character as HtmlCharacter]);
  }
}
