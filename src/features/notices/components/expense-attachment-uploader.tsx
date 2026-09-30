"use client"

import { FileText, Trash2, Upload } from "lucide-react"
import { useRef, useState } from "react"

import { Button } from "@/shared/components/ui/button"
import type { FileAttachment } from "@/shared/types/database"

const MAX_FILE_SIZE = 20 * 1024 * 1024
const MAX_FILES = 5
const ACCEPTED_EXTENSIONS = new Set([
  "pdf", "xlsx", "xls", "csv", "hwp", "hwpx", "doc", "docx", "png", "jpg", "jpeg", "webp",
])

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)}KB`
  return `${(size / (1024 * 1024)).toFixed(1)}MB`
}

function createStorageName(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "file"
  const token = crypto.randomUUID().replaceAll("-", "")
  return `expense-reports/${Date.now()}-${token}.${extension}`
}

export function ExpenseAttachmentUploader({
  defaultValue = [],
  onUploadingChange,
}: {
  defaultValue?: FileAttachment[]
  onUploadingChange?: (uploading: boolean) => void
}) {
  const [attachments, setAttachments] = useState<FileAttachment[]>(defaultValue)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return
    const selected = Array.from(files)
    const remaining = MAX_FILES - attachments.length
    if (selected.length > remaining) {
      setError(`첨부파일은 최대 ${MAX_FILES}개까지 등록할 수 있습니다.`)
      return
    }

    for (const file of selected) {
      const extension = file.name.split(".").pop()?.toLowerCase()
      if (!extension || !ACCEPTED_EXTENSIONS.has(extension)) {
        setError("PDF, 문서, 스프레드시트 또는 이미지 파일만 첨부할 수 있습니다.")
        return
      }
      if (file.size > MAX_FILE_SIZE) {
        setError("첨부파일은 파일당 20MB 이하만 등록할 수 있습니다.")
        return
      }
    }

    setError(null)
    setUploading(true)
    onUploadingChange?.(true)
    try {
      const uploaded = await Promise.all(selected.map(async (file) => {
        const response = await fetch(
          `/api/upload?scope=expense&filename=${encodeURIComponent(createStorageName(file))}`,
          {
            method: "POST",
            headers: { "content-type": file.type || "application/octet-stream" },
            body: file,
          }
        )
        const result = await response.json() as { path?: string; error?: string }
        if (!response.ok || !result.path) {
          throw new Error(result.error || "첨부파일 업로드에 실패했습니다.")
        }
        return {
          name: file.name,
          path: result.path,
          size: file.size,
          mime_type: file.type || null,
        } satisfies FileAttachment
      }))
      setAttachments((current) => [...current, ...uploaded])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "첨부파일 업로드에 실패했습니다.")
    } finally {
      setUploading(false)
      onUploadingChange?.(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  function remove(path: string) {
    setAttachments((current) => current.filter((attachment) => attachment.path !== path))
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-secondary/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">첨부파일</p>
          <p className="mt-0.5 text-xs text-muted-foreground">최대 5개, 파일당 20MB · 운영진만 열람할 수 있습니다.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading || attachments.length >= MAX_FILES}>
          <Upload className="mr-1.5 size-3.5" aria-hidden />
          {uploading ? "업로드 중..." : "파일 첨부"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          accept=".pdf,.xlsx,.xls,.csv,.hwp,.hwpx,.doc,.docx,.png,.jpg,.jpeg,.webp"
          multiple
          onChange={(event) => void handleFiles(event.target.files)}
        />
      </div>

      <input type="hidden" name="attachments" value={JSON.stringify(attachments)} />

      {attachments.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {attachments.map((attachment) => (
            <li key={attachment.path} className="flex min-w-0 items-center gap-2 px-3 py-2.5">
              <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <a
                href={`/api/admin/expense-attachments?path=${encodeURIComponent(attachment.path)}`}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1 truncate text-sm text-foreground hover:underline"
              >
                {attachment.name}
              </a>
              <span className="shrink-0 text-xs text-muted-foreground">{formatFileSize(attachment.size)}</span>
              <button type="button" onClick={() => remove(attachment.path)} className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive" aria-label={`${attachment.name} 삭제`}>
                <Trash2 className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
    </div>
  )
}
