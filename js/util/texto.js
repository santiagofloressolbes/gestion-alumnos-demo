// Para buscar sin fijarse en mayúsculas ni tildes: "Garcia" encuentra "García".
export function norm(t) {
  return String(t ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}
