const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, generateWAMessageFromContent, prepareWAMessageMedia, generateWAMessageContent, generateMessageID, downloadContentFromMessage, makeInMemoryStore, jidDecode, proto } = require("@whiskeysockets/baileys");
const fs = require('fs');
const pino = require('pino');
const chalk = require('chalk');
const readline = require('readline');
const path = require('path');
const { Boom } = require('@hapi/boom');
const NodeCache = require('node-cache');

// Configuraciones
const config = require('./config/config.json');
const { smsg, isUrl, generateMessageTag, getBuffer, getSizeMedia, fetchJson, sleep } = require('./lib/functions');
const { imageToWebp, videoToWebp, writeExifImg, writeExifVid } = require('./lib/exif');

// Base de datos simple
const database = {
    users: new Map(),
    groups: new Map(),
    settings: new Map()
};

// Cache para optimizar rendimiento
const msgRetryCounterCache = new NodeCache();

// Store para mensajes
const store = makeInMemoryStore({
    logger: pino().child({ level: 'silent', stream: 'store' })
});

// Función principal del bot
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth');
    const { version, isLatest } = await fetchLatestBaileysVersion();
    
    console.log(chalk.green(`📱 Usando WA v${version.join('.')}, isLatest: ${isLatest}`));
    
    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
        auth: state,
        msgRetryCounterCache,
        generateHighQualityLinkPreview: true,
        shouldSyncHistoryMessage: msg => {
            console.log(chalk.yellow(`📨 Sincronizando historial: ${msg.key && msg.key.remoteJid ? msg.key.remoteJid : 'Desconocido'}`));
            return !!msg.key && jidDecode(msg.key.remoteJid)?.server !== 'g.us';
        },
        shouldIgnoreJid: jid => isJidBroadcast(jid),
        browser: ['Blue Archive Bot', 'Desktop', '3.0'],
        keepAliveIntervalMs: 30000,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        emitOwnEvents: true,
        fireInitQueries: true,
        generateTags: generateMessageTag,
        ignoreBroadcastJid: false,
        interactive: false,
        printQRInTerminal: true,
        syncFullHistory: true,
        markOnlineOnConnect: true,
        msgRetryCounterMap: msgRetryCounterCache
    });

    store.bind(sock.ev);

    // Evento de conexión
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log(chalk.cyan('🔗 Escanea el código QR para conectar'));
        }
        
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(chalk.red('❌ Conexión cerrada debido a'), lastDisconnect.error, chalk.yellow('🔄 Reconectando...'), shouldReconnect);
            
            if (shouldReconnect) {
                setTimeout(startBot, 3000);
            }
        } else if (connection === 'open') {
            console.log(chalk.green('✅ Bot conectado exitosamente'));
            console.log(chalk.blue('🎮 Blue Archive Bot v3.0 - Listo para funcionar'));
            
            // Enviar mensaje de inicio a los administradores
            for (const admin of config.admins) {
                try {
                    await sock.sendMessage(admin, {
                        text: `🎮 *Blue Archive Bot v3.0*\n\n✅ Bot iniciado correctamente\n⏰ Tiempo: ${new Date().toLocaleString()}\n\n¡Listo para usar!`
                    });
                } catch (error) {
                    console.log(chalk.red('❌ Error enviando mensaje de inicio a admin:', error));
                }
            }
        }
    });

    // Guardar credenciales
    sock.ev.on('creds.update', saveCreds);

    // Manejar mensajes
    sock.ev.on('messages.upsert', async (m) => {
        try {
            const mek = m.messages[0];
            if (!mek.message) return;
            
            const msg = await smsg(sock, mek, store);
            
            // Ignorar mensajes del bot
            if (msg.key.fromMe) return;
            
            // Procesar comando
            await processMessage(sock, msg);
            
        } catch (error) {
            console.error(chalk.red('❌ Error procesando mensaje:'), error);
        }
    });

    // Manejar actualizaciones de grupos
    sock.ev.on('groups.update', async (updates) => {
        for (const update of updates) {
            const id = update.id;
            if (update.announce == true) {
                await sock.sendMessage(id, { text: '🔒 El grupo ahora está cerrado para todos los miembros' });
            } else if (update.announce == false) {
                await sock.sendMessage(id, { text: '🔓 El grupo ahora está abierto para todos los miembros' });
            }
        }
    });

    // Manejar participantes de grupo
    sock.ev.on('group-participants.update', async (anu) => {
        try {
            const metadata = await sock.groupMetadata(anu.id);
            const participants = anu.participants;
            
            for (const num of participants) {
                const profile = await sock.profilePictureUrl(num, 'image').catch(() => './assets/default-avatar.jpg');
                
                if (anu.action === 'add') {
                    const welcomeText = `🎉 *Bienvenido/a a ${metadata.subject}*\n\n👋 Hola @${num.split('@')[0]}\n\n🎮 ¡Bienvenido/a al mundo de Blue Archive!\n\n📝 Usa /menu para ver los comandos disponibles`;
                    
                    await sock.sendMessage(anu.id, {
                        text: welcomeText,
                        mentions: [num]
                    });
                } else if (anu.action === 'remove') {
                    const byeText = `👋 *Adiós*\n\n@${num.split('@')[0]} ha salido del grupo\n\n¡Esperamos verte pronto de nuevo! 💙`;
                    
                    await sock.sendMessage(anu.id, {
                        text: byeText,
                        mentions: [num]
                    });
                }
            }
        } catch (error) {
            console.error(chalk.red('❌ Error en grupo:'), error);
        }
    });

    return sock;
}

