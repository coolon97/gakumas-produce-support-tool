const LOCAL_IMAGE_MODULES = import.meta.glob('../../assets/game/**/*.{png,jpg,jpeg,webp,PNG,JPG,JPEG,WEBP}', {
  eager: true,
  import: 'default',
}) as Record<string, string>

const LOCAL_IMAGE_URLS = Object.fromEntries(
  Object.entries(LOCAL_IMAGE_MODULES).map(([path, url]) => {
    const normalizedPath = path.replace(/^\.\.\/\.\.\/assets\/game\//, '').replace(/\\/g, '/')
    return [normalizedPath, url]
  }),
) as Record<string, string>

export function resolveLocalAssetUrl(imageRef?: string): string | undefined {
  if (!imageRef) {
    return undefined
  }

  if (!imageRef.startsWith('local:')) {
    return imageRef
  }

  const assetPath = imageRef.slice('local:'.length)
  return LOCAL_IMAGE_URLS[assetPath]
}
