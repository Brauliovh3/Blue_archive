const fs = require('fs');
const crypto = require('crypto');
const axios = require('axios');
const cheerio = require('cheerio');
const { fileTypeFromBuffer } = require('file-type');
const chalk = require('chalk');
const moment = require('moment-timezone');

// Configuración
const config = require('../config/config.json');

// Función para procesar mensajes
const smsg = (sock, m, store) => {
    if (!m) return m;
    
    let M = proto.WebMessageInfo;
    if (m.key) {
        M.id = m.key.id;
        M.isBaileys = m.key.id.startsWith('BAE5') && m.key.id.length === 16;
        M.chat = m.key.remoteJid;
        M.fromMe = m.key.fromMe;
        M.isGroup = M.chat.endsWith('@g.us');
        M.sender = sock.decodeJid(m.participant || m.key.participant || M.chat || '');
        if (M.isGroup) M.participant = sock.decodeJid(m.key.participant) || '';
    }
    
    if (m.message) {
        M.mtype = getContentType(m.message);
        M.msg = (M.mtype == 'viewOnceMessage' ? m.message[M.mtype].message[getContentType(m.message[M.mtype].message)] : m.message[M.mtype]);
        M.body = (M.mtype === 'conversation') ? m.message.conversation : 
                 (M.mtype == 'imageMessage') ? m.message.imageMessage.caption : 
                 (M.mtype == 'videoMessage') ? m.message.videoMessage.caption : 
                 (M.mtype == 'extendedTextMessage') ? m.message.extendedTextMessage.text : 
                 (M.mtype == 'buttonsResponseMessage') ? m.message.buttonsResponseMessage.selectedButtonId : 
                 (M.mtype == 'listResponseMessage') ? m.message.listResponseMessage.singleSelectReply.selectedRowId : 
                 (M.mtype == 'templateButtonReplyMessage') ? m.message.templateButtonReplyMessage.selectedId : 
                 (M.mtype === 'messageContextInfo') ? (m.message.buttonsResponseMessage?.selectedButtonId || m.message.listResponseMessage?.singleSelectReply.selectedRowId || m.text) : '';
        
        let quoted = M.quoted = m.message.extendedTextMessage?.contextInfo?.quotedMessage || null;
        M.mentionedJid = m.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
        
        if (quoted) {
            let type = getContentType(quoted);
            M.quoted = M.quoted[type];
            if (['productMessage'].includes(type)) {
                type = getContentType(M.quoted);
                M.quoted = M.quoted[type];
            }
            if (typeof M.quoted === 'string') M.quoted = {
                text: M.quoted
            };
            M.quoted.mtype = type;
            M.quoted.id = m.message.extendedTextMessage.contextInfo.stanzaId;
            M.quoted.chat = m.message.extendedTextMessage.contextInfo.remoteJid || M.chat;
            M.quoted.isBaileys = M.quoted.id ? M.quoted.id.startsWith('BAE5') && M.quoted.id.length === 16 : false;
            M.quoted.sender = sock.decodeJid(m.message.extendedTextMessage.contextInfo.participant || '');
            M.quoted.fromMe = M.quoted.sender === sock.decodeJid(sock.user.id);
            M.quoted.text = M.quoted.text || M.quoted.caption || M.quoted.conversation || M.quoted.contentText || M.quoted.selectedDisplayText || M.quoted.title || '';
            M.quoted.mentionedJid = m.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
            M.getQuotedObj = M.getQuotedMessage = async () => {
                if (!M.quoted.id) return false;
                let q = await store.loadMessage(M.chat, M.quoted.id, sock);
                return exports.smsg(sock, q, store);
            };
            
            let vM = M.quoted.fakeObj = M.fromMe ? sock.user : {};
            vM.key = {
                remoteJid: M.quoted.chat,
                fromMe: M.quoted.fromMe,
                id: M.quoted.id
            };
            vM.message = quoted;
            vM.participant = M.quoted.sender;
            vM.pushName = M.quoted.pushName;
            vM.isGroup = M.quoted.chat.endsWith('@g.us');
        }
    }
    
    if (M.msg?.url) M.download = () => downloadMediaMessage(M.msg);
    M.text = M.msg?.text || M.msg?.caption || M.message?.conversation || M.msg?.contentText || M.msg?.selectedDisplayText || M.msg?.title || '';
    M.reply = (text, chatId = M.chat, options = {}) => Buffer.isBuffer(text) ? sock.sendMedia(chatId, text, 'file', '', M, { ...options }) : sock.sendText(chatId, text, M, { ...options });
    M.copy = () => exports.smsg(sock, M, store);
    M.copyNForward = (jid = M.chat, forceForward = false, options = {}) => sock.copyNForward(jid, M, forceForward, options);
    
    // Procesamiento del comando
    M.body = M.body || '';
    M.isCmd = M.body.startsWith(config.prefix);
    M.command = M.isCmd ? M.body.slice(config.prefix.length).trim().split(' ').shift().toLowerCase() : '';
    M.args = M.body.trim().split(/ +/).slice(1);
    M.pushname = m.pushName || "Sin nombre";
    M.botNumber = sock.decodeJid(sock.user.id);
    M.itsMe = M.sender && M.sender == M.botNumber;
    M.text = M.args.join(' ');
    M.q = M.quoted ? M.quoted : M;
    M.isMedia = (M.mtype === 'imageMessage' || M.mtype === 'videoMessage');
    M.isImage = (M.mtype === 'imageMessage');
    M.isVideo = (M.mtype === 'videoMessage');
    M.isAudio = (M.mtype === 'audioMessage');
    M.isSticker = (M.mtype === 'stickerMessage');
    M.isContact = (M.mtype === 'contactMessage');
    M.isLocation = (M.mtype === 'locationMessage');
    M.isQuotedImage = M.mtype === 'extendedTextMessage' && M.msg?.contextInfo?.quotedMessage?.imageMessage;
    M.isQuotedVideo = M.mtype === 'extendedTextMessage' && M.msg?.contextInfo?.quotedMessage?.videoMessage;
    M.isQuotedAudio = M.mtype === 'extendedTextMessage' && M.msg?.contextInfo?.quotedMessage?.audioMessage;
    M.isQuotedSticker = M.mtype === 'extendedTextMessage' && M.msg?.contextInfo?.quotedMessage?.stickerMessage;
    M.isQuotedContact = M.mtype === 'extendedTextMessage' && M.msg?.contextInfo?.quotedMessage?.contactMessage;
    M.isQuotedLocation = M.mtype === 'extendedTextMessage' && M.msg?.contextInfo?.quotedMessage?.locationMessage;
    M.isQuotedDocument = M.mtype === 'extendedTextMessage' && M.msg?.contextInfo?.quotedMessage?.documentMessage;
    
    return M;
};

