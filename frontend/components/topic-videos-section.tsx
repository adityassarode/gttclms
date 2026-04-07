"use client";

import * as React from "react";
import {
  MessageSquare,
  PlayCircle,
  Send,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useRequireLoginAction } from "@/lib/route-guards";
import type { TopicVideo, TopicVideoComment } from "@/lib/types";
import { getErrorMessage, toIsoDate } from "@/lib/ui-helpers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

function toEmbedUrl(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();

    if (host.includes("youtu.be")) {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      if (id) {
        return `https://www.youtube.com/embed/${id}`;
      }
    }

    if (host.includes("youtube.com")) {
      const id = parsed.searchParams.get("v");
      if (id) {
        return `https://www.youtube.com/embed/${id}`;
      }
      if (parsed.pathname.startsWith("/embed/")) {
        return parsed.toString();
      }
    }

    if (host.includes("vimeo.com")) {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      if (id) {
        return `https://player.vimeo.com/video/${id}`;
      }
    }

    return rawUrl;
  } catch {
    return rawUrl;
  }
}

export function TopicVideosSection() {
  const requireLogin = useRequireLoginAction();

  const [videos, setVideos] = React.useState<TopicVideo[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedVideoId, setSelectedVideoId] = React.useState<string | null>(
    null,
  );
  const [commentsByVideo, setCommentsByVideo] = React.useState<
    Record<string, TopicVideoComment[]>
  >({});
  const [commentsLoadingByVideo, setCommentsLoadingByVideo] = React.useState<
    Record<string, boolean>
  >({});
  const [commentDraftByVideo, setCommentDraftByVideo] = React.useState<
    Record<string, string>
  >({});
  const [commentSubmittingByVideo, setCommentSubmittingByVideo] =
    React.useState<Record<string, boolean>>({});

  const selectedVideo = React.useMemo(
    () => videos.find((video) => String(video.id) === selectedVideoId) || null,
    [selectedVideoId, videos],
  );

  const loadComments = React.useCallback(async (videoId: string) => {
    setCommentsLoadingByVideo((current) => ({ ...current, [videoId]: true }));
    try {
      const rows = await api.getTopicVideoComments(videoId);
      setCommentsByVideo((current) => ({ ...current, [videoId]: rows }));
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to load comments"));
    } finally {
      setCommentsLoadingByVideo((current) => ({
        ...current,
        [videoId]: false,
      }));
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    const loadVideos = async () => {
      setIsLoading(true);
      try {
        const rows = await api.getTopicVideos();
        if (cancelled) {
          return;
        }

        setVideos(rows);
        if (rows.length > 0) {
          const firstId = String(rows[0].id);
          setSelectedVideoId(firstId);
          void loadComments(firstId);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(getErrorMessage(error, "Unable to load topic videos"));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadVideos();

    return () => {
      cancelled = true;
    };
  }, [loadComments]);

  const handleSelectVideo = async (videoId: string) => {
    setSelectedVideoId(videoId);
    if (!commentsByVideo[videoId]) {
      await loadComments(videoId);
    }
  };

  const handleAddComment = async () => {
    if (!selectedVideo) {
      return;
    }

    if (!requireLogin("/")) {
      return;
    }

    const videoId = String(selectedVideo.id);
    const comment = (commentDraftByVideo[videoId] || "").trim();
    if (!comment) {
      toast.error("Please enter a comment");
      return;
    }

    setCommentSubmittingByVideo((current) => ({ ...current, [videoId]: true }));
    try {
      const created = await api.addTopicVideoComment(videoId, { comment });
      setCommentsByVideo((current) => ({
        ...current,
        [videoId]: [...(current[videoId] || []), created],
      }));
      setCommentDraftByVideo((current) => ({ ...current, [videoId]: "" }));
      toast.success("Comment posted");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to add comment"));
    } finally {
      setCommentSubmittingByVideo((current) => ({
        ...current,
        [videoId]: false,
      }));
    }
  };

  return (
    <section>
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <PlayCircle className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Topic-Wise Videos
          </h2>
          <p className="text-sm text-muted-foreground">
            Learn faster with department and semester specific video lessons.
          </p>
        </div>
      </div>

      {isLoading ? (
        <Card className="border-border/50">
          <CardContent className="p-6 text-sm text-muted-foreground">
            Loading videos...
          </CardContent>
        </Card>
      ) : videos.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="p-6 text-sm text-muted-foreground">
            No topic videos are available right now.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
          <Card className="border-border/50">
            <CardHeader className="space-y-2">
              <CardTitle className="text-lg">
                {selectedVideo?.title || "Video"}
              </CardTitle>
              {selectedVideo ? (
                <p className="text-xs text-muted-foreground">
                  {selectedVideo.subject} • {selectedVideo.department} • Sem{" "}
                  {selectedVideo.semester} • {selectedVideo.year}
                </p>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedVideo ? (
                <>
                  <div className="overflow-hidden rounded-xl border border-border/60 bg-black">
                    <iframe
                      src={toEmbedUrl(selectedVideo.videoUrl)}
                      title={selectedVideo.title}
                      className="aspect-video h-auto w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button size="sm" variant="outline" asChild>
                      <a
                        href={selectedVideo.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open in Fullscreen
                      </a>
                    </Button>
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Available Videos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {videos.map((video) => {
                const id = String(video.id);
                const isSelected = id === selectedVideoId;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => void handleSelectVideo(id)}
                    className={`w-full rounded-lg border p-3 text-left transition ${
                      isSelected
                        ? "border-primary/50 bg-primary/5"
                        : "border-border/60 hover:border-primary/40"
                    }`}
                  >
                    <p className="line-clamp-1 text-sm font-medium text-foreground">
                      {video.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {video.subject} • Sem {video.semester}
                    </p>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card className="border-border/50 xl:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-4 w-4 text-primary" />
                Comments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedVideo ? (
                <>
                  <div className="space-y-3">
                    {commentsLoadingByVideo[String(selectedVideo.id)] ||
                    false ? (
                      <p className="text-sm text-muted-foreground">
                        Loading comments...
                      </p>
                    ) : (commentsByVideo[String(selectedVideo.id)] || [])
                        .length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No comments yet. Start the discussion.
                      </p>
                    ) : (
                      (commentsByVideo[String(selectedVideo.id)] || []).map(
                        (comment) => (
                          <div
                            key={String(comment.id)}
                            className="rounded-lg border border-border/60 px-3 py-2"
                          >
                            <p className="text-sm text-foreground">
                              {comment.comment}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {comment.commentedBy || "Student"} •{" "}
                              {toIsoDate(comment.createdAt)}
                            </p>
                          </div>
                        ),
                      )
                    )}
                  </div>

                  <div className="space-y-2">
                    <Textarea
                      value={
                        commentDraftByVideo[String(selectedVideo.id)] || ""
                      }
                      onChange={(event) =>
                        setCommentDraftByVideo((current) => ({
                          ...current,
                          [String(selectedVideo.id)]: event.target.value,
                        }))
                      }
                      placeholder="Write your comment about this topic..."
                      className="min-h-24"
                    />
                    <Button
                      onClick={handleAddComment}
                      disabled={
                        commentSubmittingByVideo[String(selectedVideo.id)]
                      }
                    >
                      {commentSubmittingByVideo[String(selectedVideo.id)] ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="mr-2 h-4 w-4" />
                      )}
                      Add Comment
                    </Button>
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  );
}
