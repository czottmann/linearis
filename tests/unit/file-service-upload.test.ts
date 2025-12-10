import { beforeEach, describe, expect, it, vi } from "vitest";
import { FileService } from "../../src/utils/file-service.js";

// Mock fs/promises
vi.mock("fs/promises", () => ({
  access: vi.fn(),
  stat: vi.fn(),
  readFile: vi.fn(),
  mkdir: vi.fn(),
  writeFile: vi.fn(),
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { access, stat, readFile } from "fs/promises";

/**
 * Unit tests for FileService.uploadFile()
 *
 * Tests the file upload functionality including:
 * - Successful uploads with proper GraphQL mutation and PUT
 * - File not found errors
 * - File size validation
 * - GraphQL error handling
 * - PUT request failures
 */
describe("FileService - uploadFile", () => {
  let service: FileService;
  const testApiToken = "lin_api_test123";

  beforeEach(() => {
    vi.clearAllMocks();
    service = new FileService(testApiToken);
  });

  describe("successful upload", () => {
    it("should upload a file and return the asset URL", async () => {
      // Setup file system mocks
      vi.mocked(access).mockResolvedValue(undefined);
      vi.mocked(stat).mockResolvedValue({ size: 1024 } as any);
      vi.mocked(readFile).mockResolvedValue(Buffer.from("test file content"));

      // Setup fetch mocks - GraphQL response, then PUT response
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              data: {
                fileUpload: {
                  success: true,
                  uploadFile: {
                    uploadUrl: "https://storage.linear.app/upload/abc123",
                    assetUrl: "https://uploads.linear.app/abc/file.png",
                    headers: [
                      { key: "x-amz-header", value: "some-value" },
                    ],
                  },
                },
              },
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
        });

      const result = await service.uploadFile("/path/to/file.png");

      expect(result.success).toBe(true);
      expect(result.assetUrl).toBe("https://uploads.linear.app/abc/file.png");
      expect(result.filename).toBe("file.png");

      // Verify GraphQL call
      expect(mockFetch).toHaveBeenCalledTimes(2);
      const graphqlCall = mockFetch.mock.calls[0];
      expect(graphqlCall[0]).toBe("https://api.linear.app/graphql");
      expect(graphqlCall[1].headers["Authorization"]).toBe(testApiToken);

      // Verify PUT call
      const putCall = mockFetch.mock.calls[1];
      expect(putCall[0]).toBe("https://storage.linear.app/upload/abc123");
      expect(putCall[1].method).toBe("PUT");
      expect(putCall[1].headers["x-amz-header"]).toBe("some-value");
    });

    it("should detect content type from file extension", async () => {
      vi.mocked(access).mockResolvedValue(undefined);
      vi.mocked(stat).mockResolvedValue({ size: 1024 } as any);
      vi.mocked(readFile).mockResolvedValue(Buffer.from("{}"));

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              data: {
                fileUpload: {
                  success: true,
                  uploadFile: {
                    uploadUrl: "https://storage.linear.app/upload/abc123",
                    assetUrl: "https://uploads.linear.app/abc/data.json",
                    headers: [],
                  },
                },
              },
            }),
        })
        .mockResolvedValueOnce({ ok: true });

      await service.uploadFile("/path/to/data.json");

      // Check that Content-Type was set correctly
      const putCall = mockFetch.mock.calls[1];
      expect(putCall[1].headers["Content-Type"]).toBe("application/json");
    });

    it("should default to application/octet-stream for unknown extensions", async () => {
      vi.mocked(access).mockResolvedValue(undefined);
      vi.mocked(stat).mockResolvedValue({ size: 1024 } as any);
      vi.mocked(readFile).mockResolvedValue(Buffer.from("binary data"));

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              data: {
                fileUpload: {
                  success: true,
                  uploadFile: {
                    uploadUrl: "https://storage.linear.app/upload/abc123",
                    assetUrl: "https://uploads.linear.app/abc/file.xyz",
                    headers: [],
                  },
                },
              },
            }),
        })
        .mockResolvedValueOnce({ ok: true });

      await service.uploadFile("/path/to/file.xyz");

      const putCall = mockFetch.mock.calls[1];
      expect(putCall[1].headers["Content-Type"]).toBe(
        "application/octet-stream",
      );
    });
  });

  describe("file validation errors", () => {
    it("should return error when file does not exist", async () => {
      vi.mocked(access).mockRejectedValue(new Error("ENOENT"));

      const result = await service.uploadFile("/path/to/nonexistent.png");

      expect(result.success).toBe(false);
      expect(result.error).toContain("File not found");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should return error when file exceeds size limit", async () => {
      vi.mocked(access).mockResolvedValue(undefined);
      // 25MB - exceeds 20MB limit
      vi.mocked(stat).mockResolvedValue({ size: 25 * 1024 * 1024 } as any);

      const result = await service.uploadFile("/path/to/large-file.zip");

      expect(result.success).toBe(false);
      expect(result.error).toContain("File too large");
      expect(result.error).toContain("25.0MB");
      expect(result.error).toContain("20MB");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should return error when stat fails", async () => {
      vi.mocked(access).mockResolvedValue(undefined);
      vi.mocked(stat).mockRejectedValue(new Error("Permission denied"));

      const result = await service.uploadFile("/path/to/file.png");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Cannot read file");
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("GraphQL errors", () => {
    it("should return error when GraphQL request fails", async () => {
      vi.mocked(access).mockResolvedValue(undefined);
      vi.mocked(stat).mockResolvedValue({ size: 1024 } as any);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const result = await service.uploadFile("/path/to/file.png");

      expect(result.success).toBe(false);
      expect(result.error).toContain("GraphQL request failed");
      expect(result.statusCode).toBe(401);
    });

    it("should return error when GraphQL returns errors array", async () => {
      vi.mocked(access).mockResolvedValue(undefined);
      vi.mocked(stat).mockResolvedValue({ size: 1024 } as any);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            errors: [{ message: "Invalid API token" }],
          }),
      });

      const result = await service.uploadFile("/path/to/file.png");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid API token");
    });

    it("should return error when fileUpload returns success=false", async () => {
      vi.mocked(access).mockResolvedValue(undefined);
      vi.mocked(stat).mockResolvedValue({ size: 1024 } as any);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              fileUpload: {
                success: false,
              },
            },
          }),
      });

      const result = await service.uploadFile("/path/to/file.png");

      expect(result.success).toBe(false);
      expect(result.error).toContain("success=false");
    });

    it("should return error when uploadUrl is missing", async () => {
      vi.mocked(access).mockResolvedValue(undefined);
      vi.mocked(stat).mockResolvedValue({ size: 1024 } as any);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              fileUpload: {
                success: true,
                uploadFile: {
                  assetUrl: "https://uploads.linear.app/abc/file.png",
                  // uploadUrl missing
                },
              },
            },
          }),
      });

      const result = await service.uploadFile("/path/to/file.png");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Missing uploadUrl or assetUrl");
    });
  });

  describe("PUT request errors", () => {
    it("should return error when PUT fails", async () => {
      vi.mocked(access).mockResolvedValue(undefined);
      vi.mocked(stat).mockResolvedValue({ size: 1024 } as any);
      vi.mocked(readFile).mockResolvedValue(Buffer.from("test content"));

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              data: {
                fileUpload: {
                  success: true,
                  uploadFile: {
                    uploadUrl: "https://storage.linear.app/upload/abc123",
                    assetUrl: "https://uploads.linear.app/abc/file.png",
                    headers: [],
                  },
                },
              },
            }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
        });

      const result = await service.uploadFile("/path/to/file.png");

      expect(result.success).toBe(false);
      expect(result.error).toContain("File upload failed");
      expect(result.statusCode).toBe(403);
    });

    it("should handle network errors during PUT", async () => {
      vi.mocked(access).mockResolvedValue(undefined);
      vi.mocked(stat).mockResolvedValue({ size: 1024 } as any);
      vi.mocked(readFile).mockResolvedValue(Buffer.from("test content"));

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              data: {
                fileUpload: {
                  success: true,
                  uploadFile: {
                    uploadUrl: "https://storage.linear.app/upload/abc123",
                    assetUrl: "https://uploads.linear.app/abc/file.png",
                    headers: [],
                  },
                },
              },
            }),
        })
        .mockRejectedValueOnce(new Error("Network error"));

      const result = await service.uploadFile("/path/to/file.png");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Network error");
    });
  });
});