// Obtener tipo de contenido
const getContentType = (content) => {
    if (content) {
        const keys = Object.keys(content);
        const key = keys.find(k => (k === 'conversation' || k.endsWith('Message')) && k !== 'senderKeyDistributionMessage');
        return key;
    }
};

// Función para descargar media
const downloadMediaMessage = async (message) => {
    let quoted = message.msg ? message.msg : message;
    let mtype = (message.msg || message).mimetype || '';
    let messageType = message.mtype ? message.mtype.replace('Message', '') : mtype.split('/')[0];
    
    const stream = await downloadContentFromMessage(quoted, messageType);
    let buffer = Buffer.from([]);
    
    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
    }
    
    return buffer;
};

// Función para verificar si es URL
const isUrl = (url) => {
    return url.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/, 'gi'));
};

// Función para generar ID único
const generateMessageTag = (epoch) => {
    let tag = (epoch || Date.now()).toString();
    return tag;
};

// Función para obtener buffer de URL
const getBuffer = async (url, options = {}) => {
    try {
        const res = await axios({
            method: 'get',
            url,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36'
            },
            ...options,
            responseType: 'arraybuffer'
        });
        return res.data;
    } catch (error) {
        throw new Error(`Error al obtener buffer: ${error.message}`);
    }
};

// Función para obtener tamaño de media
const getSizeMedia = (path) => {
    return new Promise((resolve, reject) => {
        if (/http/.test(path)) {
            axios.head(path)
                .then((res) => {
                    let length = parseInt(res.headers['content-length']);
                    let size = exports.formatSize(length);
                    if(!isNaN(length)) resolve(size);
                })
                .catch(reject);
        } else if (Buffer.isBuffer(path)) {
            let length = Buffer.byteLength(path);
            let size = exports.formatSize(length);
            resolve(size);
        } else {
            reject(new Error('Formato no válido'));
        }
    });
};

