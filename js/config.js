const MAX_SHAPES = 6;
const TIME_TO_MAX = 120;
const MIN_SPEED = 0.4;
const MAX_SPEED = 2.2;
const PLAYER_HIT_RADIUS = 80;
const HEART_SIZE = 30;
const HEART_PADDING = 10;

const SHAPE_TYPES = ['circle', 'line', 'v'];
const STROKE_COLORS = ['#ff3b3b', '#ffd93b', '#3b82ff'];

const PLAYER_FRAMES = {
  idle: 0,
  action1: 1, // 'down'
  action2: 2, // 'up'
  dead: 3,
};