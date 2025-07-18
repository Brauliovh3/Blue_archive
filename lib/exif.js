const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const webp = require('node-webpmux');
const config = require('../config/config.json');

// Función para convertir imagen a WebP
const imageToWebp = (media) => {
    return new Promise((resolve, reject) => {
        const tmpFileOut = path.join(__dirname, '../temp/', `${Date.now()}.webp`);
        const tmpFileIn = path.join(__dirname, '../temp/', `${Date.now()}.jpg`);
        
        // Asegurar que el directorio temp existe
        if (!fs.existsSync(path.dirname(tmpFileOut))) {
            fs.mkdirSync(path.dirname(tmpFileOut), { recursive: true });
        }
        
        fs.writeFileSync(tmpFileIn, media);
        
        const ffmpeg = spawn('ffmpeg', [
            '-i', tmpFileIn,
            '-vf', 'scale=512:512:force_original_aspect_ratio=increase,crop=512:512',
            '-fps_mode', 'vfr',
            '-pix_fmt', 'yuv420p',
            '-v', 'quiet',
            tmpFileOut
        ]);
        
        ffmpeg.on('error', (err) => {
            fs.unlinkSync(tmpFileIn);
            reject(err);
        });
        
        ffmpeg.on('close', (code) => {
            fs.unlinkSync(tmpFileIn);
            if (code !== 0) {
                reject(new Error(`FFmpeg exited with code ${code}`));
                return;
            }
            
            const buff = fs.readFileSync(tmpFileOut);
            fs.unlinkSync(tmpFileOut);
            resolve(buff);
        });
    });
};

// Función para convertir video a WebP
const videoToWebp = (media) => {
    return new Promise((resolve, reject) => {
        const tmpFileOut = path.join(__dirname, '../temp/', `${Date.now()}.webp`);
        const tmpFileIn = path.join(__dirname, '../temp/', `${Date.now()}.mp4`);
        
        // Asegurar que el directorio temp existe
        if (!fs.existsSync(path.dirname(tmpFileOut))) {
            fs.mkdirSync(path.dirname(tmpFileOut), { recursive: true });
        }
        
        fs.writeFileSync(tmpFileIn, media);
        
        const ffmpeg = spawn('ffmpeg', [
            '-i', tmpFileIn,
            '-vf', 'scale=512:512:force_original_aspect_ratio=increase,crop=512:512,fps=15',
            '-loop', '0',
            '-ss', '00:00:00',
            '-t', '00:00:06',
            '-preset', 'default',
            '-an',
            '-vsync', '0',
            '-s', '512x512',
            '-v', 'quiet',
            tmpFileOut
        ]);
        
        ffmpeg.on('error', (err) => {
            fs.unlinkSync(tmpFileIn);
            reject(err);
        });
        
        ffmpeg.on('close', (code) => {
            fs.unlinkSync(tmpFileIn);
            if (code !== 0) {
                reject(new Error(`FFmpeg exited with code ${code}`));
                return;
            }
            
            const buff = fs.readFileSync(tmpFileOut);
            fs.unlinkSync(tmpFileOut);
            resolve(buff);
        });
    });
};

// Función para escribir metadata EXIF en imagen
const writeExifImg = async (media, metadata = {}) => {
    try {
        const tmpFileIn = path.join(__dirname, '../temp/', `${Date.now()}.webp`);
        const tmpFileOut = path.join(__dirname, '../temp/', `${Date.now()}_exif.webp`);
        
        // Asegurar que el directorio temp existe
        if (!fs.existsSync(path.dirname(tmpFileIn))) {
            fs.mkdirSync(path.dirname(tmpFileIn), { recursive: true });
        }
        
        fs.writeFileSync(tmpFileIn, media);
        
        const img = new webp.Image();
        await img.load(tmpFileIn);
        
        const exifData = {
            'sticker-pack-id': metadata.packId || 'com.blueArchive.wasticker',
            'sticker-pack-name': metadata.packName || config.stickers.packName,
            'sticker-pack-publisher': metadata.authorName || config.stickers.authorName,
            'sticker-pack-publisher-email': metadata.publisherEmail || '',
            'sticker-pack-publisher-website': metadata.publisherWebsite || '',
            'sticker-pack-description': metadata.packDescription || 'Blue Archive Sticker Pack',
            'sticker-pack-version': metadata.packVersion || '1.0.0',
            'sticker-pack-license': metadata.packLicense || '',
            'sticker-pack-privacy-policy': metadata.privacyPolicy || '',
            'sticker-pack-tray-icon': metadata.trayIcon || '',
            'sticker-pack-category': metadata.category || 'Anime',
            'sticker-pack-animated': metadata.animated || false,
            'android-app-store-link': metadata.androidLink || '',
            'ios-app-store-link': metadata.iosLink || '',
            'emojis': metadata.emojis || ['😊', '🎮']
        };
        
        // Convertir a JSON y luego a Buffer
        const exifBuffer = Buffer.from(JSON.stringify(exifData), 'utf8');
        img.exif = exifBuffer;
        
        await img.save(tmpFileOut);
        const result = fs.readFileSync(tmpFileOut);
        
        // Limpiar archivos temporales
        fs.unlinkSync(tmpFileIn);
        fs.unlinkSync(tmpFileOut);
        
        return result;
    } catch (error) {
        throw new Error(`Error escribiendo EXIF: ${error.message}`);
    }
};

