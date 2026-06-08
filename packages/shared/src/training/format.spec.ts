import { describe, expect, test } from "vitest";
import { formatDuration, formatPace, parseDuration } from "./format.js";

describe("formatDuration", () => {
  test("3:59:00 格式化", () => {
    expect(formatDuration(14340)).toBe("3:59:00");
  });

  test("1 小時整", () => {
    expect(formatDuration(3600)).toBe("1:00:00");
  });

  test("不到 1 小時只顯示 MM:SS", () => {
    expect(formatDuration(335)).toBe("5:35");
  });

  test("0 秒", () => {
    expect(formatDuration(0)).toBe("0:00");
  });

  test("秒數補零", () => {
    expect(formatDuration(305)).toBe("5:05");
    expect(formatDuration(3605)).toBe("1:00:05");
  });

  test("負數 throw", () => {
    expect(() => formatDuration(-1)).toThrow();
  });
});

describe("formatPace", () => {
  test("加上 /km 尾巴", () => {
    expect(formatPace(335)).toBe("5:35/km");
    expect(formatPace(283)).toBe("4:43/km");
  });
});

describe("parseDuration", () => {
  test("解析 H:MM:SS", () => {
    expect(parseDuration("3:59:00")).toBe(14340);
    expect(parseDuration("1:00:00")).toBe(3600);
  });

  test("解析 M:SS", () => {
    expect(parseDuration("5:35")).toBe(335);
    expect(parseDuration("0:00")).toBe(0);
  });

  test("parse 後再 format 應該得到原字串", () => {
    const original = "3:59:00";
    expect(formatDuration(parseDuration(original))).toBe(original);
  });

  test("無效格式 throw", () => {
    expect(() => parseDuration("abc")).toThrow();
    expect(() => parseDuration("1:2:3:4")).toThrow();
  });
});
