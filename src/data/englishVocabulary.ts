// Gerado a partir do projeto Minecraft English Adventure v3 (conteúdo, imagens e áudio).
// Não editar à mão: rode o script de porte se o conteúdo mudar.

export type EnglishCategory = 'fruits' | 'animals' | 'objects' | 'colors' | 'verbs';

export interface EnglishWord {
  id: string;
  word: string;
  translation: string;
  category: EnglishCategory;
  categoryLabel: string;
  image: string | null;
  audio: string | null;
  examples: string[];
  hex: string | null;
  difficulty: 1 | 2 | 3;
}

export const ENGLISH_CATEGORIES: { id: EnglishCategory; label: string }[] = [
  {
    "id": "fruits",
    "label": "Frutas"
  },
  {
    "id": "animals",
    "label": "Animais"
  },
  {
    "id": "objects",
    "label": "Objetos"
  },
  {
    "id": "colors",
    "label": "Cores"
  },
  {
    "id": "verbs",
    "label": "Ações"
  }
];

export const ENGLISH_WORDS: EnglishWord[] = [
  {
    "id": "fruits:apple",
    "word": "apple",
    "translation": "maçã",
    "category": "fruits",
    "categoryLabel": "Frutas",
    "image": "/assets/english/images/fruit_apple.webp",
    "audio": "/assets/english/audio/fruit_apple.mp3",
    "examples": [],
    "hex": null,
    "difficulty": 1
  },
  {
    "id": "fruits:banana",
    "word": "banana",
    "translation": "banana",
    "category": "fruits",
    "categoryLabel": "Frutas",
    "image": "/assets/english/images/fruit_banana.webp",
    "audio": "/assets/english/audio/fruit_banana.mp3",
    "examples": [],
    "hex": null,
    "difficulty": 1
  },
  {
    "id": "fruits:grape",
    "word": "grape",
    "translation": "uva",
    "category": "fruits",
    "categoryLabel": "Frutas",
    "image": "/assets/english/images/fruit_grape.webp",
    "audio": "/assets/english/audio/fruit_grape.mp3",
    "examples": [],
    "hex": null,
    "difficulty": 1
  },
  {
    "id": "fruits:orange",
    "word": "orange",
    "translation": "laranja",
    "category": "fruits",
    "categoryLabel": "Frutas",
    "image": "/assets/english/images/fruit_orange.webp",
    "audio": "/assets/english/audio/fruit_orange.mp3",
    "examples": [],
    "hex": null,
    "difficulty": 1
  },
  {
    "id": "fruits:strawberry",
    "word": "strawberry",
    "translation": "morango",
    "category": "fruits",
    "categoryLabel": "Frutas",
    "image": "/assets/english/images/fruit_strawberry.webp",
    "audio": "/assets/english/audio/fruit_strawberry.mp3",
    "examples": [],
    "hex": null,
    "difficulty": 1
  },
  {
    "id": "animals:dog",
    "word": "dog",
    "translation": "cão",
    "category": "animals",
    "categoryLabel": "Animais",
    "image": "/assets/english/images/animal_dog.webp",
    "audio": "/assets/english/audio/animal_dog.mp3",
    "examples": [],
    "hex": null,
    "difficulty": 1
  },
  {
    "id": "animals:cat",
    "word": "cat",
    "translation": "gato",
    "category": "animals",
    "categoryLabel": "Animais",
    "image": "/assets/english/images/animal_cat.webp",
    "audio": "/assets/english/audio/animal_cat.mp3",
    "examples": [],
    "hex": null,
    "difficulty": 1
  },
  {
    "id": "animals:horse",
    "word": "horse",
    "translation": "cavalo",
    "category": "animals",
    "categoryLabel": "Animais",
    "image": "/assets/english/images/animal_horse.webp",
    "audio": "/assets/english/audio/animal_horse.mp3",
    "examples": [],
    "hex": null,
    "difficulty": 1
  },
  {
    "id": "animals:bird",
    "word": "bird",
    "translation": "pássaro",
    "category": "animals",
    "categoryLabel": "Animais",
    "image": "/assets/english/images/animal_bird.webp",
    "audio": "/assets/english/audio/animal_bird.mp3",
    "examples": [],
    "hex": null,
    "difficulty": 1
  },
  {
    "id": "animals:lion",
    "word": "lion",
    "translation": "leão",
    "category": "animals",
    "categoryLabel": "Animais",
    "image": "/assets/english/images/animal_lion.webp",
    "audio": "/assets/english/audio/animal_lion.mp3",
    "examples": [],
    "hex": null,
    "difficulty": 2
  },
  {
    "id": "objects:chair",
    "word": "chair",
    "translation": "cadeira",
    "category": "objects",
    "categoryLabel": "Objetos",
    "image": "/assets/english/images/object_chair.webp",
    "audio": "/assets/english/audio/object_chair.mp3",
    "examples": [],
    "hex": null,
    "difficulty": 1
  },
  {
    "id": "objects:table",
    "word": "table",
    "translation": "mesa",
    "category": "objects",
    "categoryLabel": "Objetos",
    "image": "/assets/english/images/object_table.webp",
    "audio": "/assets/english/audio/object_table.mp3",
    "examples": [],
    "hex": null,
    "difficulty": 1
  },
  {
    "id": "objects:book",
    "word": "book",
    "translation": "livro",
    "category": "objects",
    "categoryLabel": "Objetos",
    "image": "/assets/english/images/object_book.webp",
    "audio": "/assets/english/audio/object_book.mp3",
    "examples": [],
    "hex": null,
    "difficulty": 1
  },
  {
    "id": "objects:ball",
    "word": "ball",
    "translation": "bola",
    "category": "objects",
    "categoryLabel": "Objetos",
    "image": "/assets/english/images/object_ball.webp",
    "audio": "/assets/english/audio/object_ball.mp3",
    "examples": [],
    "hex": null,
    "difficulty": 1
  },
  {
    "id": "objects:door",
    "word": "door",
    "translation": "porta",
    "category": "objects",
    "categoryLabel": "Objetos",
    "image": "/assets/english/images/object_door.webp",
    "audio": "/assets/english/audio/object_door.mp3",
    "examples": [],
    "hex": null,
    "difficulty": 1
  },
  {
    "id": "colors:red",
    "word": "red",
    "translation": "vermelho",
    "category": "colors",
    "categoryLabel": "Cores",
    "image": "/assets/english/images/color_red.webp",
    "audio": "/assets/english/audio/color_red.mp3",
    "examples": [
      "red apple",
      "red flower"
    ],
    "hex": "#FF0000",
    "difficulty": 1
  },
  {
    "id": "colors:blue",
    "word": "blue",
    "translation": "azul",
    "category": "colors",
    "categoryLabel": "Cores",
    "image": "/assets/english/images/color_blue.webp",
    "audio": "/assets/english/audio/color_blue.mp3",
    "examples": [
      "blue sky",
      "blue ocean"
    ],
    "hex": "#0000FF",
    "difficulty": 1
  },
  {
    "id": "colors:green",
    "word": "green",
    "translation": "verde",
    "category": "colors",
    "categoryLabel": "Cores",
    "image": "/assets/english/images/color_green.webp",
    "audio": "/assets/english/audio/color_green.mp3",
    "examples": [
      "green grass",
      "green tree"
    ],
    "hex": "#00FF00",
    "difficulty": 1
  },
  {
    "id": "colors:yellow",
    "word": "yellow",
    "translation": "amarelo",
    "category": "colors",
    "categoryLabel": "Cores",
    "image": "/assets/english/images/color_yellow.webp",
    "audio": "/assets/english/audio/color_yellow.mp3",
    "examples": [
      "yellow sun",
      "yellow banana"
    ],
    "hex": "#FFFF00",
    "difficulty": 1
  },
  {
    "id": "colors:black",
    "word": "black",
    "translation": "preto",
    "category": "colors",
    "categoryLabel": "Cores",
    "image": "/assets/english/images/color_black.webp",
    "audio": "/assets/english/audio/color_black.mp3",
    "examples": [
      "black cat",
      "black night"
    ],
    "hex": "#000000",
    "difficulty": 1
  },
  {
    "id": "colors:white",
    "word": "white",
    "translation": "branco",
    "category": "colors",
    "categoryLabel": "Cores",
    "image": "/assets/english/images/color_white.webp",
    "audio": "/assets/english/audio/color_white.mp3",
    "examples": [
      "white cloud",
      "white snow"
    ],
    "hex": "#FFFFFF",
    "difficulty": 1
  },
  {
    "id": "colors:orange",
    "word": "orange",
    "translation": "laranja",
    "category": "colors",
    "categoryLabel": "Cores",
    "image": "/assets/english/images/color_orange.webp",
    "audio": "/assets/english/audio/color_orange.mp3",
    "examples": [
      "orange fruit",
      "orange sunset"
    ],
    "hex": "#FFA500",
    "difficulty": 1
  },
  {
    "id": "colors:purple",
    "word": "purple",
    "translation": "roxo",
    "category": "colors",
    "categoryLabel": "Cores",
    "image": "/assets/english/images/color_purple.webp",
    "audio": "/assets/english/audio/color_purple.mp3",
    "examples": [
      "purple flower",
      "purple grape"
    ],
    "hex": "#800080",
    "difficulty": 1
  },
  {
    "id": "colors:pink",
    "word": "pink",
    "translation": "rosa",
    "category": "colors",
    "categoryLabel": "Cores",
    "image": "/assets/english/images/color_pink.webp",
    "audio": "/assets/english/audio/color_pink.mp3",
    "examples": [
      "pink rose",
      "pink dress"
    ],
    "hex": "#FFC0CB",
    "difficulty": 1
  },
  {
    "id": "colors:brown",
    "word": "brown",
    "translation": "marrom",
    "category": "colors",
    "categoryLabel": "Cores",
    "image": "/assets/english/images/color_brown.webp",
    "audio": "/assets/english/audio/color_brown.mp3",
    "examples": [
      "brown bear",
      "brown wood"
    ],
    "hex": "#A52A2A",
    "difficulty": 1
  },
  {
    "id": "verbs:run",
    "word": "run",
    "translation": "correr",
    "category": "verbs",
    "categoryLabel": "Ações",
    "image": "/assets/english/images/verb_run.webp",
    "audio": "/assets/english/audio/verb_run.mp3",
    "examples": [
      "I run every morning.",
      "The player runs to escape the zombie."
    ],
    "hex": null,
    "difficulty": 1
  },
  {
    "id": "verbs:jump",
    "word": "jump",
    "translation": "pular",
    "category": "verbs",
    "categoryLabel": "Ações",
    "image": "/assets/english/images/verb_jump.webp",
    "audio": "/assets/english/audio/verb_jump.mp3",
    "examples": [
      "Jump over the fence.",
      "Steve jumps to reach the block."
    ],
    "hex": null,
    "difficulty": 1
  },
  {
    "id": "verbs:walk",
    "word": "walk",
    "translation": "andar",
    "category": "verbs",
    "categoryLabel": "Ações",
    "image": "/assets/english/images/verb_walk.webp",
    "audio": "/assets/english/audio/verb_walk.mp3",
    "examples": [
      "I walk to school every day.",
      "The villager walks around the village."
    ],
    "hex": null,
    "difficulty": 1
  },
  {
    "id": "verbs:swim",
    "word": "swim",
    "translation": "nadar",
    "category": "verbs",
    "categoryLabel": "Ações",
    "image": "/assets/english/images/verb_swim.webp",
    "audio": "/assets/english/audio/verb_swim.mp3",
    "examples": [
      "Fish swim in the ocean.",
      "The player swims across the river."
    ],
    "hex": null,
    "difficulty": 1
  },
  {
    "id": "verbs:build",
    "word": "build",
    "translation": "construir",
    "category": "verbs",
    "categoryLabel": "Ações",
    "image": "/assets/english/images/verb_build.webp",
    "audio": "/assets/english/audio/verb_build.mp3",
    "examples": [
      "I build houses in Minecraft.",
      "They build a castle together."
    ],
    "hex": null,
    "difficulty": 1
  },
  {
    "id": "verbs:mine",
    "word": "mine",
    "translation": "minerar",
    "category": "verbs",
    "categoryLabel": "Ações",
    "image": "/assets/english/images/verb_mine.webp",
    "audio": "/assets/english/audio/verb_mine.mp3",
    "examples": [
      "I mine for diamonds.",
      "The player mines coal for torches."
    ],
    "hex": null,
    "difficulty": 1
  },
  {
    "id": "verbs:eat",
    "word": "eat",
    "translation": "comer",
    "category": "verbs",
    "categoryLabel": "Ações",
    "image": "/assets/english/images/verb_eat.webp",
    "audio": "/assets/english/audio/verb_eat.mp3",
    "examples": [
      "I eat an apple.",
      "The player eats to restore health."
    ],
    "hex": null,
    "difficulty": 1
  },
  {
    "id": "verbs:drink",
    "word": "drink",
    "translation": "beber",
    "category": "verbs",
    "categoryLabel": "Ações",
    "image": "/assets/english/images/verb_drink.webp",
    "audio": "/assets/english/audio/verb_drink.mp3",
    "examples": [
      "I drink water.",
      "The player drinks a potion."
    ],
    "hex": null,
    "difficulty": 1
  },
  {
    "id": "verbs:sleep",
    "word": "sleep",
    "translation": "dormir",
    "category": "verbs",
    "categoryLabel": "Ações",
    "image": "/assets/english/images/verb_sleep.webp",
    "audio": "/assets/english/audio/verb_sleep.mp3",
    "examples": [
      "I sleep at night.",
      "The player sleeps to skip the night."
    ],
    "hex": null,
    "difficulty": 1
  },
  {
    "id": "verbs:play",
    "word": "play",
    "translation": "jogar",
    "category": "verbs",
    "categoryLabel": "Ações",
    "image": "/assets/english/images/verb_play.webp",
    "audio": "/assets/english/audio/verb_play.mp3",
    "examples": [
      "I play Minecraft every day.",
      "They play together on the server."
    ],
    "hex": null,
    "difficulty": 1
  }
];
