"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Camera, Loader2, QrCode, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { getErrorMessage } from "@/lib/ui-helpers";
import type { FaceVerificationSession } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function normalizeRedirectPath(path?: string | null) {
  if (!path) {
    return "/";
  }

  if (!path.startsWith("/")) {
    return "/";
  }

  if (path.startsWith("/login") || path.startsWith("/admin/login")) {
    return "/";
  }

  if (path.startsWith("/verify") || path.startsWith("/face-verify")) {
    return "/";
  }

  return path;
}

function buildQrImageUrl(content: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(content)}`;
}

function FaceVerifyPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isReady, setProfile, refreshUser } = useAuth();

  const sessionToken = (searchParams.get("session") || "").trim();
  const redirectTo = normalizeRedirectPath(searchParams.get("redirect"));
  const isSessionMode = Boolean(sessionToken);

  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const [requestError, setRequestError] = React.useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = React.useState(false);
  const [isCapturing, setIsCapturing] = React.useState(false);
  const [cameraCycle, setCameraCycle] = React.useState(0);
  const [qrSession, setQrSession] =
    React.useState<FaceVerificationSession | null>(null);
  const [isCreatingQr, setIsCreatingQr] = React.useState(false);
  const [sessionMessage, setSessionMessage] = React.useState<string | null>(
    null,
  );

  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  const canStartCamera =
    isSessionMode || Boolean(user?.verified && !user?.faceVerified);

  const stopCamera = React.useCallback(() => {
    if (!streamRef.current) {
      return;
    }

    streamRef.current.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  React.useEffect(() => {
    if (!isReady || isSessionMode) {
      return;
    }

    if (!user) {
      const facePath = `/face-verify?redirect=${encodeURIComponent(redirectTo)}`;
      router.replace(`/login?redirect=${encodeURIComponent(facePath)}`);
      return;
    }

    if (!user.verified) {
      router.replace(`/verify?redirect=${encodeURIComponent(redirectTo)}`);
      return;
    }

    if (user.faceVerified) {
      router.replace(redirectTo);
    }
  }, [isReady, isSessionMode, redirectTo, router, user]);

  React.useEffect(() => {
    if (!canStartCamera) {
      return;
    }

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setCameraError("Camera is not available on this device.");
      setIsCameraReady(false);
      return;
    }

    let cancelled = false;

    const startCamera = async () => {
      setCameraError(null);
      setIsCameraReady(false);
      stopCamera();

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        const video = videoRef.current;
        if (!video) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        video.srcObject = stream;
        await video.play();
        setIsCameraReady(true);
      } catch (error) {
        setIsCameraReady(false);
        setCameraError(
          getErrorMessage(
            error,
            "Unable to access camera. Allow camera permission and try again.",
          ),
        );
      }
    };

    void startCamera();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [cameraCycle, canStartCamera, stopCamera]);

  React.useEffect(() => {
    if (!qrSession?.token || !user) {
      return;
    }

    let cancelled = false;
    let timerId: number | undefined;
    let completed = false;

    const poll = async () => {
      if (completed) {
        return;
      }

      try {
        const latest = await api.getFaceVerificationSession(qrSession.token);
        if (cancelled) {
          return;
        }

        setQrSession(latest);

        if (latest.status === "COMPLETED") {
          completed = true;
          if (timerId) {
            window.clearInterval(timerId);
          }
          setSessionMessage(
            "Face verification completed from your other device.",
          );
          toast.success("Face verified successfully");
          await refreshUser();
          const target = normalizeRedirectPath(
            latest.redirectPath || redirectTo,
          );
          if (typeof window !== "undefined") {
            window.location.href = target;
          } else {
            router.replace(target);
          }
        }

        if (latest.status === "EXPIRED") {
          completed = true;
          if (timerId) {
            window.clearInterval(timerId);
          }
          setSessionMessage(
            "This QR session has expired. Generate a new one and try again.",
          );
        }
      } catch {
        // Ignore transient polling failures.
      }
    };

    void poll();
    timerId = window.setInterval(() => {
      void poll();
    }, 4000);

    return () => {
      cancelled = true;
      window.clearInterval(timerId);
    };
  }, [qrSession?.token, redirectTo, refreshUser, router, user]);

  const handleCapture = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || !isCameraReady) {
      setRequestError("Camera is not ready yet. Please try again.");
      return;
    }

    setRequestError(null);
    setIsCapturing(true);

    try {
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Unable to process camera frame");
      }

      context.drawImage(video, 0, 0, width, height);
      const imageDataUrl = canvas.toDataURL("image/jpeg", 0.9);

      const profile = await api.verifyFace({
        imageDataUrl,
        sessionToken: sessionToken || undefined,
      });

      setRequestError(null);
      setSessionMessage(
        isSessionMode
          ? "Face verified successfully. You can continue on your original device now."
          : "Face verification successful.",
      );

      if (user) {
        setProfile(profile);
        const target = normalizeRedirectPath(redirectTo);
        if (typeof window !== "undefined") {
          window.location.href = target;
        } else {
          router.replace(target);
        }
      }
    } catch (error) {
      const message = getErrorMessage(error, "Unable to verify face");
      setRequestError(message);
      toast.error(message);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleTryAgain = () => {
    setRequestError(null);
    setCameraError(null);
    setSessionMessage(null);
    setCameraCycle((value) => value + 1);
  };

  const handleCreateQrSession = async () => {
    if (!user) {
      toast.error("Please login before creating a QR verification session");
      return;
    }

    setIsCreatingQr(true);
    setSessionMessage(null);
    try {
      const session = await api.createFaceVerificationSession({
        redirectPath: redirectTo,
      });
      setQrSession(session);
      toast.success("QR session created. Scan it from another device.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to create QR verification"));
    } finally {
      setIsCreatingQr(false);
    }
  };

  if (!isReady && !isSessionMode) {
    return (
      <Card className="w-full max-w-2xl border-border/50 shadow-xl shadow-primary/5">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            Preparing camera...
          </CardTitle>
          <CardDescription>
            Checking your account and camera access.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl border-border/50 shadow-xl shadow-primary/5">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <ShieldCheck className="h-7 w-7 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold">Face Verification</CardTitle>
        <CardDescription>
          Position your face clearly in the frame and verify to continue.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-muted/30 p-2">
          <video
            ref={videoRef}
            className="h-[280px] w-full rounded-xl bg-black object-cover [transform:scaleX(-1)] sm:h-[360px]"
            autoPlay
            playsInline
            muted
          />
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {cameraError ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {cameraError}
          </div>
        ) : null}

        {requestError ? (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
            {requestError}
          </div>
        ) : null}

        {sessionMessage ? (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
            {sessionMessage}
          </div>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            onClick={handleCapture}
            className="h-11 flex-1"
            disabled={!canStartCamera || isCapturing || !isCameraReady}
          >
            {isCapturing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Camera className="mr-2 h-4 w-4" />
            )}
            Capture and Verify
          </Button>

          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={handleTryAgain}
            disabled={isCapturing}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>

        {!isSessionMode && user ? (
          <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Verify face on another device
                </p>
                <p className="text-xs text-muted-foreground">
                  If this camera fails, scan QR from another phone/laptop to
                  finish verification.
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={handleCreateQrSession}
                disabled={isCreatingQr}
              >
                {isCreatingQr ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <QrCode className="mr-2 h-4 w-4" />
                )}
                Generate QR
              </Button>
            </div>

            {qrSession ? (
              <div className="mt-4 flex flex-col items-center gap-3 rounded-xl border border-border/60 bg-background/80 p-4 text-center">
                <img
                  src={buildQrImageUrl(qrSession.verificationUrl)}
                  alt="QR code for cross-device face verification"
                  className="h-48 w-48 rounded-lg border border-border/60 bg-white p-2"
                />
                <p className="text-xs text-muted-foreground">
                  Session status:{" "}
                  <span className="font-medium">{qrSession.status}</span>
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function FaceVerifyPage() {
  return (
    <React.Suspense
      fallback={
        <Card className="w-full max-w-2xl border-border/50 shadow-xl shadow-primary/5">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Loading...</CardTitle>
            <CardDescription>Preparing face verification page</CardDescription>
          </CardHeader>
        </Card>
      }
    >
      <FaceVerifyPageContent />
    </React.Suspense>
  );
}