// Procesar mensajes y comandos
async function processMessage(sock, msg) {
    try {
        const { body, isGroup, sender, from, isCmd, command, args, prefix, pushname } = msg;
        
        // Registrar usuario si no existe
        if (!database.users.has(sender)) {
            database.users.set(sender, {
                id: sender,
                name: pushname,
                exp: 0,
                level: 1,
                registered: false,
                premium: false,
                banned: false,
                warn: 0,
                joinDate: new Date().toISOString()
            });
        }

        // Anti-spam básico
        if (msg.isSpam) {
            return sock.sendMessage(from, { text: '⚠️ No hagas spam, espera un momento antes de enviar otro mensaje.' });
        }

        // Log de mensajes
        if (isCmd) {
            console.log(chalk.blue(`📝 Comando: ${command}`), chalk.green(`De: ${pushname}`), chalk.yellow(`En: ${isGroup ? 'Grupo' : 'Privado'}`));
        }

        // Cargar comandos dinámicamente
        if (isCmd) {
            const commandPath = path.join(__dirname, 'commands', `${command}.js`);
            
            if (fs.existsSync(commandPath)) {
                delete require.cache[require.resolve(commandPath)];
                const commandModule = require(commandPath);
                
                if (typeof commandModule.execute === 'function') {
                    await commandModule.execute(sock, msg, args);
                } else {
                    console.log(chalk.red(`❌ El comando ${command} no tiene función execute`));
                }
            } else {
                // Comando no encontrado
                await sock.sendMessage(from, {
                    text: `❌ Comando *${command}* no encontrado.\n\n📝 Usa *${prefix}menu* para ver los comandos disponibles.`
                });
            }
        }

        // Auto-respuestas
        if (body && !isCmd) {
            // Respuestas automáticas de Blue Archive
            const autoResponses = {
                'sensei': '👨‍🏫 ¡Hola, Sensei! ¿En qué puedo ayudarte hoy?',
                'blue archive': '🎮 ¡Blue Archive es el mejor juego de estrategia móvil!',
                'hola': '👋 ¡Hola! ¿Cómo estás? Usa /menu para ver mis comandos.',
                'ayuda': '📝 Usa /menu para ver todos los comandos disponibles.',
                'gracias': '😊 ¡De nada! Siempre aquí para ayudarte.',
            };

            const lowerBody = body.toLowerCase();
            for (const [trigger, response] of Object.entries(autoResponses)) {
                if (lowerBody.includes(trigger)) {
                    await sock.sendMessage(from, { text: response });
                    break;
                }
            }
        }

    } catch (error) {
        console.error(chalk.red('❌ Error procesando mensaje:'), error);
        await sock.sendMessage(msg.from, { text: '❌ Ocurrió un error al procesar tu mensaje.' });
    }
}


function isJidBroadcast(jid) {
    return jid && jid.endsWith('@broadcast');
}

// Iniciar el bot
startBot().catch(err => {
    console.error(chalk.red('❌ Error iniciando bot:'), err);
    process.exit(1);
});

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
    console.error(chalk.red('❌ Error no capturado:'), error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error(chalk.red('❌ Promesa rechazada:'), reason);
});