const { formatTime, getTime } = require('../lib/functions');
const config = require('../config/config.json');

module.exports = {
    name: 'menu',
    aliases: ['help', 'comandos'],
    category: 'info',
    description: 'Muestra el menú de comandos disponibles',
    usage: '/menu [categoría]',
    cooldown: 5,
    
    execute: async (sock, msg, args) => {
        try {
            const { from, pushname, prefix } = msg;
            
            // Obtener información del bot
            const botInfo = {
                name: config.botName || 'Blue Archive Bot',
                version: config.botVersion || '1.0.0',
                prefix: config.prefix || '/',
                uptime: process.uptime(),
                memory: process.memoryUsage()
            };
            
            const categories = {
                info: '📋 *INFORMACIÓN*',
                anime: '🎮 *BLUE ARCHIVE*',
                stickers: '🎨 *STICKERS*',
                fun: '🎉 *DIVERSIÓN*',
                music: '🎵 *MÚSICA*',
                tools: '🛠️ *HERRAMIENTAS*',
                admin: '👑 *ADMINISTRACIÓN*',
                owner: '👨‍💻 *PROPIETARIO*'
            };
            
            const commands = {
                info: [
                    { name: 'menu', desc: 'Muestra este menú' },
                    { name: 'info', desc: 'Información del bot' },
                    { name: 'ping', desc: 'Velocidad del bot' },
                    { name: 'uptime', desc: 'Tiempo activo del bot' },
                    { name: 'runtime', desc: 'Información del sistema' }
                ],
                anime: [
                    { name: 'student', desc: 'Información de estudiante' },
                    { name: 'sensei', desc: 'Perfil de sensei' },
                    { name: 'gacha', desc: 'Simulador de gacha' },
                    { name: 'raid', desc: 'Información de raids' },
                    { name: 'event', desc: 'Eventos actuales' },
                    { name: 'tier', desc: 'Tier list de estudiantes' }
                ],
                stickers: [
                    { name: 'sticker', desc: 'Crear sticker desde imagen' },
                    { name: 'stickergif', desc: 'Crear sticker animado' },
                    { name: 'attp', desc: 'Texto a sticker' },
                    { name: 'ttp', desc: 'Texto a imagen' },
                    { name: 'emojimix', desc: 'Mezclar emojis' }
                ],
                fun: [
                    { name: 'ship', desc: 'Compatibilidad entre usuarios' },
                    { name: '8ball', desc: 'Bola mágica 8' },
                    { name: 'roll', desc: 'Lanzar dados' },
                    { name: 'coin', desc: 'Lanzar moneda' },
                    { name: 'meme', desc: 'Meme aleatorio' },
                    { name: 'joke', desc: 'Chiste aleatorio' }
                ],
                music: [
                    { name: 'play', desc: 'Reproducir música' },
                    { name: 'ytmp3', desc: 'Descargar audio de YouTube' },
                    { name: 'ytmp4', desc: 'Descargar video de YouTube' },
                    { name: 'spotify', desc: 'Información de Spotify' },
                    { name: 'lyrics', desc: 'Letras de canciones' }
                ],
                tools: [
                    { name: 'calc', desc: 'Calculadora' },
                    { name: 'translate', desc: 'Traductor' },
                    { name: 'qr', desc: 'Generar código QR' },
                    { name: 'weather', desc: 'Clima actual' },
                    { name: 'short', desc: 'Acortar URL' },
                    { name: 'tts', desc: 'Texto a voz' }
                ],
                admin: [
                    { name: 'kick', desc: 'Expulsar miembro' },
                    { name: 'add', desc: 'Agregar miembro' },
                    { name: 'promote', desc: 'Promover a admin' },
                    { name: 'demote', desc: 'Quitar admin' },
                    { name: 'mute', desc: 'Silenciar grupo' },
                    { name: 'unmute', desc: 'Abrir grupo' },
                    { name: 'delete', desc: 'Eliminar mensaje' },
                    { name: 'tagall', desc: 'Mencionar a todos' }
                ],
                owner: [
                    { name: 'eval', desc: 'Evaluar código' },
                    { name: 'exec', desc: 'Ejecutar comando' },
                    { name: 'restart', desc: 'Reiniciar bot' },
                    { name: 'backup', desc: 'Hacer respaldo' },
                    { name: 'broadcast', desc: 'Difundir mensaje' },
                    { name: 'ban', desc: 'Banear usuario' },
                    { name: 'unban', desc: 'Desbanear usuario' }
                ]
            };
            
            // Si se especifica una categoría
            if (args[0] && categories[args[0].toLowerCase()]) {
                const category = args[0].toLowerCase();
                const categoryCommands = commands[category] || [];
                
                let categoryMenu = `╭─────────────────────╮\n`;
                categoryMenu += `│  ${categories[category]}\n`;
                categoryMenu += `├─────────────────────┤\n`;
                categoryMenu += `│ 🤖 *Bot:* ${botInfo.name}\n`;
                categoryMenu += `│ 📊 *Versión:* ${botInfo.version}\n`;
                categoryMenu += `│ 👤 *Usuario:* ${pushname}\n`;
                categoryMenu += `│ 🕐 *Hora:* ${getTime()}\n`;
                categoryMenu += `╰─────────────────────╯\n\n`;
                
                categoryCommands.forEach((cmd, index) => {
                    categoryMenu += `${index + 1}. *${prefix}${cmd.name}*\n`;
                    categoryMenu += `   └ ${cmd.desc}\n\n`;
                });
                
                categoryMenu += `╭─────────────────────╮\n`;
                categoryMenu += `│ 💡 *Usa ${prefix}menu para*\n`;
                categoryMenu += `│ *ver todas las categorías*\n`;
                categoryMenu += `╰─────────────────────╯`;
                
                return sock.sendMessage(from, { text: categoryMenu });
            }
            
            // Menú principal
            let menuText = `╭─────────────────────╮\n`;
            menuText += `│    🎮 *BLUE ARCHIVE BOT*\n`;
            menuText += `├─────────────────────┤\n`;
            menuText += `│ 🤖 *Bot:* ${botInfo.name}\n`;
            menuText += `│ 📊 *Versión:* ${botInfo.version}\n`;
            menuText += `│ 👤 *Usuario:* ${pushname}\n`;
            menuText += `│ 🕐 *Hora:* ${getTime()}\n`;
            menuText += `│ ⚡ *Uptime:* ${formatTime(botInfo.uptime)}\n`;
            menuText += `│ 🔧 *Prefix:* ${prefix}\n`;
            menuText += `╰─────────────────────╯\n\n`;
            
            // Agregar categorías
            Object.keys(categories).forEach((category, index) => {
                const commandCount = commands[category]?.length || 0;
                menuText += `${index + 1}. ${categories[category]}\n`;
                menuText += `   └ *${commandCount} comandos* • ${prefix}menu ${category}\n\n`;
            });
            
            menuText += `╭─────────────────────╮\n`;
            menuText += `│ 💡 *Cómo usar:*\n`;
            menuText += `│ • ${prefix}menu [categoría]\n`;
            menuText += `│ • ${prefix}comando [parámetros]\n`;
            menuText += `│\n`;
            menuText += `│ 📝 *Ejemplos:*\n`;
            menuText += `│ • ${prefix}menu anime\n`;
            menuText += `│ • ${prefix}student kokona\n`;
            menuText += `│ • ${prefix}sticker (responder img)\n`;
            menuText += `│\n`;
            menuText += `│ 📞 *Soporte:*\n`;
            menuText += `│ • Canal: t.me/bluearchivebot\n`;
            menuText += `│ • Grupo: t.me/bluearchive_help\n`;
            menuText += `╰─────────────────────╯\n\n`;
            
            // Estadísticas del bot
            const totalCommands = Object.values(commands).reduce((total, categoryCommands) => total + categoryCommands.length, 0);
            const memoryUsed = Math.round(botInfo.memory.heapUsed / 1024 / 1024);
            
            menuText += `╭─────────────────────╮\n`;
            menuText += `│ 📊 *ESTADÍSTICAS*\n`;
            menuText += `├─────────────────────┤\n`;
            menuText += `│ 📋 *Total comandos:* ${totalCommands}\n`;
            menuText += `│ 🗂️ *Categorías:* ${Object.keys(categories).length}\n`;
            menuText += `│ 💾 *Memoria:* ${memoryUsed}MB\n`;
            menuText += `│ 🟢 *Estado:* Online\n`;
            menuText += `╰─────────────────────╯`;
            
            // Enviar el menú
            await sock.sendMessage(from, { text: menuText });
            
        } catch (error) {
            console.error('Error en comando menu:', error);
            
            // Mensaje de error más amigable
            const errorMsg = `╭─────────────────────╮\n`;
            errorMsg += `│ ❌ *ERROR EN MENÚ*\n`;
            errorMsg += `├─────────────────────┤\n`;
            errorMsg += `│ Ocurrió un error al\n`;
            errorMsg += `│ mostrar el menú.\n`;
            errorMsg += `│\n`;
            errorMsg += `│ 🔄 *Intenta de nuevo*\n`;
            errorMsg += `│ 📞 *Reporta el error*\n`;
            errorMsg += `╰─────────────────────╯`;
            
            await sock.sendMessage(from, { text: errorMsg });
        }
    }
};