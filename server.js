require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const { nanoid } = require("nanoid");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// Conexión a MongoDB sin las opciones obsoletas
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB conectado"))
  .catch((err) => {
    console.error("Error de conexión a MongoDB:", err);
    process.exit(1); // Cerrar el proceso si la conexión a la DB falla
  });

const urlSchema = new mongoose.Schema({
  shortId: String,
  originalUrl: String,
  createdAt: { type: Date, default: Date.now },
});

const Url = mongoose.model("Url", urlSchema);

// Middleware para manejar errores no capturados
app.use((err, req, res, next) => {
  console.error("Error inesperado:", err);
  res.status(500).json({ error: "Hubo un error inesperado en el servidor" });
});

// Endpoint para acortar URLs
app.post("/shorten", async (req, res, next) => {
  try {
    const { originalUrl } = req.body;
    if (!originalUrl) {
      return res.status(400).json({ error: "URL requerida" });
    }

    const shortId = nanoid(6);
    const newUrl = new Url({ shortId, originalUrl });

    await newUrl.save(); // Usar .save() en lugar de create para mejor control de excepciones

    res.json({ shortUrl: `${process.env.BASE_URL}/${shortId}` });
  } catch (err) {
    console.error("Error al acortar la URL:", err);
    next(err); // Enviar el error al middleware de manejo de errores
  }
});

// Endpoint para redirigir a la URL original
app.get("/:shortId", async (req, res, next) => {
  try {
    const { shortId } = req.params;
    const urlEntry = await Url.findOne({ shortId });

    if (!urlEntry) {
      return res.status(404).json({ error: "URL no encontrada" });
    }

    res.redirect(urlEntry.originalUrl);
  } catch (err) {
    console.error("Error al redirigir la URL:", err);
    next(err); // Enviar el error al middleware de manejo de errores
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));

