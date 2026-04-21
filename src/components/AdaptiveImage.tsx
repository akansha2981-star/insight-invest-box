interface AdaptiveImageProps {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  loading?: "eager" | "lazy";
}

export function AdaptiveImage({
  src,
  alt,
  className = "",
  imgClassName = "",
  loading = "lazy",
}: AdaptiveImageProps) {
  return (
    <div className={`relative overflow-hidden bg-muted ${className}`}>
      <img
        src={src}
        alt=""
        aria-hidden="true"
        loading={loading}
        className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl opacity-30"
      />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-background/10 via-transparent to-transparent" />
      <img
        src={src}
        alt={alt}
        loading={loading}
        className={`relative z-10 h-full w-full object-contain ${imgClassName}`}
      />
    </div>
  );
}