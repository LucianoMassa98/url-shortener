import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import { nanoid } from "nanoid";
import cors from "cors";
import morgan from "morgan";

// Crear el modelo de errores para MongoDB
const errorSchema = new mongoose.Schema({
  message: String,
  stack: String,
  timestamp: { type: Date, default: Date.now },
  method: String,
  url: String,
});

const ErrorLog = mongoose.model("ErrorLog", errorSchema);

const app = express();
app.use(express.json());
app.use(cors());

// Configuración de morgan para loguear todas las peticiones HTTP
app.use(morgan("combined")); // Registra todas las peticiones en formato combinado (detallado)

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

// Endpoint para acortar URLs
app.post("/shorten", async (req, res) => {
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

    // Guardar el error en MongoDB
    const errorLog = new ErrorLog({
      message: err.message,
      stack: err.stack,
      method: "POST",
      url: "/shorten",
    });
    await errorLog.save(); // Guardar el error en la base de datos

    res.status(500).json({ error: "Error en el servidor" });
  }
});

// Endpoint para redirigir a la URL original
app.get("/:shortId", async (req, res) => {
  try {
    const { shortId } = req.params;
    const urlEntry = await Url.findOne({ shortId });

    if (!urlEntry) {
      return res.status(404).json({ error: "URL no encontrada" });
    }

    res.redirect(urlEntry.originalUrl);
  } catch (err) {
    console.error("Error al redirigir la URL:", err);

    // Guardar el error en MongoDB
    const errorLog = new ErrorLog({
      message: err.message,
      stack: err.stack,
      method: "GET",
      url: `/${req.params.shortId}`,
    });
    await errorLog.save(); // Guardar el error en la base de datos

    res.status(500).json({ error: "Error en el servidor" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));
