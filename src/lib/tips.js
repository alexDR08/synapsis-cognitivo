// Consejos de bienestar que da Chispa.
export const TIPS = [
  'Toma un vaso de agua: el cerebro rinde mejor bien hidratado.',
  'Respira hondo 4 segundos, sostén 4 y suelta 6. Repite tres veces para bajar el estrés.',
  'Cada 45 minutos de estudio, levántate y estírate un par de minutos.',
  'Dormir 7 a 9 horas ayuda a que tu cerebro consolide lo que aprendiste hoy.',
  'Mira lejos de la pantalla cada 20 minutos: busca algo a 6 metros durante 20 segundos.',
  'Una caminata corta oxigena tu cerebro y despeja las ideas.',
  'Escribe lo que te preocupa en un papel; sacarlo de la cabeza libera espacio mental.',
  'Haz una sola tarea a la vez: cambiar de una a otra cansa más que avanzar en una.',
  'Come algo ligero y con proteína antes de estudiar; evita los picos de azúcar.',
  'Platicar con un amigo cinco minutos también es descansar.',
  'Deja el celular lejos mientras estudias: su sola presencia distrae.',
  'Sonríe y relaja los hombros. Tu cuerpo le avisa a tu mente que todo está bien.',
  'Divide una tarea grande en pasos pequeños y celebra cada uno.',
  'Un poco de luz natural en la mañana mejora tu energía y tu sueño.',
  'No necesitas hacerlo perfecto: avanzar un poco cada día cuenta.',
  'Repasa lo aprendido antes de dormir; se te queda mejor.',
  'Escucha música tranquila sin letra si te cuesta concentrarte.',
  'Pedir ayuda no es debilidad, es una estrategia inteligente.',
  'Mueve el cuerpo: 10 minutos de ejercicio mejoran tu ánimo y tu memoria.',
  'Tómate un descanso sin pantallas: mira por la ventana o estira el cuello.',
]

export function randomTip(exclude) {
  const options = TIPS.filter((tip) => tip !== exclude)
  return options[Math.floor(Math.random() * options.length)]
}
