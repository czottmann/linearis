/**
 * Service for downloading files from Linear's private cloud storage.
 * Handles authentication, signed URLs, and file I/O operations.
 * 
 * Features:
 * - Automatic authentication handling for Linear URLs
 * - Signed URL detection (skips Bearer token for signed URLs)
 * - Directory creation and file existence checks
 * - Comprehensive error handling and status reporting
 */

import { access, mkdir, writeFile } from "fs/promises";
import { basename, dirname } from "path";
import { extractFilenameFromUrl, isLinearUploadUrl } from "./embed-parser.js";

export interface DownloadOptions {
  /** Custom output file path (defaults to filename from URL) */
  output?: string;
  /** Whether to overwrite existing files (default: false) */
  overwrite?: boolean;
}

export interface DownloadResult {
  /** Whether the download was successful */
  success: boolean;
  /** Full path to the downloaded file (only if successful) */
  filePath?: string;
  /** Error message if download failed */
  error?: string;
  /** HTTP status code if HTTP request failed */
  statusCode?: number;
}

/**
 * File service for Linear cloud storage downloads
 * 
 * Handles authentication and file operations for Linear's private storage.
 * Automatically detects signed URLs and adjusts authentication accordingly.
 */
export class FileService {
  private apiToken: string;

  /**
   * Initialize file service with authentication token
   * 
   * @param apiToken - Linear API token for authentication
   */
  constructor(apiToken: string) {
    this.apiToken = apiToken;
  }

  /**
   * Downloads a file from Linear's private cloud storage.
   * 
   * Automatically handles authentication for Linear URLs and creates directories
   * as needed. Detects signed URLs to skip Bearer token authentication.
   * 
   * @param url - URL to Linear file (uploads.linear.app domain)
   * @param options - Download options including output path and overwrite behavior
   * @returns Download result with success status, file path, or error details
   * 
   * @example
   * ```typescript
   * const result = await fileService.downloadFile(
   *   "https://uploads.linear.app/abc/file.png",
   *   { output: "screenshots/image.png", overwrite: true }
   * );
   * 
   * if (result.success) {
   *   console.log(`Downloaded to: ${result.filePath}`);
   * } else {
   *   console.error(`Error: ${result.error}`);
   * }
   * ```
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
