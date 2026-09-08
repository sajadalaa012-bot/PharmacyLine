"use client";

import { useRef, useState } from "react";
import { Image as ImageIcon, X } from "lucide-react";
import { uploadProductImage } from "@/lib/api";
import { useI18n } from "@/lib/LanguageProvider";

interface PhotoPickerProps {
  label: string;
  hint?: string;
  value: string;
  onChange: (dataUrl: string) => void;
  onError: (message: string) => void;
  /** The shape of the preview, so a wide and a tall slot look like what they are. */
  shape?: "wide" | "tall";
  disabled?: boolean;
}

/**
 * One upload slot: a preview at the proportions the photograph will actually
 * be shown at, a button, and a way to clear it.
 *
 * The preview is deliberately cropped the way the storefront crops, rather
 * than letterboxed to show the whole file. A slot that flatters the upload
 * and then crops it on the shop is worse than one that shows the crop.
 */
export default function PhotoPicker({
  label,
  hint,
  value,
  onChange,
  onError,
  shape = "wide",
  disabled = false,
}: PhotoPickerProps) {
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadProductImage(file);
      onChange(res.image_url);
    } catch (err) {
      onError(err instanceof Error ? err.message : t("err.uploadFailed"));
    } finally {
      setUploading(false);
      // Let the same file be chosen again after a failure or a removal.
      e.target.value = "";
    }
  };

  return (
    <div>
      <label className="label-caps mb-1.5 block text-ink-3">{label}</label>
      {hint && <p className="mb-2 text-[11px] text-ink-3">{hint}</p>}

      <div className="relative overflow-hidden rounded-md border border-line bg-sunken">
        <div
          className={`flex w-full items-center justify-center ${
            shape === "wide" ? "aspect-[16/9]" : "aspect-[4/5]"
          }`}
        >
          {value ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={value}
              alt={t("modal.preview")}
              className="h-full w-full object-cover"
            />
          ) : (
            <ImageIcon className="h-6 w-6 text-line-strong" />
          )}
        </div>

        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label={t("modal.removePhoto")}
            className="absolute end-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-rose text-paper shadow hover:opacity-90"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading || disabled}
        className="label-caps mt-2 h-9 w-full rounded-md border border-brand/40 bg-brand/10 text-brand transition hover:bg-brand/20 active:scale-[0.98] disabled:opacity-50"
      >
        {uploading
          ? t("modal.uploading")
          : value
            ? t("photo.replace")
            : t("modal.uploadPhoto")}
      </button>
      <input
        type="file"
        ref={fileRef}
        onChange={pick}
        accept="image/*"
        className="hidden"
      />
    </div>
  );
}
