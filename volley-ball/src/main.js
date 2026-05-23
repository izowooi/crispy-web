'use strict';
import { settings } from '@pixi/settings';
import { SCALE_MODES } from '@pixi/constants';
import { Renderer, BatchRenderer, autoDetectRenderer } from '@pixi/core';
import { Prepare } from '@pixi/prepare';
import { Container } from '@pixi/display';
import { Loader } from '@pixi/loaders';
import { SpritesheetLoader } from '@pixi/spritesheet';
import { Ticker } from '@pixi/ticker';
import { CanvasRenderer } from '@pixi/canvas-renderer';
import { CanvasSpriteRenderer } from '@pixi/canvas-sprite';
import { CanvasPrepare } from '@pixi/canvas-prepare';
import '@pixi/canvas-display';
import { PikachuVolleyball } from './game/pikavolley.js';
import { ASSETS_PATH } from './game/assets_path.js';

Renderer.registerPlugin('prepare', Prepare);
Renderer.registerPlugin('batch', BatchRenderer);
CanvasRenderer.registerPlugin('prepare', CanvasPrepare);
CanvasRenderer.registerPlugin('sprite', CanvasSpriteRenderer);
Loader.registerPlugin(SpritesheetLoader);

settings.RESOLUTION = 2;
settings.SCALE_MODE = SCALE_MODES.NEAREST;
settings.ROUND_PIXELS = true;

const renderer = autoDetectRenderer({
  width: 432,
  height: 304,
  antialias: false,
  backgroundColor: 0x000000,
  backgroundAlpha: 1,
  forceCanvas: true,
});

const stage = new Container();
const ticker = new Ticker();
const loader = new Loader();

renderer.view.setAttribute('id', 'game-canvas');
document.getElementById('game-canvas-container').appendChild(renderer.view);
renderer.render(stage);

const overrides =
  (typeof window !== 'undefined' && window.__ASSETS_OVERRIDE) || {};
const overrideSounds = overrides.SOUNDS || {};

loader.add(
  ASSETS_PATH.SPRITE_SHEET,
  overrides.SPRITE_SHEET || ASSETS_PATH.SPRITE_SHEET
);
for (const prop in ASSETS_PATH.SOUNDS) {
  loader.add(
    ASSETS_PATH.SOUNDS[prop],
    overrideSounds[prop] || ASSETS_PATH.SOUNDS[prop]
  );
}

const loadingBox = document.getElementById('loading-box');
const progressBar = document.getElementById('progress-bar');
loader.onProgress.add(() => {
  progressBar.style.width = `${loader.progress}%`;
});
loader.onComplete.add(() => {
  loadingBox.classList.add('hidden');
});

loader.load(setup);

function setup() {
  const pikaVolley = new PikachuVolleyball(stage, loader.resources);
  ticker.maxFPS = pikaVolley.normalFPS;
  ticker.add(() => {
    pikaVolley.gameLoop();
    renderer.render(stage);
  });
  ticker.start();
}