// Función para formatear tamaño
const formatSize = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Función para hacer petición JSON
const fetchJson = async (url, options = {}) => {
    try {
        const res = await axios({
            method: 'GET',
            url: url,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36'
            },
            ...options
        });
        return res.data;
    } catch (error) {
        throw new Error(`Error al obtener JSON: ${error.message}`);
    }
};

// Función para dormir/esperar
const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

// Función para formatear tiempo
const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
        return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
};

// Función para obtener tiempo actual
const getTime = (format = 'DD/MM/YY HH:mm:ss') => {
    return moment().tz(config.timezone).format(format);
};

// Función para generar color aleatorio
const randomColor = () => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'];
    return colors[Math.floor(Math.random() * colors.length)];
};

// Función para limpiar texto
const cleanText = (text) => {
    return text.replace(/[^\w\s]/gi, '').trim();
};

// Función para capitalizar primera letra
const capitalize = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// Función para generar hash MD5
const generateHash = (text) => {
    return crypto.createHash('md5').update(text).digest('hex');
};

// Función para verificar si es número
const isNumber = (x) => {
    return typeof x === 'number' && !isNaN(x);
};

// Función para formatear número
const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// Función para obtener extensión de archivo
const getFileExtension = (filename) => {
    return filename.split('.').pop();
};

// Función para generar string aleatorio
const randomString = (length = 8) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

// Función para parsear menciones
const parseMentions = (text) => {
    return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(v => v[1] + '@s.whatsapp.net');
};

// Función para verificar si es admin
const isAdmin = (participant, groupMetadata) => {
    return groupMetadata.participants.find(p => p.id === participant)?.admin !== null;
};

// Función para obtener participantes del grupo
const getGroupAdmins = (participants) => {
    return participants.filter(p => p.admin !== null).map(p => p.id);
};

// Función para log con colores
const logger = {
    info: (message) => console.log(chalk.blue(`[INFO] ${getTime()} - ${message}`)),
    success: (message) => console.log(chalk.green(`[SUCCESS] ${getTime()} - ${message}`)),
    warning: (message) => console.log(chalk.yellow(`[WARNING] ${getTime()} - ${message}`)),
    error: (message) => console.log(chalk.red(`[ERROR] ${getTime()} - ${message}`)),
    debug: (message) => console.log(chalk.gray(`[DEBUG] ${getTime()} - ${message}`))
};

// Función para validar JID
const isValidJid = (jid) => {
    return /^[\w.-]+@[\w.-]+\.(s\.whatsapp\.net|g\.us)$/.test(jid);
};

// Función para obtener nombre del archivo sin extensión
const getBaseName = (filename) => {
    return filename.split('.').slice(0, -1).join('.');
};

// Función para formatear duración
const formatDuration = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
};

// Función para obtener info del archivo
const getFileInfo = async (buffer) => {
    try {
        const type = await fileTypeFromBuffer(buffer);
        return {
            ext: type?.ext || 'unknown',
            mime: type?.mime || 'application/octet-stream',
            size: buffer.length,
            sizeFormatted: formatSize(buffer.length)
        };
    } catch (error) {
        return {
            ext: 'unknown',
            mime: 'application/octet-stream',
            size: buffer.length,
            sizeFormatted: formatSize(buffer.length)
        };
    }
};

// Función para crear directorio si no existe
const ensureDir = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

// Función para leer archivo JSON
const readJSON = (path) => {
    try {
        if (fs.existsSync(path)) {
            return JSON.parse(fs.readFileSync(path, 'utf8'));
        }
        return {};
    } catch (error) {
        logger.error(`Error leyendo JSON ${path}: ${error.message}`);
        return {};
    }
};

// Función para escribir archivo JSON
const writeJSON = (path, data) => {
    try {
        fs.writeFileSync(path, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        logger.error(`Error escribiendo JSON ${path}: ${error.message}`);
        return false;
    }
};

// Exportar todas las funciones
module.exports = {
    smsg,
    getContentType,
    downloadMediaMessage,
    isUrl,
    generateMessageTag,
    getBuffer,
    getSizeMedia,
    formatSize,
    fetchJson,
    sleep,
    formatTime,
    getTime,
    randomColor,
    cleanText,
    capitalize,
    generateHash,
    isNumber,
    formatNumber,
    getFileExtension,
    randomString,
    parseMentions,
    isAdmin,
    getGroupAdmins,
    logger,
    isValidJid,
    getBaseName,
    formatDuration,
    getFileInfo,
    ensureDir,
    readJSON,
    writeJSON
};