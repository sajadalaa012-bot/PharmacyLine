"use client";

import { MOBILE_PHOTO_QUERY, ResponsivePhoto } from "@/types";

interface BannerPhotoProps {
  photo: ResponsivePhoto;
  alt: string;
  className?: string;
  /** Banners above the fold should not wait to be scrolled to. */
  loading?: "eager" | "lazy";
}

/**
 * A banner photograph that changes file on a narrow screen.
 *
 * A <picture> with a media query rather than a choice made in JavaScript. The
 * browser picks the source before it fetches anything, so a phone never
 * downloads the wide photograph and there is no first render of the wrong one
 * to swap out afterwards. Picking in JS would mean rendering, measuring and
 * replacing, which is a visible flash on the screen least able to afford it.
 *
 * A slide with only one photograph renders as a plain img, so nothing pays
 * for a feature it is not using.
 */
export default function BannerPhoto({
  photo,
  alt,
  className = "",
  loading = "eager",
}: BannerPhotoProps) {
  if (!photo.wide) return null;

  /* eslint-disable @next/next/no-img-element */
  if (!photo.mobile) {
    return (
      <img src={photo.wide} alt={alt} loading={loading} className={className} />
    );
  }

  return (
    <picture>
      <source media={MOBILE_PHOTO_QUERY} srcSet={photo.mobile} />
      <img src={photo.wide} alt={alt} loading={loading} className={className} />
    </picture>
  );
  /* eslint-enable @next/next/no-img-element */
}
