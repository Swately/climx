// desciel -> glyph + accessible label. The SMN vocabulary observed in the live
// payload; unknown values fall back honestly instead of guessing.
const SKY: Record<string, string> = {
  Despejado: '☀️',
  'Poco nuboso': '🌤️',
  'Medio nublado': '⛅',
  Nublado: '🌥️',
  'Cielo nublado': '🌥️',
  Cubierto: '☁️',
  'Cielo cubierto': '☁️',
  Chubascos: '🌦️',
  Lluvia: '🌧️',
  Tormenta: '⛈️',
};

export function skyIcon(desciel: string): string {
  return SKY[desciel] ?? '🌡️';
}

// Made with my soul - Swately <3
