"use client";

import * as React from "react";
import { ExternalLink, Loader2, Plus, Trash2, Video } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { TopicVideo } from "@/lib/types";
import { getErrorMessage, toIsoDate } from "@/lib/ui-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function normalizeVideoUrl(url: string) {
  return url.trim();
}

export default function AdminVideosPage() {
  const [videos, setVideos] = React.useState<TopicVideo[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const [title, setTitle] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [department, setDepartment] = React.useState("");
  const [semester, setSemester] = React.useState("");
  const [year, setYear] = React.useState("");
  const [videoUrl, setVideoUrl] = React.useState("");

  const loadVideos = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const rows = await api.getTopicVideos();
      setVideos(rows);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to load topic videos"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (
      !title.trim() ||
      !subject.trim() ||
      !department.trim() ||
      !semester.trim() ||
      !year.trim() ||
      !videoUrl.trim()
    ) {
      toast.error("Fill all required fields");
      return;
    }

    setIsSaving(true);
    try {
      const created = await api.createTopicVideo({
        title: title.trim(),
        subject: subject.trim(),
        department: department.trim(),
        semester: semester.trim(),
        year: year.trim(),
        videoUrl: normalizeVideoUrl(videoUrl),
      });
      setVideos((current) => [created, ...current]);
      setTitle("");
      setSubject("");
      setDepartment("");
      setSemester("");
      setYear("");
      setVideoUrl("");
      toast.success("Video added successfully");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to add topic video"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (video: TopicVideo) => {
    const id = String(video.id);
    setDeletingId(id);
    try {
      await api.deleteTopicVideo(id);
      setVideos((current) => current.filter((row) => String(row.id) !== id));
      toast.success("Video removed");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to delete video"));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Topic Videos
        </h1>
        <p className="mt-1 text-muted-foreground">
          Add semester and subject-wise learning videos for students.
        </p>
      </div>

      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plus className="h-5 w-5" />
            Add Video
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department *</Label>
                <Input
                  id="department"
                  value={department}
                  onChange={(event) => setDepartment(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="semester">Semester *</Label>
                <Input
                  id="semester"
                  value={semester}
                  onChange={(event) => setSemester(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="year">Academic Year *</Label>
                <Input
                  id="year"
                  value={year}
                  onChange={(event) => setYear(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="videoUrl">Video URL (YouTube or other) *</Label>
                <Input
                  id="videoUrl"
                  value={videoUrl}
                  onChange={(event) => setVideoUrl(event.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  required
                />
              </div>
            </div>

            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Video className="mr-2 h-4 w-4" />
              )}
              Save Video
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Uploaded Videos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading videos...</p>
          ) : videos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No videos added yet.
            </p>
          ) : (
            <div className="space-y-3">
              {videos.map((video) => {
                const id = String(video.id);
                const isDeleting = deletingId === id;

                return (
                  <div
                    key={id}
                    className="flex flex-col gap-3 rounded-xl border border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {video.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {video.subject} • {video.department} • Sem{" "}
                        {video.semester} • {video.year}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Added {toIsoDate(video.createdAt)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={video.videoUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Open
                        </a>
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={isDeleting}
                          >
                            {isDeleting ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="mr-2 h-4 w-4" />
                            )}
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Delete this video?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove "{video.title}" from the student
                              dashboard.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(video)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
