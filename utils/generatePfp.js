const fs = require("fs");
const path = require("path");
const { createCanvas } = require("canvas");

module.exports = async function generatePfp(username, color = "#4f46e5") {
  if (!username || typeof username !== "string") {
    throw new Error("generatePfp: username must be a non-empty string");
  }

  const initials = username
    .split(" ")
    .map((w) => w[0]?.toUpperCase())
    .slice(0, 2)
    .join("");

  const canvas = createCanvas(100, 100);
  const ctx = canvas.getContext("2d");

  // Draw background circle
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(50, 50, 50, 0, Math.PI * 2);
  ctx.fill();

  // Draw initials
  ctx.fillStyle = "#fff";
  ctx.font = "bold 50px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(initials, 50, 50);

  // Generate output path
  const outputDir = path.join(__dirname, "../public/uploads/pfps");
  const filePath = path.join(outputDir, `${username}.png`);

  // Ensure output directory exists
  fs.mkdirSync(outputDir, { recursive: true });

  // Write image
  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(filePath, buffer);

  return `/uploads/pfps/${username}.png`;
};
