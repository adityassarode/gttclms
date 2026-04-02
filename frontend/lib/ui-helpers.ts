export function getErrorMessage(
  error: unknown,
  fallback = "Something went wrong",
) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return fallback;
}

export function toCoverUrl(url?: string | null) {
  if (!url) {
    return "/gttclogo.png";
  }

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return url.startsWith("/") ? url : `/${url}`;
}

export function toIsoDate(value?: string | number | Date | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toISOString().slice(0, 10);
}
