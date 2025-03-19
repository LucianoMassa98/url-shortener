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
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB conectado"))
  .catch((err) => console.error(err));

const urlSchema = new mongoose.Schema({
  shortId: String,
  originalUrl: String,
  createdAt: { type: Date, default: Date.now },
});

const Url = mongoose.model("Url", urlSchema);

// Endpoint para acortar URLs
app.post("/shorten", async (req, res) => {
  const { originalUrl } = req.body;
  if (!originalUrl) return res.status(400).json({ error: "URL requerida" });

  const shortId = nanoid(6);
  await Url.create({ shortId, originalUrl });

  res.json({ shortUrl: `${process.env.BASE_URL}/${shortId}` });
});

// Endpoint para redirigir a la URL original
app.get("/:shortId", async (req, res) => {
  const { shortId } = req.params;
  const urlEntry = await Url.findOne({ shortId });

  if (!urlEntry) return res.status(404).json({ error: "URL no encontrada" });

  res.redirect(urlEntry.originalUrl);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));
