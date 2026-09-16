import Phaser from 'phaser';
import { BenchScene, GAME_H, GAME_W } from './BenchScene';
import type { Tool } from '../../services/village/redstone';

export type BenchHooks = {
  onTile: (i: number) => void;
  onTool: (t: Tool) => void;
};

export function createRedstoneGame(parent: HTMLElement, hooks: BenchHooks): Phaser.Game {
  parent.style.width = '100%';
  parent.style.height = '100%';
  const width = Math.max(320, parent.clientWidth || GAME_W);
  const height = Math.max(280, parent.clientHeight || GAME_H);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width,
    height,
    backgroundColor: '#1a100c',
    pixelArt: true,
    antialias: false,
    roundPixels: true,
    audio: { noAudio: true },
    scale: {
      mode: Phaser.Scale.RESIZE,
      resizeInterval: 50,
    },
    scene: [BenchScene],
  });
  const ro = new ResizeObserver(() => game.scale.refresh());
  ro.observe(parent);
  game.events.once(Phaser.Core.Events.READY, () => {
    const scene = game.scene.getScene('bench') as BenchScene;
    scene.setOnTile(hooks.onTile);
    scene.setOnTool(hooks.onTool);
    game.canvas.setAttribute('data-testid', 'redstone-canvas');
    game.canvas.setAttribute('aria-label', 'Oficina de Redstone');
    game.scale.refresh();
  });
  game.events.once(Phaser.Core.Events.DESTROY, () => ro.disconnect());
  return game;
}

export function benchSceneOf(game: Phaser.Game): BenchScene | null {
  const scene = game.scene.getScene('bench');
  return scene instanceof BenchScene ? scene : null;
}
