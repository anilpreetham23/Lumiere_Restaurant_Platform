const fs = require("fs");
const path = require("path");

const brainDir = "C:\\Users\\Dell\\.gemini\\antigravity-ide\\brain\\4bc882d5-f56c-4201-8498-5e14a0ca57f1";
const publicMenuDir = "C:\\Users\\Dell\\Desktop\\Personal Kulla Projects\\Lumiere_Restaurant_Platform\\public\\img\\menu";

if (!fs.existsSync(publicMenuDir)) {
  fs.mkdirSync(publicMenuDir, { recursive: true });
}

const files = fs.readdirSync(brainDir);
files.forEach((file) => {
  if (file.startsWith("rayalaseema_chicken_curry_")) {
    fs.copyFileSync(path.join(brainDir, file), path.join(publicMenuDir, "rayalaseema_chicken_curry.jpg"));
    console.log("Copied rayalaseema_chicken_curry.jpg");
  } else if (file.startsWith("wagyu_nigiri_")) {
    fs.copyFileSync(path.join(brainDir, file), path.join(publicMenuDir, "wagyu_nigiri.jpg"));
    console.log("Copied wagyu_nigiri.jpg");
  } else if (file.startsWith("risotto_tartufo_")) {
    fs.copyFileSync(path.join(brainDir, file), path.join(publicMenuDir, "risotto_tartufo.jpg"));
    console.log("Copied risotto_tartufo.jpg");
  }
});
