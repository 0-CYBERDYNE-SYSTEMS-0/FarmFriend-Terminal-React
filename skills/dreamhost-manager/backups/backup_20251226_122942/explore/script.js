const canvas = document.getElementById('matrixCanvas');
const ctx = canvas.getContext('2d');
canvas.height = window.innerHeight;
canvas.width = window.innerWidth;
const symbols = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()*&^%+-/~<>?abcdefghijklmnopqrstuvwxyz";
let columns = canvas.width / 15; // Approximate column width

let drops = [];
for (let x = 0; x < columns; x++)
  drops[x] = 1;

function drawMatrix() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.04)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.font = "15px monospace";

  for (let i = 0; i < drops.length; i++) {
    ctx.fillStyle = getRandomColor(); // Set a random color for each letter
    const text = symbols.charAt(Math.floor(Math.random() * symbols.length));
    ctx.fillText(text, i * 15, drops[i] * 15);
    if (drops[i] * 15 > canvas.height && Math.random() > 0.975)
      drops[i] = 0;
    drops[i]++;
  }
}

function getRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

setInterval(drawMatrix, 60);