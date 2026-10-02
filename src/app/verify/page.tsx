"use client";

import { useEffect, useRef, useState } from "react";

export const dynamic = "force-dynamic";

type Status = "NONE" | "PENDING" | "VERIFIED" | "REJECTED";

export default function VerifyPage() {
  const [modelsOk, setModelsOk] = useState(false);
  const [modelMsg, setModelMsg] = useState("Loading face check...");
  const [step, setStep] = useState<1 | 2>(1);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [idUrl, setIdUrl] = useState("");
  const [selfieUrl, setSelfieUrl] = useState("");
  const [checking, setChecking] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [faceScore, setFaceScore] = useState<number | null>(null);
  const [idFaces, setIdFaces] = useState(0);
  const [selfieFaces, setSelfieFaces] = useState(0);
  const [msg, setMsg] = useState("");
  const [status, setStatus] = useState<Status>("NONE");
  const [reason, setReason] = useState("");
  const [camOn, setCamOn] = useState(false);
  const [camError, setCamError] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const faceapi = await import("@vladmandic/face-api");
        const url = "/models";
        await faceapi.nets.tinyFaceDetector.loadFromUri(url);
        await faceapi.nets.faceLandmark68Net.loadFromUri(url);
        await faceapi.nets.faceRecognitionNet.loadFromUri(url);
        setModelsOk(true);
        setModelMsg("Face check is ready.");
      } catch {
        setModelMsg("Face models did not load. You can still upload, admin will check.");
        setModelsOk(false);
      }
    }
    load();
    fetch("/api/verify/status")
      .then((r) => r.json())
      .then((d) => {
        if (d.status) setStatus(d.status);
        if (d.reason) setReason(d.reason);
      })
      .catch(() => {});
    return () => {
      if (idUrl) URL.revokeObjectURL(idUrl);
      if (selfieUrl) URL.revokeObjectURL(selfieUrl);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pickId(f: File | undefined) {
    if (!f) return;
    setIdFile(f);
    setIdUrl(URL.createObjectURL(f));
    setFaceScore(null);
    setMsg("");
  }

  function pickSelfieFile(f: File | undefined) {
    if (!f) return;
    setSelfieFile(f);
    setSelfieUrl(URL.createObjectURL(f));
    setFaceScore(null);
    setMsg("");
  }

  async function startCamera() {
    setCamError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCamOn(true);
    } catch {
      setCamError("Camera is blocked. Allow camera or upload a selfie file below.");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamOn(false);
  }

  async function captureLive() {
    const video = videoRef.current;
    if (!video) return;
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Mirror for front camera so text looks right
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob((b) => res(b), "image/jpeg", 0.92)
    );
    if (!blob) {
      setMsg("Live picture failed. Try again.");
      return;
    }
    const file = new File([blob], "live-selfie.jpg", { type: "image/jpeg" });
    pickSelfieFile(file);
    setMsg("Live picture taken. Now press Check faces, then Upload for approval.");
  }

  function distance(a: Float32Array, b: Float32Array) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const d = a[i] - b[i];
      sum += d * d;
    }
    return Math.sqrt(sum);
  }

  async function runCheck() {
    if (!idFile || !selfieFile) {
      setMsg("Licence photo and live selfie are both needed.");
      return;
    }
    if (!modelsOk) {
      setMsg("Face models not ready. Upload anyway for manual approval.");
      await upload(null, 0, 0);
      return;
    }
    setChecking(true);
    setMsg("Checking faces...");
    try {
      const faceapi = await import("@vladmandic/face-api");
      const idImg = await faceapi.bufferToImage(idFile);
      const selfImg = await faceapi.bufferToImage(selfieFile);
      const idDet = await faceapi
        .detectSingleFace(idImg, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();
      const selfDet = await faceapi
        .detectSingleFace(selfImg, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      const nId = idDet ? 1 : 0;
      const nSelf = selfDet ? 1 : 0;
      setIdFaces(nId);
      setSelfieFaces(nSelf);

      if (!idDet || !selfDet) {
        setMsg("Face not clear in one photo. Try clear photos, then upload for approval.");
        await upload(null, nId, nSelf);
        return;
      }

      const score = distance(idDet.descriptor, selfDet.descriptor);
      setFaceScore(score);
      setMsg(
        score <= 0.55
          ? `Faces look the same (${score.toFixed(2)}). Press Upload for approval.`
          : score <= 0.65
            ? `Faces are close (${score.toFixed(2)}). Upload for manual approval.`
            : `Faces look different (${score.toFixed(2)}). Use your own licence and live selfie.`
      );
    } catch {
      setMsg("Face check failed. Upload anyway for manual approval.");
    } finally {
      setChecking(false);
    }
  }

  async function upload(
    score: number | null = faceScore,
    nId: number = idFaces,
    nSelf: number = selfieFaces
  ) {
    if (!idFile || !selfieFile) {
      setMsg("Licence photo and live selfie are both needed.");
      return;
    }
    setUploading(true);
    setMsg("Sending to approval...");
    try {
      const fd = new FormData();
      fd.append("idFront", idFile);
      fd.append("selfie", selfieFile);
      if (score !== null) fd.append("faceScore", String(score));
      fd.append("idFaces", String(nId || (idFile ? 1 : 0)));
      fd.append("selfieFaces", String(nSelf || (selfieFile ? 1 : 0)));

      const res = await fetch("/api/verify/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error ?? "Upload failed.");
        return;
      }
      stopCamera();
      setStatus(data.status);
      setReason(data.reason ?? "");
      setMsg(
        data.status === "VERIFIED"
          ? "Good! You are verified now."
          : data.status === "PENDING"
            ? "Live picture sent to approval. Wait a bit."
            : `Not accepted: ${data.reason ?? ""}`
      );
    } catch {
      setMsg("Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-bold">Verify licence</h1>
      <p className="mt-1 text-sm text-gray-600">{modelMsg}</p>
      <p className="mt-2 text-sm">
        Status now: <strong>{status}</strong>
        {reason ? <span className="text-gray-600"> — {reason}</span> : null}
      </p>
      <p className="mt-2 text-sm text-gray-600">Step {step} of 2</p>

      {step === 1 ? (
        <div className="mt-4 rounded border p-3">
          <span className="text-sm font-bold">Step 1. Licence photo</span>
          <input
            type="file"
            accept="image/*"
            className="mt-2 w-full"
            onChange={(e) => pickId(e.target.files?.[0])}
          />
          {idUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={idUrl} alt="ID" className="mt-2 max-h-48 rounded" />
          ) : null}
          {idFile ? (
            <div className="mt-3 rounded bg-yellow-100 p-3 text-sm">
              <strong>Warning: next is the live selfie check.</strong>
              <br />
              Look at the camera, good light, no glasses, no hat. The live
              picture goes to approval.
            </div>
          ) : null}
          <button
            disabled={!idFile}
            onClick={() => setStep(2)}
            className="mt-3 rounded bg-black px-4 py-2 text-white disabled:opacity-50"
          >
            Next: live selfie
          </button>
        </div>
      ) : (
        <div className="mt-4 rounded border p-3">
          <span className="text-sm font-bold">Step 2. Live selfie check</span>
          <p className="mt-1 text-xs text-gray-600">
            Take a live picture now. It will be sent to approval with your licence.
          </p>
          <div className="mt-2">
            <video ref={videoRef} playsInline muted className={`max-h-64 w-full rounded bg-black ${camOn ? "" : "hidden"}`} style={{ transform: "scaleX(-1)" }} />
            {!camOn ? (
              <button onClick={startCamera} className="rounded bg-gray-800 px-4 py-2 text-white">
                Open live camera
              </button>
            ) : (
              <div>
                <div className="mt-2 flex gap-2">
                  <button onClick={captureLive} className="rounded bg-black px-4 py-2 text-white">
                    Take live picture
                  </button>
                  <button onClick={stopCamera} className="rounded border px-4 py-2">
                    Close camera
                  </button>
                </div>
              </div>
            )}
            {camError ? <p className="mt-2 text-sm text-red-600">{camError}</p> : null}
          </div>
          <label className="mt-3 block text-sm">
            If camera does not work, upload a selfie file:
            <input
              type="file"
              accept="image/*"
              className="mt-1 w-full"
              onChange={(e) => pickSelfieFile(e.target.files?.[0])}
            />
          </label>
          {selfieUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={selfieUrl} alt="live selfie" className="mt-2 max-h-48 rounded" />
          ) : null}
          <div className="mt-3 flex gap-2">
            <button onClick={() => setStep(1)} className="rounded border px-4 py-2">
              Back
            </button>
            <button
              onClick={runCheck}
              disabled={checking || uploading}
              className="rounded bg-gray-800 px-4 py-2 text-white disabled:opacity-50"
            >
              {checking ? "Checking..." : "Check faces"}
            </button>
            <button
              onClick={() => upload()}
              disabled={uploading || checking}
              className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
            >
              {uploading ? "Sending..." : "Send to approval"}
            </button>
          </div>
        </div>
      )}

      {faceScore !== null ? (
        <p className="mt-3 text-sm">
          Face score: <strong>{faceScore.toFixed(3)}</strong> (small = same
          person). Licence faces: {idFaces}, selfie faces: {selfieFaces}
        </p>
      ) : null}
      {msg ? <p className="mt-3 text-sm">{msg}</p> : null}
    </main>
  );
}
