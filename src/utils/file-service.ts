/**
 * Service for downloading files from Linear's private cloud storage.
 * Handles authentication and file I/O operations.
 */

import { access, mkdir, writeFile } from "fs/promises";
import { basename, dirname } from "path";
import { extractFilenameFromUrl, isLinearUploadUrl } from "./embed-parser.js";

export interface DownloadOptions {
  output?: string;
  overwrite?: boolean;
}

export interface DownloadResult {
  success: boolean;
  filePath?: string;
  error?: string;
  statusCode?: number;
}

export class FileService {
  private apiToken: string;

  constructor(apiToken: string) {
    this.apiToken = apiToken;
  }

  /**
   * Downloads a file from Linear's private cloud storage.
   * Requires Bearer token authentication.
   */
  async downloadFile(
    url: string,
    options: DownloadOptions = {},
  ): Promise<DownloadResult> {
    // Validate URL is from Linear storage
    if (!isLinearUploadUrl(url)) {
      return {
        success: false,
        error: "URL must be from uploads.linear.app domain",
      };
    }

    // Determine output path
    const outputPath = options.output || extractFilenameFromUrl(url);

    // Check if file already exists (unless overwrite is enabled)
    if (!options.overwrite) {
      try {
        await access(outputPath);
        return {
          success: false,
          error:
            `File already exists: ${outputPath}. Use --overwrite to replace.`,
        };
      } catch {
        // File doesn't exist, we can proceed
      }
    }

    try {
      // Check if URL already has a signature (signed URL)
      const urlObj = new URL(url);
      const isSignedUrl = urlObj.searchParams.has("signature");

      // Make HTTP request (with Bearer token only if not a signed URL)
      const headers: Record<string, string> = {};
      if (!isSignedUrl) {
        headers.Authorization = `Bearer ${this.apiToken}`;
      }

      const response = await fetch(url, {
        method: "GET",
        headers,
      });

      // Handle non-200 responses
      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          statusCode: response.status,
        };
      }

      // Get file content
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Create output directory if needed
      const outputDir = dirname(outputPath);
      if (outputDir !== ".") {
        await mkdir(outputDir, { recursive: true });
      }

      // Write file to disk
      await writeFile(outputPath, buffer);

      return {
        success: true,
        filePath: outputPath,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
