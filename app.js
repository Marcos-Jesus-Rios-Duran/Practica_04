import express from "express";
import session from "express-session";
import { v4 as uuidv4 } from "uuid";
import cors from "cors";
import os from "os";
import moment from "moment-timezone";

const app = express();
const port = 3000;

app.listen(port, () => {
    console.log(`Servidor inicializado en http://localhost:${port}`);
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const sessions = {};
app.use(
    session({
        secret: "P4-MJRD-SesionesHTPP-Variables",
        resave: false,
        saveUninitialized: true,
        cookie: {
            maxAge: 5 * 60 * 1000,
            secure: false,
        },
    })
);

// Endpoint Para dar la Bienvenida
app.get('/', (request, response) => {
    return response.status(200).json({
        message: "Bienvenido",
        autor: "Marcos Jesus Rios Duran",
    });
});

// Función de utilidad que nos permite obtener la información de la interfaz de red
const getLocalIp = () => {
    const networkInterfaces = os.networkInterfaces();
    for (const interfaceName in networkInterfaces) {
        const interfaces = networkInterfaces[interfaceName];
        for (const iface of interfaces) {
            // IPv4 y no interna (no localhost)
            if (iface.family === "IPv4" && !iface.internal) {
                return iface.address;
            }
        }
    }
    return null; // retorna null si no encuentra una IP válida
};

// login
app.post('/login', (request, response) => {
    const { email, nickname, macAddress } = request.body;
    if (!email || !nickname || !macAddress) {
        return response.status(400).json({ message: "Se esperan campos requeridos" });
    }
    const sessionID = uuidv4();
    const now = new Date();
    sessions[sessionID] = {
        sessionId: sessionID,
        email,
        nickname,
        macAddress,
        ip: getLocalIp(),
        createdAt: now,
        lastAccessed: now,
    };
    response.status(200).json({
        message: "Se ha logeado de manera exitosa",
        sessionID,
    });
});

// logout
app.post('/logout', (request, response) => {
    const { sessionID } = request.body;

    if (!sessionID || !sessions[sessionID]) {
        return response.status(404).json({
            message: "No se ha encontrado ninguna sesión activa",
        });
    }
    delete sessions[sessionID];
    response.status(200).json({ message: "Logout successful" });
});

// update
app.post('/update', (request, response) => {
    const { sessionID, email, nickname } = request.body;
    if (!sessionID || !sessions[sessionID]) {
        return response.status(404).json({
            message: "No se ha encontrado ninguna sesión activa",
        });
    }
    if (email) sessions[sessionID].email = email;
    if (nickname) sessions[sessionID].nickname = nickname;
    sessions[sessionID].lastAccessed = new Date();
    response.status(200).json({ message: "Información actualizada" });
});

// status
app.post('/status', (request, response) => {
    const { sessionID } = request.query;
    if (!sessionID || !sessions[sessionID]) {
        return response.status(404).json({ message: "No se ha encontrado una sesión activa" });
    }
    response.status(200).json({
        message: "Sesión activa",
        session: sessions[sessionID]
    });
});
