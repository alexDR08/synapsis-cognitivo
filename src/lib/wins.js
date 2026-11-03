// Aciertos según el juego elegido ('all' | 'sequence' | 'memory' | 'odd').
// En Secuencia de patrones se usa el puntaje de la cuenta (cuenta todos los aciertos desde siempre);
// en Memorama e Intruso visual, los aciertos guardados en Firestore.
export function winsFor(filter, score, games = {}) {
  const wins = (game) => games[game]?.wins || 0
  if (filter === 'sequence') return score
  if (filter === 'all') return score + wins('memory') + wins('odd')
  return wins(filter)
}
