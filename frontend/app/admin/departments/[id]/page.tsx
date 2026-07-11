"use client";

import * as React from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function AdminDepartmentDetail({
  params,
}: {
  params: { id: string };
}) {
  const id = params.id;
  const [resources, setResources] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [file, setFile] = React.useState<File | null>(null);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [folder, setFolder] = React.useState("");
  const router = useRouter();

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const rows = await api.getDepartmentResources(id);
      setResources(rows || []);
    } catch (err) {
      toast.error("Unable to load resources");
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Select a file to upload");
      return;
    }

    try {
      await api.uploadDepartmentResource(id, file, title, description, folder);
      toast.success("Uploaded");
      setFile(null);
      setTitle("");
      setDescription("");
      setFolder("");
      void load();
    } catch (err) {
      toast.error("Unable to upload file");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Department Admin</h1>
        <p className="text-sm text-muted-foreground">
          Manage resources for this department.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload Resource</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="space-y-3">
            <div>
              <Label>File</Label>
              <input
                type="file"
                onChange={(e) =>
                  setFile(e.target.files ? e.target.files[0] : null)
                }
              />
            </div>
            <div>
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <Label>Folder</Label>
              <Input
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
              />
            </div>

            <Button type="submit">Upload</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resources</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <p>Loading...</p> : null}
          <div className="space-y-3">
            {resources.map((r) => (
              <div key={r.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{r.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {r.folder}
                    </div>
                  </div>
                  <div>
                    {r.fileUrl ? (
                      <a
                        href={r.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary"
                      >
                        View
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
