const path = require("path");
const {promises: fs} = require("fs");
const fs1 = require("fs");
const axios = require('axios');
const { randomUUID } = require('crypto');
const logger = require("../logger");
const sharp = require("sharp");
const {FormatUtils} = require("../utils/utils");

const basePath = process.env.PRODUCT_IMAGE_BASE_PATH;

async function resizeToSquare(inputPath, outputPath, squareSize, options = {}) {
    try {
        const {
            backgroundColor = { r: 255, g: 255, b: 255, alpha: 1 }, // White background
            fit = 'contain',
            position = 'center',
            quality = 90,
            preserveTransparency = false // New option to preserve transparency
        } = options;

        const image = sharp(inputPath);
        const metadata = await image.metadata();

        // Check if input has transparency
        const hasTransparency = metadata.channels === 4 ||
          (metadata.format === 'png' && metadata.hasAlpha) ||
          (metadata.format === 'gif' && metadata.hasAlpha) ||
          (metadata.format === 'webp' && metadata.hasAlpha);

        let processedImage = image.resize(squareSize, squareSize, {
            fit: fit,
            position: position,
            background: backgroundColor
        });

        // Handle output format based on transparency
        if (hasTransparency && preserveTransparency) {
            // Keep as PNG to preserve transparency
            await processedImage
              .png({ quality: Math.round(quality * 0.9) }) // PNG uses different quality scale
              .toFile(outputPath.replace(/\.(jpg|jpeg)$/i, '.png'));

            console.log(`Square image with transparency created: ${outputPath.replace(/\.(jpg|jpeg)$/i, '.png')} (${squareSize}x${squareSize})`);
        } else {
            // Convert to JPEG with background color
            // First flatten the image to ensure transparency is properly handled
            if (hasTransparency) {
                processedImage = processedImage.flatten({ background: backgroundColor });
            }

            await processedImage
              .jpeg({ quality })
              .toFile(outputPath);

            console.log(`Square image created: ${outputPath} (${squareSize}x${squareSize})`);
        }

    } catch (error) {
        console.error('Error creating square image:', error);
        throw error;
    }
}

// Enhanced multiple square sizes with transparency handling
async function createMultipleSquares(inputPath, outputDir, sizes) {
    try {
        const inputImage = sharp(inputPath);
        const metadata = await inputImage.metadata();

        console.log(`Original dimensions: ${metadata.width}x${metadata.height}`);
        console.log(`Original format: ${metadata.format}, Channels: ${metadata.channels}, Has Alpha: ${metadata.hasAlpha}`);

        const createPromises = sizes.map(async (config) => {
            const { size, name, backgroundColor, preserveTransparency = false } = config;
            const outputPath = path.join(outputDir, `${name}_${size}x${size}.jpg`);

            await resizeToSquare(inputPath, outputPath, size, {
                backgroundColor,
                quality: 90,
                preserveTransparency
            });

            return outputPath;
        });

        await Promise.all(createPromises);
        console.log('All square images created successfully!');

    } catch (error) {
        console.error('Error creating multiple squares:', error);
        throw error;
    }
}

module.exports.resizeToSquare = resizeToSquare;
module.exports.createMultipleSquares = createMultipleSquares;

class ProductImageHelper {


    getUrl(imageId, size, domainId){
        if(!imageId){
            return null;
        }
        const [guid, ext] = imageId.split('.');
        const firstChar = guid.charAt(0);
        const secondThirdChars = guid.substring(1, 3);


        return `/content/products/${domainId}/${firstChar}/${secondThirdChars}/${guid}_${size}.${ext}`;
    }

    isValidImageIdentifier(imageIdentifier) {
        if (typeof imageIdentifier !== 'string') return false;

        const parts = imageIdentifier.split('.');
        if (parts.length !== 2) return false;

        const [guid, ext] = parts;

        const guidRegex = /^[0-9a-f]{32}$/i;
        if (!guidRegex.test(guid)) return false;

        const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
        if (!validExtensions.includes(ext.toLowerCase())) return false;

        return true;
    }

