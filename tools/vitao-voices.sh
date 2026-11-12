#!/bin/bash
# Converte as gravações do Rafik (WAV estéreo 24-bit) para mp3 mono 96 kbps, sem silêncio nas
# pontas e com volume igualado a -16 LUFS, em duas passadas. Um limitador segura os picos abaixo de
# -1 dBTP depois do mp3, como nos efeitos (sem isso a fala estala no alto-falante).
# Uso: convert.sh <pasta dos WAV do Rafik> <pasta de saída>. Precisa de ffmpeg (brew install ffmpeg).
set -euo pipefail
SRC="$1"; OUT="$2"; mkdir -p "$OUT"
TRIM="silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.06,areverse,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.12,areverse"
convert() {
  local in="$SRC/$1.wav" name="$2"
  # 1ª passada: mede o volume (LUFS) da fala já cortada e em mono
  local stats gain
  stats=$(ffmpeg -hide_banner -nostats -i "$in" -ac 1 -af "$TRIM,loudnorm=print_format=json" -f null - 2>&1 | sed -n '/^{/,/^}/p')
  gain=$(python3 -I -c 'import json,sys; print(round(-16 - float(json.loads(sys.stdin.read())["input_i"]), 2))' <<<"$stats")
  # 2ª passada: ganho fixo até -16 LUFS e limitador com 4x de amostragem (pega os picos entre
  # amostras). O mp3 sobe o pico 2–3 dB: começa em -4,5 dBFS e, se o mp3 passar de -1 dBTP, refaz
  # com o limitador 1,5 dB mais baixo
  local limit_db peak
  for limit_db in -4.5 -6 -7.5; do
    ffmpeg -hide_banner -loglevel error -y -i "$in" -ac 1 \
      -af "$TRIM,volume=${gain}dB,aresample=176400,alimiter=limit=${limit_db}dB:attack=1:release=50:level=false,aresample=44100" \
      -c:a libmp3lame -b:a 96k "$OUT/$name.mp3"
    peak=$(ffmpeg -hide_banner -nostats -i "$OUT/$name.mp3" -af ebur128=peak=true -f null - 2>&1 |
      awk '/True peak:/{t=1} t&&/Peak:/{print $2; exit}')
    python3 -I -c 'import sys; sys.exit(0 if float(sys.argv[1]) <= -1.0 else 1)' "$peak" && break
  done
}
while IFS='|' read -r src name; do
  [ -z "$src" ] && continue
  convert "$src" "$name"
done <<'LIST'
confronto|vitao-confronto
confronto_2|vitao-confronto-2
round 1|vitao-round-1
round 2|vitao-round-2
empate|vitao-round-empatado
perdeu_a_vez|vitao-oponente-perdeu-a-vez
empate absoluto|vitao-empate-absoluto
match point[E]|vitao-match-point
match point[C]|vitao-match-point-filtrado
morte subita[E]|vitao-morte-subita
morte subita[C]|vitao-morte-subita-filtrado
usage_ vitoria_rodada[E]|vitao-round-vitoria
usage_ derrota_rodada[E]|vitao-round-derrota
tempo esgotado[E] 1|vitao-tempo-esgotado-1
tempo esgotado[C] 1|vitao-tempo-esgotado-1-filtrado
tempo esgotado[E] 2|vitao-tempo-esgotado-2
tempo esgotado[C] 2|vitao-tempo-esgotado-2-filtrado
Vitoria W.O[E]|vitao-wo-vitoria
Vitoria W.O[C]|vitao-wo-vitoria-filtrado
W.O[E]|vitao-wo-derrota
W.O[C]|vitao-wo-derrota-filtrado
usage_ desconectado[E]|vitao-oponente-desconectado
usage_ desconectado[C]|vitao-oponente-desconectado-filtrado
usage_campo de força[E]|vitao-anulada
usage_ sem efeito[E]|vitao-sem-efeito
usage_ sem efeito[C]|vitao-sem-efeito-filtrado
usage_ bomba[E]|vitao-habilidade-bomba
usage_ bomba[C]|vitao-habilidade-bomba-filtrado
usage_ escudo[E]|vitao-habilidade-escudo
usage_ escudo[C]|vitao-habilidade-escudo-filtrado
usage_ ampulheta[E]|vitao-habilidade-ampulheta
usage_ ampulheta[C]|vitao-habilidade-ampulheta-filtrado
usage_ tornado[E]|vitao-habilidade-tornado
usage_ tornado[C]|vitao-habilidade-tornado-filtrado
usage_ buraco negro[E]|vitao-habilidade-buraco-negro
usage_ buraco negro[C]|vitao-habilidade-buraco-negro-filtrado
usage_ congelado[E]|vitao-habilidade-congelar
usage_ congelado[C]|vitao-habilidade-congelar-filtrado
ativacao_campo de força[E]|vitao-habilidade-campo-de-forca
usage_ silenciado[E]|vitao-habilidade-silencio
usage_ silenciado[C]|vitao-habilidade-silencio-filtrado
usage_ troca rapida[C]|vitao-habilidade-troca-rapida
usage_ reforço[C]|vitao-habilidade-reforco
usage_ vitória[E]|vitao-vitoria
usage_vitoria[C]|vitao-vitoria-filtrado
usage_ derrota[E]|vitao-derrota
usage_ derrota[C]|vitao-derrota-filtrado
vitoria implacavel|vitao-vitoria-implacavel
usage_ fuga[E]|vitao-oponente-saiu
usage_ fuga[C]|vitao-oponente-saiu-filtrado
LIST