// Función para escribir metadata EXIF en video
const writeExifVid = async (media, metadata = {}) => {
    try {
        const tmpFileIn = path.join(__dirname, '../temp/', `${Date.now()}.webp`);
        const tmpFileOut = path.join(__dirname, '../temp/', `${Date.now()}_exif.webp`);
        
        // Asegurar que el directorio temp existe
        if (!fs.existsSync(path.dirname(tmpFileIn))) {
            fs.mkdirSync(path.dirname(tmpFileIn), { recursive: true });
        }
        
        fs.writeFileSync(tmpFileIn, media);
        
        const img = new webp.Image();
        await img.load(tmpFileIn);
        
        const exifData = {
            'sticker-pack-id': metadata.packId || 'com.blueArchive.wasticker',
            'sticker-pack-name': metadata.packName || config.stickers.packName,
            'sticker-pack-publisher': metadata.authorName || config.stickers.authorName,
            'sticker-pack-publisher-email': metadata.publisherEmail || '',
            'sticker-pack-publisher-website': metadata.publisherWebsite || '',
            'sticker-pack-description': metadata.packDescription || 'Blue Archive Animated Sticker Pack',
            'sticker-pack-version': metadata.packVersion || '1.0.0',
            'sticker-pack-license': metadata.packLicense || '',
            'sticker-pack-privacy-policy': metadata.privacyPolicy || '',
            'sticker-pack-tray-icon': metadata.trayIcon || '',
            'sticker-pack-category': metadata.category || 'Anime',
            'sticker-pack-animated': true,
            'android-app-store-link': metadata.androidLink || '',
            'ios-app-store-link': metadata.iosLink || '',
            'emojis': metadata.emojis || ['😊', '🎮', '🎯']
        };
        
        // Convertir a JSON y luego a Buffer
        const exifBuffer = Buffer.from(JSON.stringify(exifData), 'utf8');
        img.exif = exifBuffer;
        
        await img.save(tmpFileOut);
        const result = fs.readFileSync(tmpFileOut);
        
        // Limpiar archivos temporales
        fs.unlinkSync(tmpFileIn);
        fs.unlinkSync(tmpFileOut);
        
        return result;
    } catch (error) {
        throw new Error(`Error escribiendo EXIF para video: ${error.message}`);
    }
};

// Función para crear sticker desde imagen
const createStickerFromImage = async (media, metadata = {}) => {
    try {
        const webpBuffer = await imageToWebp(media);
        const stickerBuffer = await writeExifImg(webpBuffer, metadata);
        return stickerBuffer;
    } catch (error) {
        throw new Error(`Error creando sticker desde imagen: ${error.message}`);
    }
};

// Función para crear sticker desde video
const createStickerFromVideo = async (media, metadata = {}) => {
    try {
        const webpBuffer = await videoToWebp(media);
        const stickerBuffer = await writeExifVid(webpBuffer, metadata);
        return stickerBuffer;
    } catch (error) {
        throw new Error(`Error creando sticker desde video: ${error.message}`);
    }
};

// Función para optimizar imagen para sticker
const optimizeImageForSticker = (media, quality = 50) => {
    return new Promise((resolve, reject) => {
        const tmpFileOut = path.join(__dirname, '../temp/', `${Date.now()}_optimized.webp`);
        const tmpFileIn = path.join(__dirname, '../temp/', `${Date.now()}_input.jpg`);
        
        // Asegurar que el directorio temp existe
        if (!fs.existsSync(path.dirname(tmpFileOut))) {
            fs.mkdirSync(path.dirname(tmpFileOut), { recursive: true });
        }
        
        fs.writeFileSync(tmpFileIn, media);
        
        const ffmpeg = spawn('ffmpeg', [
            '-i', tmpFileIn,
            '-vf', 'scale=512:512:force_original_aspect_ratio=increase,crop=512:512',
            '-quality', quality.toString(),
            '-preset', 'default',
            '-v', 'quiet',
            tmpFileOut
        ]);
        
        ffmpeg.on('error', (err) => {
            fs.unlinkSync(tmpFileIn);
            reject(err);
        });
        
        ffmpeg.on('close', (code) => {
            fs.unlinkSync(tmpFileIn);
            if (code !== 0) {
                reject(new Error(`FFmpeg exited with code ${code}`));
                return;
            }
            
            const buff = fs.readFileSync(tmpFileOut);
            fs.unlinkSync(tmpFileOut);
            resolve(buff);
        });
    });
};

// Función para validar archivo de media
const validateMedia = (media, type = 'image') => {
    const maxSize = type === 'image' ? 5 * 1024 * 1024 : 10 * 1024 * 1024; // 5MB para imágenes, 10MB para videos
    
    if (!Buffer.isBuffer(media)) {
        throw new Error('El archivo debe ser un Buffer');
    }
    
    if (media.length > maxSize) {
        throw new Error(`El archivo es demasiado grande. Máximo: ${maxSize / 1024 / 1024}MB`);
    }
    
    return true;
};

// Función para limpiar archivos temporales
const cleanTempFiles = () => {
    const tempDir = path.join(__dirname, '../temp/');
    if (fs.existsSync(tempDir)) {
        const files = fs.readdirSync(tempDir);
        files.forEach(file => {
            const filePath = path.join(tempDir, file);
            const stats = fs.statSync(filePath);
            const now = Date.now();
            const fileAge = now - stats.mtime.getTime();
            
            // Eliminar archivos temporales más antiguos a 1 hora
            if (fileAge > 3600000) {
                fs.unlinkSync(filePath);
            }
        });
    }
};

// Programar limpieza automática cada 30 minutos
setInterval(cleanTempFiles, 30 * 60 * 1000);

module.exports = {
    imageToWebp,
    videoToWebp,
    writeExifImg,
    writeExifVid,
    createStickerFromImage,
    createStickerFromVideo,
    optimizeImageForSticker,
    validateMedia,
    cleanTempFiles
};