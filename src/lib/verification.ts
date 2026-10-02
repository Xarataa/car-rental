// Module 2 - Licence + face check.
// Local provider now. Real provider later (Veriff, Onfido, AWS).
// Keep all decide rules here, so we can swap provider easily.

export type FaceCheckInput = {
  faceScore: number | null; // distance: 0 = same person, 1 = different. Good if < 0.6
  idFaces: number; // faces found in ID photo
  selfieFaces: number; // faces found in selfie
  idSize: number; // bytes
  selfieSize: number; // bytes
};

export type DecideResult = {
  status: "VERIFIED" | "PENDING" | "REJECTED";
  faceMatch: boolean;
  reason?: string;
};

// Strict local rules. Not 100%, but strong for demo.
export function decideVerification(input: FaceCheckInput): DecideResult {
  // Must have exactly 1 face in each photo
  if (input.idFaces !== 1) {
    return {
      status: "REJECTED",
      faceMatch: false,
      reason: "No clear face found in ID photo. Upload a clear photo.",
    };
  }
  if (input.selfieFaces !== 1) {
    return {
      status: "REJECTED",
      faceMatch: false,
      reason: "No clear face found in selfie. Take a clear selfie.",
    };
  }

  // Files too small = blurry or fake
  if (input.idSize < 10 * 1024 || input.selfieSize < 10 * 1024) {
    return {
      status: "REJECTED",
      faceMatch: false,
      reason: "Photo is too small or blurry. Upload a bigger clear photo.",
    };
  }

  if (input.faceScore === null || Number.isNaN(input.faceScore)) {
    return {
      status: "PENDING",
      faceMatch: false,
      reason: "Face check could not run. Needs manual review.",
    };
  }

  // face-api distance: smaller = same person
  if (input.faceScore <= 0.55) {
    return { status: "VERIFIED", faceMatch: true };
  }
  if (input.faceScore <= 0.65) {
    return {
      status: "PENDING",
      faceMatch: false,
      reason: `Face match is close (${input.faceScore.toFixed(2)}). Needs manual review.`,
    };
  }
  return {
    status: "REJECTED",
    faceMatch: false,
    reason: `Faces do not match (${input.faceScore.toFixed(2)}). Use your own ID and selfie.`,
  };
}

// Later: plug real service here without changing pages/routes.
// Example: export async function realProviderCheck(...) { ... }
