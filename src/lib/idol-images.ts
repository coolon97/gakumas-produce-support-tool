const LOCAL_P_IDOL_IMAGE_MODULES = import.meta.glob(
  '../../assets/game/PIdol/converted/**/*.{png,jpg,jpeg,webp,PNG,JPG,JPEG,WEBP}',
  {
    eager: true,
    import: 'default',
  },
) as Record<string, string>

const LOCAL_P_IDOL_IMAGE_URLS = Object.fromEntries(
  Object.entries(LOCAL_P_IDOL_IMAGE_MODULES).map(([path, url]) => {
    const fileName = path.split('/').pop() ?? path
    const key = fileName.replace(/\.[^.]+$/, '')
    return [key, url]
  }),
) as Record<string, string>

export function getIdolImageUrl(versionId: string): string | undefined {
  return LOCAL_P_IDOL_IMAGE_URLS[versionId]
}
