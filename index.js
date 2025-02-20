require("dotenv").config();
const readline = require("readline");

// Creamos la interfaz para leer desde la consola.
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log("Seleccione una opción:");
console.log("1. Leer información de Discord y guardarla en la base de datos.");
console.log("2. Obtener canales y vectorizar la información.");

// Se lee la opción ingresada por el usuario.
rl.question("Ingrese el número de opción: ", (answer) => {
  const option = answer.trim();
  if (option === "1") {
    console.log("Iniciando servicio de Discord...");
    require("./src/services/discordService");
  } else if (option === "2") {
    console.log("Iniciando vectorización de canales...");
    require("./src/services/vectorizeChannels");
  } else {
    console.log(
      "Opción no válida. Por favor, reinicie la aplicación e ingrese 1 o 2."
    );
  }
  rl.close();
});
