"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/src/app/shared/ui";

export function ImageFilePreview({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [preview, setPreview] = useState("");

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = () => setPreview(typeof reader.result === "string" ? reader.result : "");
    reader.readAsDataURL(file);
    return () => reader.abort();
  }, [file]);

  return (
    <div className="image-preview">
      {preview && <img src={preview} alt={`Preview of ${file.name}`} />}
      <button type="button" className="image-remove" onClick={onRemove} aria-label={`Remove ${file.name}`}>
        <Icon name="close" size={15} />
      </button>
    </div>
  );
}

export function ImageUploadControls({
  files,
  onFiles,
  existingCount = 0,
}: {
  files: File[];
  onFiles: (files: File[]) => void;
  existingCount?: number;
}) {
  const [error, setError] = useState("");

  return (
    <div className="image-upload-controls">
      <label className="image-picker">
        <Icon name="plus" size={16} /> Add images
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          multiple
          onChange={(event) => {
            const chosen = Array.from(event.currentTarget.files ?? []);
            const oversized = chosen.some((file) => file.size > 5 * 1024 * 1024);
            if (existingCount + files.length + chosen.length > 4) {
              setError("You can attach up to 4 images to a post.");
            } else if (oversized) {
              setError("Each image must be 5 MiB or smaller.");
            } else {
              setError("");
              onFiles([...files, ...chosen]);
            }
            event.currentTarget.value = "";
          }}
        />
      </label>
      <small>JPG, PNG, or WebP · up to 5 MiB each · max 4 images total</small>
      <p className="upload-reminder">Please keep images appropriate for all ages. Explicit or sexualized images are not allowed.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      {files.length > 0 && (
        <div className="image-preview-grid">
          {files.map((file, index) => (
            <ImageFilePreview key={`${file.name}-${file.lastModified}-${index}`} file={file} onRemove={() => onFiles(files.filter((_, i) => i !== index))} />
          ))}
        </div>
      )}
    </div>
  );
}
