const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const bgImage = new Image();
bgImage.src = "./public/background.png";
let bgReady = false;
bgImage.onload = () => { bgReady = true; };

const CENTER = {
  x: () => canvas.width / (window.devicePixelRatio || 1) / 2,
  y: () => canvas.height / (window.devicePixelRatio || 1) / 2,
};

function resize() {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function fitScreen() {
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  resize();
}

function drawBackground() {
  const canvasW = canvas.width / (window.devicePixelRatio || 1);
  const canvasH = canvas.height / (window.devicePixelRatio || 1);
  ctx.drawImage(bgImage, 0, 0, canvasW, canvasH);
}

fitScreen();
window.addEventListener('resize', fitScreen);