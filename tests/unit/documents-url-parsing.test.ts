import { describe, expect, it } from "vitest";
import { extractDocumentIdFromUrl } from "../../src/commands/documents.js";

/**
 * Unit tests for extractDocumentIdFromUrl
 *
 * This function extracts the document slug ID from Linear document URLs.
 * Linear document URLs follow the format:
 * https://linear.app/[workspace]/document/[title-slug]-[slugId]
 */

describe("extractDocumentIdFromUrl", () => {
  describe("valid Linear document URLs", () => {
    it("should extract slugId from standard document URL", () => {
      const url = "https://linear.app/myworkspace/document/my-document-title-abc123";
      expect(extractDocumentIdFromUrl(url)).toBe("abc123");
    });

    it("should extract slugId from document URL with long title", () => {
      const url = "https://linear.app/workspace/document/this-is-a-very-long-document-title-xyz789";
      expect(extractDocumentIdFromUrl(url)).toBe("xyz789");
    });

    it("should extract slugId from document URL with numeric slugId", () => {
      const url = "https://linear.app/team/document/document-123456";
      expect(extractDocumentIdFromUrl(url)).toBe("123456");
    });

    it("should handle subdomain linear.app URLs", () => {
      const url = "https://app.linear.app/workspace/document/test-doc-slug1";
      expect(extractDocumentIdFromUrl(url)).toBe("slug1");
    });

    it("should handle URL with query parameters", () => {
      const url = "https://linear.app/workspace/document/test-doc-abc?view=full";
      expect(extractDocumentIdFromUrl(url)).toBe("abc");
    });

    it("should handle URL with hash fragment", () => {
      const url = "https://linear.app/workspace/document/test-doc-def#section";
      expect(extractDocumentIdFromUrl(url)).toBe("def");
    });
  });

  describe("non-Linear URLs", () => {
    it("should return null for non-Linear domain", () => {
      const url = "https://example.com/workspace/document/test-doc-abc123";
      expect(extractDocumentIdFromUrl(url)).toBeNull();
    });

    it("should return null for GitHub URLs", () => {
      const url = "https://github.com/org/repo/document/readme-abc";
      expect(extractDocumentIdFromUrl(url)).toBeNull();
    });

    it("should return null for Google Docs URLs", () => {
      const url = "https://docs.google.com/document/d/abc123";
      expect(extractDocumentIdFromUrl(url)).toBeNull();
    });
  });

  describe("Linear URLs without document path", () => {
    it("should return null for issue URL", () => {
      const url = "https://linear.app/workspace/issue/ABC-123";
      expect(extractDocumentIdFromUrl(url)).toBeNull();
    });

    it("should return null for project URL", () => {
      const url = "https://linear.app/workspace/project/my-project";
      expect(extractDocumentIdFromUrl(url)).toBeNull();
    });

    it("should return null for settings URL", () => {
      const url = "https://linear.app/workspace/settings";
      expect(extractDocumentIdFromUrl(url)).toBeNull();
    });

    it("should return null for root workspace URL", () => {
      const url = "https://linear.app/workspace";
      expect(extractDocumentIdFromUrl(url)).toBeNull();
    });
  });

  describe("edge cases", () => {
    it("should return null for malformed URL", () => {
      const url = "not-a-valid-url";
      expect(extractDocumentIdFromUrl(url)).toBeNull();
    });

    it("should return null for empty string", () => {
      const url = "";
      expect(extractDocumentIdFromUrl(url)).toBeNull();
    });

    it("should return slug when no hyphen in slug (entire slug is ID)", () => {
      const url = "https://linear.app/workspace/document/abc123";
      expect(extractDocumentIdFromUrl(url)).toBe("abc123");
    });

    it("should return null for document path with no slug", () => {
      const url = "https://linear.app/workspace/document/";
      expect(extractDocumentIdFromUrl(url)).toBeNull();
    });

    it("should handle single character slugId", () => {
      const url = "https://linear.app/workspace/document/title-x";
      expect(extractDocumentIdFromUrl(url)).toBe("x");
    });

    it("should handle hyphen at end correctly (returns empty becomes null)", () => {
      const url = "https://linear.app/workspace/document/title-";
      expect(extractDocumentIdFromUrl(url)).toBeNull();
    });
  });
});
