// Exportación de librerías necesarias
import express from 'express';
import session from 'express-session';
import { v4 as uuidv4 } from 'uuid'; //versión 4 de uuid
import os, { networkInterfaces } from 'os';

const sessions = new Map();
const app = express();
const PORT = 3500;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
    session({
        secret: "P4-MJRD#CO-SesionesHTTP-VariablesDeSesion",
        resave: false,
        saveUninitialized: false,
        cookie: { maxAge: 2 * 60 * 1000 } // 2 minutos de inactividad
    })
);

// Función para obtener la IP y MAC del servidor
const getServerInfo = () => {
    const networkInterfaces = os.networkInterfaces();
    let serverInfo = { ip: null, mac: null };

    for (const interfaceName in networkInterfaces) {
        const interfaces = networkInterfaces[interfaceName];
        for (const iface of interfaces) {
            if (iface.family === 'IPv4' && !iface.internal) {
                serverInfo.ip = iface.address;
                serverInfo.mac = iface.mac;
                return serverInfo;
            }
        }
    }
    return serverInfo;
};

// Función para obtener la IP del cliente
const getClientInfo = (req) => {
    return {
        ip: req.ip || 
            req.connection.remoteAddress || 
            req.socket.remoteAddress || 
            req.connection.socket?.remoteAddress || 
            '0.0.0.0'
    };
};

// Función para calcular la duración de la sesión
const calculateDuration = (sessionData) => {
    const now = new Date();
    return now - sessionData.createAt;
};

// Función para calcular el tiempo de inactividad
const calculateIdleTime = (sessionData) => {
    const now = new Date();
    return now - sessionData.lastAccesed;
};

// Endpoint de bienvenida
app.get('/', (request, response) => {
    return response.status(200).json({ message: "Bienvenid@ al API de Control de Sesiones", author: "Marcos Jesus Ríos Duran" });
});

// Endpoint de logeo (login)
app.post('/login', (request, response) => {
    const { email, nickname, macAddress, fullName } = request.body;

    if (!email || !nickname || !macAddress || !fullName) {
        return response.status(400).json({ message: "Se esperan campos requeridos" });
    }

    const sessionId = uuidv4();
    const now = new Date();
    const serverInfo = getServerInfo();
    const clientInfo = getClientInfo(request);

    const sessionData = {
        sessionId,
        email,
        nickname,
        fullName,
        clientInfo: {
            ip: clientInfo.ip,
            mac: macAddress
        },
        serverInfo: {
            ip: serverInfo.ip,
            mac: serverInfo.mac
        },
        createAt: now,
        lastAccesed: now
    };

    sessions.set(sessionId, sessionData);
    request.session.userSession = sessionData;

    console.log('Sesion creada', sessionData);

    response.status(200).json({
        message: "Se ha logueado exitosamente",
        sessionId,
        sessionData
    });
});

// Endpoint de cierre de sesión (logout)
app.post("/logout", (request, response) => {
    const { sessionId } = request.body;

    if (!sessionId || !sessions.has(sessionId)) {
        return response.status(404).json({ message: "No se ha encontrado una sesión activa." });
    }

    sessions.delete(sessionId);
    request.session.destroy((err) => {
        if (err) {
            return response.status(500).json({ message: 'Error al cerrar sesión' });
        }
        response.status(200).json({ message: "Logout successful" });
    });
});

// Endpoint de actualización de sesión (update)
app.put("/update", (request, response) => {
    const { sessionId } = request.body;

    if (!sessionId || !sessions.has(sessionId)) {
        return response.status(404).json({ message: "No existe una sesión activa" });
    }

    const sessionData = sessions.get(sessionId);
    const serverInfo = getServerInfo();
    const clientInfo = getClientInfo(request);

    sessionData.lastAccesed = new Date();
    sessionData.clientInfo.ip = clientInfo.ip;
    sessionData.serverInfo = {
        ip: serverInfo.ip,
        mac: serverInfo.mac
    };

    sessions.set(sessionId, sessionData);
    request.session.userSession = sessionData;

    return response.status(200).json({
        message: "Sesión actualizada correctamente",
        session: sessionData
    });
});

// Endpoint de estado de la sesión (status)
app.get("/status", (request, response) => {
    const { sessionId } = request.body;

    if (!sessionId) {
        return response.status(400).json({ message: "Se requiere un sessionId" });
    }

    const sessionData = sessions.get(sessionId);
    if (!sessionData) {
        return response.status(404).json({ message: "No se encontró la sesión" });
    }

    const serverInfo = getServerInfo();
    sessionData.serverInfo = serverInfo;

    const clientInfo = getClientInfo(request);
    sessionData.clientInfo.ip = clientInfo.ip;

    const duration = calculateDuration(sessionData);
    const idleTime = calculateIdleTime(sessionData);

    return response.status(200).json({
        message: "Sesión Activa",
        session: sessionData,
        duration,
        idleTime
    });
});

// Endpoint de listar sesiones activas (listCurrentSessions)
app.get("/listCurrentSessions", (request, response) => {
    if (sessions.size === 0) {
        return response.status(200).json({
            message: "No hay sesiones activas",
            count: 0,
            sessions: []
        });
    }

    const serverInfo = getServerInfo();
    const clientInfo = getClientInfo(request);

    const activeSessions = Array.from(sessions.values()).map(session => ({
        sessionId: session.sessionId,
        email: session.email,
        nickname: session.nickname,
        fullName: session.fullName,
        clientInfo: {
            ip: clientInfo.ip,
            mac: session.clientInfo.mac
        },
        serverInfo: {
            ip: serverInfo.ip,
            mac: serverInfo.mac
        },
        createAt: session.createAt,
        lastAccesed: session.lastAccesed,
        duration: calculateDuration(session),
        idleTime: calculateIdleTime(session)
    }));

    return response.status(200).json({
        message: "Sesiones activas encontradas",
        count: activeSessions.length,
        sessions: activeSessions
    });
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor iniciado en http://localhost:${PORT}`);
    const serverInfo = getServerInfo();
    console.log(`Información del servidor:`, serverInfo);
});
