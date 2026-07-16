import { describe, it, expect } from "vitest";
import { detectMainSet } from "./fitAnalysis.js";

describe("detectMainSet", () => {
  it("偵測 10×200m 間歇的主段", () => {
    const laps = [
      {
        index: 1,
        distanceM: 1000,
        durationSec: 379,
        avgHeartRate: 130,
        paceSec: 379,
      },
      {
        index: 2,
        distanceM: 548.12,
        durationSec: 221,
        avgHeartRate: 137,
        paceSec: 403,
      },
      {
        index: 3,
        distanceM: 200,
        durationSec: 53,
        avgHeartRate: 148,
        paceSec: 264,
      },
      {
        index: 4,
        distanceM: 200,
        durationSec: 78,
        avgHeartRate: 158,
        paceSec: 392,
      },
      {
        index: 5,
        distanceM: 200,
        durationSec: 50,
        avgHeartRate: 161,
        paceSec: 251,
      },
      {
        index: 6,
        distanceM: 200,
        durationSec: 78,
        avgHeartRate: 162,
        paceSec: 391,
      },
      {
        index: 7,
        distanceM: 200,
        durationSec: 52,
        avgHeartRate: 158,
        paceSec: 260,
      },
      {
        index: 8,
        distanceM: 200,
        durationSec: 96,
        avgHeartRate: 160,
        paceSec: 479,
      },
      {
        index: 9,
        distanceM: 200,
        durationSec: 48,
        avgHeartRate: 156,
        paceSec: 239,
      },
      {
        index: 10,
        distanceM: 200,
        durationSec: 106,
        avgHeartRate: 163,
        paceSec: 529,
      },
      {
        index: 11,
        distanceM: 200,
        durationSec: 50,
        avgHeartRate: 162,
        paceSec: 252,
      },
      {
        index: 12,
        distanceM: 200,
        durationSec: 101,
        avgHeartRate: 157,
        paceSec: 504,
      },
      {
        index: 13,
        distanceM: 200,
        durationSec: 49,
        avgHeartRate: 156,
        paceSec: 245,
      },
      {
        index: 14,
        distanceM: 200,
        durationSec: 106,
        avgHeartRate: 156,
        paceSec: 528,
      },
      {
        index: 15,
        distanceM: 200,
        durationSec: 53,
        avgHeartRate: 151,
        paceSec: 266,
      },
      {
        index: 16,
        distanceM: 200,
        durationSec: 93,
        avgHeartRate: 159,
        paceSec: 465,
      },
      {
        index: 17,
        distanceM: 200,
        durationSec: 53,
        avgHeartRate: 165,
        paceSec: 267,
      },
      {
        index: 18,
        distanceM: 200,
        durationSec: 94,
        avgHeartRate: 160,
        paceSec: 471,
      },
      {
        index: 19,
        distanceM: 200,
        durationSec: 54,
        avgHeartRate: 162,
        paceSec: 269,
      },
      {
        index: 20,
        distanceM: 200,
        durationSec: 96,
        avgHeartRate: 167,
        paceSec: 479,
      },
      {
        index: 21,
        distanceM: 200,
        durationSec: 51,
        avgHeartRate: 164,
        paceSec: 254,
      },
      {
        index: 22,
        distanceM: 200,
        durationSec: 137,
        avgHeartRate: 163,
        paceSec: 687,
      },
      {
        index: 23,
        distanceM: 4.8,
        durationSec: 2,
        avgHeartRate: 140,
        paceSec: 475,
      },
    ];

    const result = detectMainSet(laps);
    expect(result).not.toBeNull();
    expect(result!.sets).toBe(10);
    expect(result!.setDistanceM).toBe(200);
    expect(result!.mainSetIndexes).toEqual([
      3, 5, 7, 9, 11, 13, 15, 17, 19, 21,
    ]);
    expect(result!.mainSetPaceSec).toBe(257);
  });

  it("laps 太少時回 null", () => {
    expect(
      detectMainSet([
        {
          index: 1,
          distanceM: 1000,
          durationSec: 300,
          avgHeartRate: null,
          paceSec: 300,
        },
      ])
    ).toBeNull();
  });

  it("沒有明顯快跑段（如穩定跑）時回 null", () => {
    const steady = Array.from({ length: 5 }, (_, i) => ({
      index: i + 1,
      distanceM: 1000,
      durationSec: 300 + i,
      avgHeartRate: 150,
      paceSec: 300 + i,
    }));
    expect(detectMainSet(steady)).toBeNull();
  });
});
