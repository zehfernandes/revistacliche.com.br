// Kept apart from lib/content so client components can use it without bundling the archive JSON.
export const formatDate = (iso: string) =>
  iso.length === 4 ? iso : new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
