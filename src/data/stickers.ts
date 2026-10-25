// Gerado por scripts/build-stickers.py. Não editar à mão.
// Figurinhas da Conversa: arte do jogo com balão de fala, em public/assets/stickers/<id>.webp.

export type StickerAnim = "bob" | "bounce" | "jump" | "pulse" | "shake" | "spin" | "sway" | "tilt" | "wave" | "wiggle";

export interface ChatSticker {
  id: string;
  label: string;
  anim: StickerAnim;
}

export const CHAT_STICKERS: ChatSticker[] = [
  { id: "sabio-oi", label: "Oi!", anim: "wave" },
  { id: "sabio-muito-bem", label: "Muito bem!", anim: "bounce" },
  { id: "sabio-orgulho", label: "Orgulho de você!", anim: "pulse" },
  { id: "sabio-hmm", label: "Hmm...", anim: "tilt" },
  { id: "sabio-durma-bem", label: "Durma bem!", anim: "sway" },
  { id: "capataz-bora", label: "Bora trabalhar!", anim: "jump" },
  { id: "comerciante-fechado", label: "Negócio fechado!", anim: "bounce" },
  { id: "ferreiro-forte", label: "Ficou forte!", anim: "shake" },
  { id: "minerador-oi-pai", label: "Oi, pai!", anim: "jump" },
  { id: "minerador-saudade", label: "Saudade!", anim: "pulse" },
  { id: "minerador-te-amo", label: "Te amo!", anim: "pulse" },
  { id: "minerador-consegui", label: "Consegui!", anim: "spin" },
  { id: "minerador-boa-noite", label: "Boa noite!", anim: "sway" },
  { id: "gato-miau", label: "Miau!", anim: "wiggle" },
  { id: "lobo-auu", label: "Auuu!", anim: "jump" },
  { id: "papagaio-oi", label: "Oi! Oi! Oi!", anim: "bob" },
  { id: "pizza", label: "Pizza hoje?", anim: "spin" },
  { id: "presente", label: "Surpresa!", anim: "shake" },
  { id: "videogame", label: "Bora jogar?", anim: "bounce" },
  { id: "futebol", label: "Gol!", anim: "spin" },
  { id: "sorvete", label: "Sorvete!", anim: "wiggle" },
  { id: "pipoca", label: "Cinema?", anim: "bob" },
  { id: "chocolate", label: "Chocolate?", anim: "wiggle" },
];
