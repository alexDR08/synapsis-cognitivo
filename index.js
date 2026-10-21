require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const path = require('path');
const fs = require('fs');
const { getDb, describeFirestore } = require('./server/firebase');
const createActivityRouter = require('./server/activity');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
const EMAIL_INSTITUCIONAL = /^[a-zA-Z0-9._%+-]+@uvp\.(edu\.)?mx$/;

const app = express();

// --- MIDDLEWARES ---
app.use(express.json());
app.use(cors());

// --- CONEXIÓN A LA BASE DE DATOS (MongoDB) ---
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/synapsis_db';
mongoose.connect(MONGO_URI)
  .then(() => console.log('Base de datos conectada con éxito a MongoDB'))
  .catch(err => console.error('Error conectando a la base de datos:', err));

// --- MODELO DE USUARIO ---
const UserSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true,
    trim: true,
    match: [/^[a-zA-Z0-9._%+-]+@uvp\.(edu\.)?mx$/, 'Debe ser un correo institucional válido']
  },
  password: { type: String }, // vacío cuando la cuenta se creó con Google
  googleId: { type: String, index: true },
  score: { type: Number, default: 0 } // Aciertos acumulados para el perfil
});

const User = mongoose.model('User', UserSchema);

// --- MIDDLEWARE DE AUTENTICACIÓN (JWT) ---
const verifyToken = (req, res, next) => {
  const tokenHeader = req.headers['authorization'];
  if (!tokenHeader) return res.status(401).json({ message: 'Acceso denegado. Token requerido.' });

  try {
    const token = tokenHeader.replace('Bearer ', '');
    const verified = jwt.verify(token, process.env.JWT_SECRET || 'secreto_synapsis');
    req.user = verified;
    next();
  } catch (error) {
    res.status(400).json({ message: 'Token inválido o expirado' });
  }
};

// ==========================================
// --- RUTAS DE LA API ---
// ==========================================

// 1. Autenticación (Login / Registro automático para pruebas)
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    let user = await User.findOne({ email });
    
    // Si el usuario no existe, lo creamos automáticamente para agilizar pruebas
    if (!user) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      user = new User({ email, password: hashedPassword });
      await user.save();
    } else {
      if (!user.password) return res.status(400).json({ message: 'Esta cuenta usa Google. Entra con el botón de Google.' });
      const validPass = await bcrypt.compare(password, user.password);
      if (!validPass) return res.status(400).json({ message: 'Contraseña incorrecta' });
    }

    const username = email.split('@')[0];
    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET || 'secreto_synapsis', { expiresIn: '8h' });

    res.json({
      success: true,
      token,
      username,
      email: user.email,
      score: user.score
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 1b. Autenticación con Google (Google Identity Services)
app.post('/api/auth/google', async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ message: 'Falta el token de Google.' });
  if (!GOOGLE_CLIENT_ID) return res.status(500).json({ message: 'GOOGLE_CLIENT_ID no está configurado en el servidor.' });

  try {
    // Google firma el token; aquí se verifica firma, vigencia y que sea para NUESTRA app
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();

    if (!payload.email_verified) return res.status(401).json({ message: 'El correo de Google no está verificado.' });

    const email = payload.email.toLowerCase();
    if (!EMAIL_INSTITUCIONAL.test(email)) {
      return res.status(403).json({ message: 'Debes usar tu correo institucional (@uvp.edu.mx).' });
    }

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({ email, googleId: payload.sub });
    } else if (!user.googleId) {
      user.googleId = payload.sub;
      await user.save();
    }

    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET || 'secreto_synapsis', { expiresIn: '8h' });
    res.json({
      success: true,
      token,
      username: email.split('@')[0],
      email: user.email,
      name: payload.name,
      picture: payload.picture,
      score: user.score
    });
  } catch (err) {
    res.status(401).json({ success: false, message: 'Token de Google inválido o expirado.' });
  }
});

// 2. Obtener Perfil del Usuario (Pantalla de Perfil)
app.get('/api/user/profile', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const username = user.email.split('@')[0];
    res.json({
      success: true,
      email: user.email,
      username: username,
      score: user.score
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Motor del Juego: Generar Secuencia Aleatoria (Cuadrícula 3x3)
app.get('/api/game/sequence', (req, res) => {
  const level = parseInt(req.query.level) || 4; // Longitud por defecto de la secuencia
  const sequence = [];
  
  // Genera números aleatorios del 1 al 9 representando los cuadros 3x3
  for (let i = 0; i < level; i++) {
    sequence.push(Math.floor(Math.random() * 9) + 1);
  }

  res.json({
    success: true,
    level,
    sequence,
    displayTimeMs: 1000 // 1 segundo de encendido
  });
});

// 4. Validar Secuencia y Actualizar Aciertos Acumulados
app.post('/api/game/validate', verifyToken, async (req, res) => {
  const { userSequence, targetSequence } = req.body;

  try {
    // Compara el arreglo enviado por el usuario con la secuencia objetivo
    const isCorrect = JSON.stringify(userSequence) === JSON.stringify(targetSequence);

    let currentScore = 0;
    if (isCorrect) {
      const user = await User.findById(req.user.id);
      user.score += 1; // Suma +1 acierto acumulado
      await user.save();
      currentScore = user.score;
    } else {
      const user = await User.findById(req.user.id);
      currentScore = user.score;
    }

    res.json({
      success: true,
      correct: isCorrect,
      score: currentScore,
      message: isCorrect ? '¡Patrón correcto! Acierto registrado.' : 'Patrón incorrecto.'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Actividad en Firestore (Firebase): sesiones, intentos, eventos y rachas
app.use('/api/activity', createActivityRouter({
  verifyToken,
  getDb,
  timezone: process.env.APP_TIMEZONE || 'America/Mexico_City'
}));

// --- ARCHIVOS ESTÁTICOS DEL FRONTEND (Producción) ---
const distPath = path.resolve(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// --- INICIAR SERVIDOR ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor de Backend corriendo en http://localhost:${PORT}`);
  console.log(describeFirestore());
});