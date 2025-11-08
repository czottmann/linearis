import { access, mkdir, writeFile } from "fs/promises";
import { dirname } from "path";
import { extractFilenameFromUrl, isLinearUploadUrl } from "./embed-parser.js";
export class FileService {
    apiToken;
    constructor(apiToken) {
        this.apiToken = apiToken;
    }
    async downloadFile(url, options = {}) {
        if (!isLinearUploadUrl(url)) {
            return {
                success: false,
                error: "URL must be from uploads.linear.app domain",
            };
        }
        const outputPath = options.output || extractFilenameFromUrl(url);
        if (!options.overwrite) {
            try {
                await access(outputPath);
                return {
                    success: false,
                    error: `File already exists: ${outputPath}. Use --overwrite to replace.`,
                };
            }
            catch {
            }
        }
        try {
            const urlObj = new URL(url);
            const isSignedUrl = urlObj.searchParams.has("signature");
            const headers = {};
            if (!isSignedUrl) {
                headers.Authorization = `Bearer ${this.apiToken}`;
            }
            const response = await fetch(url, {
                method: "GET",
                headers,
            });
            if (!response.ok) {
                return {
                    success: false,
                    error: `HTTP ${response.status}: ${response.statusText}`,
                    statusCode: response.status,
                };
            }
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const outputDir = dirname(outputPath);
            if (outputDir !== ".") {
                await mkdir(outputDir, { recursive: true });
            }
            await writeFile(outputPath, buffer);
            return {
                success: true,
                filePath: outputPath,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
}