    async downloadImage(url, domainId) {

        const guid = randomUUID().replace(/-/g, '');
        const firstChar = guid.charAt(0);
        const secondThirdChars = guid.substring(1, 3);
        const directory = path.join(
            basePath,
            domainId.toString(),
            firstChar,
            secondThirdChars
        );

        // Create directory if it doesn't exist

        if (!fs1.existsSync(directory)) {
            fs1.mkdirSync(directory, { recursive: true });
        }

        // Download image
        const response = await axios.get(url, {
            responseType: 'stream'
        });

        // Get extension from Content-Type header or URL
        let extension = '.jpg';
        const contentType = response.headers['content-type'];

        if (contentType) {
            const mimeToExt = {
                'image/jpeg': '.jpg',
                'image/jpg': '.jpg',
                'image/png': '.png',
                'image/gif': '.gif',
                'image/webp': '.webp',
                'image/svg+xml': '.svg',
                'image/bmp': '.bmp'
            };
            extension = mimeToExt[contentType] || extension;
        } else {
            // Fallback to URL extension
            const urlPath = new URL(url).pathname;
            extension = path.extname(urlPath) || extension;
        }

        // Generate GUID filename

        const filename = `${guid}_org${extension}`;
        const imageId = `${guid}${extension}`
        const filepath = path.join(directory, filename);

        // Write to file
        const writer = fs1.createWriteStream(filepath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                resolve({
                    filename,
                    filepath,
                    imageId,
                    guid,
                    extension
                });
            });
            writer.on('error', reject);
        });
    }
    async getImagePath(imageId, domainId, size = "org") {
        if (!this.isValidImageIdentifier(imageId)) {
            throw new Error(`Invalid image identifier format: ${imageId}. Expected format: 32-character guid + image extension (e.g., 4bfda563b915425ca596e5b2455f6fa0.jpg)`);
        }

        const [guid, ext] = imageId.split('.');
        const firstChar = guid.charAt(0);
        const secondThirdChars = guid.substring(1, 3);

        const imagePath = path.join(
          basePath,
          domainId.toString(),
          firstChar,
          secondThirdChars,
          `${guid}_${size}.${ext}`
        );

        const directory = path.join(
          basePath,
          domainId.toString(),
          firstChar,
          secondThirdChars
        );

        try {
            await fs.access(imagePath);
            return {
                exists: true,
                path: imagePath,
                fileName: `${guid}_${size}.${ext}`,
                directory: directory,
                imageId: imageId,
                domainId: domainId,
                originalPath: `${guid}_org.${ext}`,
            };
        } catch (error) {
            logger.error(`Error getImagePath ${error.message}. BasePath: ${basePath}`);
            return {
                exists: false,
                path: imagePath,
                fileName: `${guid}_${size}.${ext}`,
                directory: directory,
                imageId: imageId,
                domainId: domainId,
                originalPath: `${guid}_org.${ext}`,
            };
        }
    }

    async getImageUrl(imageId, size, domainId, options = {}) {
        if (!imageId) return;

        const {
            backgroundColor = { r: 255, g: 255, b: 255, alpha: 1 },
            preserveTransparency = false
        } = options;

        var imgPath = await this.getImagePath(imageId, domainId, size);

        if (!imgPath.exists) {
            try {
                const originalPath = path.join(imgPath.directory, imgPath.originalPath);
                const outputPath = path.join(imgPath.directory, imgPath.fileName);

                // Check if original file has transparency
                const originalImage = sharp(originalPath);
                const metadata = await originalImage.metadata();
                const hasTransparency = metadata.channels === 4 ||
                  (metadata.format === 'png' && metadata.hasAlpha) ||
                  (metadata.format === 'gif' && metadata.hasAlpha) ||
                  (metadata.format === 'webp' && metadata.hasAlpha);

                await resizeToSquare(originalPath, outputPath, size, {
                    backgroundColor,
                    preserveTransparency: preserveTransparency && hasTransparency
                });

            } catch (e) {
                console.log("error", e);
            }
        }

        return "/content/products/" + domainId + FormatUtils.convertGuidToPath(imageId, size);
    }

    async exists(imageId, size, domainId) {
        if (!this.isValidImageIdentifier(imageId)) {
            return false;
        }

        try {
            const imgPath = await this.getImagePath(imageId, domainId, size);
            return imgPath.exists;
        } catch (error) {
            return false;
        }
    }

    async copyImageToDomain(imageId, fromDomainId, toDomainId) {
        var toPath = await this.getImagePath(imageId, toDomainId);
        if (toPath.exists) {
            return {
                success: true,
                targetPath: toPath
            };
        }

        var fromPath = await this.getImagePath(imageId, fromDomainId);
        if (!fromPath.exists) {
            return {
                success: false,
                targetPath: toPath,
                error: `Origin file ${fromPath.path} does not exist`
            };
        }

        try {
            await fs.access(fromPath.path);
            await fs.mkdir(path.dirname(toPath.path), { recursive: true });
            await fs.copyFile(fromPath.path, toPath.path);

            return {
                success: true,
                targetPath: toPath
            };
        } catch (error) {
            throw new Error(`Failed to copy image from domain ${fromDomainId} to ${toDomainId}: ${error.message}`);
        }
    }
}

module.exports = ProductImageHelper;