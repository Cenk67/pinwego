const EMBED_SPAN_ZOOM0 = 522953451.522212

export function googleEmbedUrl(lat: number, lng: number, zoom: number) {
  const latitude = Number(lat.toFixed(6))
  const longitude = Number(lng.toFixed(6))
  const span = (EMBED_SPAN_ZOOM0 * Math.cos((latitude * Math.PI) / 180)) / 2 ** zoom
  const pb = `!1m11!1m8!1m3!1d${span}!2d${longitude}!3d${latitude}!3m2!1i1024!2i768!4f13.1!5e0!6i${zoom}!3m1!1str!5m1!1str`
  return `https://www.google.com/maps/embed?origin=mfe&pb=${pb}`
}

export function googlePlaceLink(lat: number, lng: number, zoom = 14) {
  return `https://www.google.com/maps/@${lat.toFixed(6)},${lng.toFixed(6)},${zoom}z`
}
