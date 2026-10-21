#!/usr/bin/env bash
# TVHomeLab - tornar o TVHomeLab a Home efetiva SEM desativar pacotes.
#
# Estratégia: tirar de circulação, só no nível de COMPONENTE, as entradas HOME que têm
# prioridade maior que a do TVHomeLab (0):
#   setupwraith RecoveryActivity          (prioridade 1)  -> step1
#   Google TV   HomeActivity              (prioridade 2)  -> step2
# Os pacotes Google TV e setupwraith continuam instalados e habilitados.
# O script só reativa no rollback o que ele mesmo desativou (registro em disabled_by_script.txt).
#
# Uso:
#   ./tvhomelab_home.sh status     # só leitura
#   ./tvhomelab_home.sh step1      # desativa SÓ a RecoveryActivity (sem efeito visível esperado)
#   ./tvhomelab_home.sh step2      # desativa as HOME da Google TV (a Home muda aqui; desfaz sozinho em 60 s)
#   ./tvhomelab_home.sh keytest    # simula HOME via ADB e mostra o que abriu
#   ./tvhomelab_home.sh logcat     # captura 20 s de log enquanto você aperta HOME no controle
#   ./tvhomelab_home.sh undo2      # reativa só as HOME da Google TV (mantém o step1)
#   ./tvhomelab_home.sh rollback   # reativa tudo que o script desativou e devolve a Home à Google TV
#
# Variável opcional: TV=192.168.x.x:5555

set -u

MY_PKG="br.com.caio.tvhomelab"
GTV_PKG="com.google.android.apps.tv.launcherx"
SW_PKG="com.google.android.tungsten.setupwraith"
RECOVERY="$SW_PKG/.RecoveryActivity"
# Usado só se não houver registro de estado (ex.: arquivo apagado).
DEFAULT_RESTORE=("$GTV_PKG/.home.HomeActivity" "$RECOVERY")
USER_ID=0
AUTO_ROLLBACK_SECS=60
OUT_DIR="$HOME/Projetos/TVHomeLab/diagnostico"
STATE_FILE="$OUT_DIR/disabled_by_script.txt"   # linhas: "<etapa> <componente>"

ADB=(adb)
[ -n "${TV:-}" ] && ADB=(adb -s "$TV")
# </dev/null: o adb shell não pode consumir o stdin do script (read/confirmações).
tv() { "${ADB[@]}" shell "$@" </dev/null | tr -d '\r'; }

mkdir -p "$OUT_DIR"

check_adb() {
  if ! "${ADB[@]}" get-state >/dev/null 2>&1; then
    echo "ADB sem conexão. Rode: adb connect <IP-da-TV>:<porta>" >&2
    exit 1
  fi
}

confirm() {
  read -r -p "$1 [digite SIM para continuar] " ans
  [ "$ans" = "SIM" ] || { echo "Cancelado."; exit 1; }
}

home_query() {
  tv cmd package query-activities --brief --user $USER_ID \
    -a android.intent.action.MAIN -c android.intent.category.HOME
}

status() {
  echo "--- papel HOME"
  tv dumpsys role | grep -A2 "name=android.app.role.HOME"
  echo "--- candidatos a HOME (o primeiro vence)"
  home_query
  echo "--- resolve-activity (quem o Android escolhe)"
  tv cmd package resolve-activity --brief --user $USER_ID \
    -a android.intent.action.MAIN -c android.intent.category.HOME
  echo "--- componentes desativados"
  for p in "$GTV_PKG" "$SW_PKG"; do
    echo "[$p]"
    tv dumpsys package "$p" | grep -A8 "disabledComponents:" | head -12
  done
  echo "--- em primeiro plano"
  tv dumpsys activity activities | grep -m2 -E "mResumedActivity|topResumedActivity"
}

snapshot() {
  local f="$OUT_DIR/$1_$(date +%Y%m%d_%H%M%S).txt"
  status >"$f" 2>&1
  echo "Estado salvo em: $f"
}

# restore [etapa]: reativa o que o script desativou (só a etapa dada, ou tudo se omitida).
restore() {
  local only="${1:-}" tag comp
  if [ ! -s "$STATE_FILE" ]; then
    echo ">> Sem registro de estado; restaurando o padrão (HomeActivity + RecoveryActivity)."
    for comp in "${DEFAULT_RESTORE[@]}"; do
      tv pm enable --user $USER_ID "$comp"
    done
    return
  fi
  while read -r tag comp; do
    [ -n "$only" ] && [ "$tag" != "$only" ] && continue
    tv pm enable --user $USER_ID "$comp"
  done <"$STATE_FILE"
  if [ -n "$only" ]; then
    grep -v "^$only " "$STATE_FILE" >"$STATE_FILE.tmp"
    mv "$STATE_FILE.tmp" "$STATE_FILE"
  else
    mv "$STATE_FILE" "$STATE_FILE.$(date +%s).bak"
  fi
}

go_home() {
  sleep 2
  tv am start --user $USER_ID -a android.intent.action.MAIN -c android.intent.category.HOME >/dev/null
  status
}

rollback() {
  check_adb
  echo ">> Reativando o que o script desativou..."
  restore
  go_home
  echo ">> Rollback concluído. Esperado: resolve-activity volta para a Google TV."
}

undo2() {
  check_adb
  echo ">> Reativando só as HOME da Google TV (step1 permanece)..."
  restore step2
  go_home
}

step1() {
  check_adb
  snapshot "antes_step1"
  if ! home_query | grep -q "RecoveryActivity"; then
    echo "A RecoveryActivity já não é candidata a HOME. Nada a fazer no step1."
    exit 0
  fi
  echo "Vai desativar SOMENTE $RECOVERY (nível de componente)."
  echo "Enquanto a Google TV estiver ativa, nada deve mudar na tela."
  confirm "Continuar?"
  tv pm disable --user $USER_ID "$RECOVERY"
  echo "step1 $RECOVERY" >>"$STATE_FILE"
  status
  echo ">> Esperado: RecoveryActivity fora da lista de candidatos; resolve-activity ainda = Google TV."
}

step2() {
  check_adb
  if home_query | grep -q "RecoveryActivity"; then
    echo "A RecoveryActivity ainda é candidata a HOME. Rode 'step1' antes," >&2
    echo "senão ela reativa a Google TV (é o papel dela) e assume a Home no lugar do TVHomeLab." >&2
    exit 1
  fi
  # Desativa só as HOME da Google TV que estão ATIVAS agora (é o que a lista de candidatos mostra).
  # A VanillaModeHomeActivity, por exemplo, está desativada de fábrica e não deve ser tocada.
  mapfile -t TARGETS < <(home_query | grep -oE "${GTV_PKG}/[A-Za-z0-9_.]+" | sort -u)
  if [ "${#TARGETS[@]}" -eq 0 ]; then
    echo "Nenhuma HOME da Google TV na lista de candidatos; nada a desativar." >&2
    exit 1
  fi
  snapshot "antes_step2"
  echo "Vai desativar (componentes, não o pacote):"
  printf '  %s\n' "${TARGETS[@]}"
  echo "Pré-requisito: o botão de configurações do controle abre as Configurações da TV."
  confirm "Continuar?"
  for c in "${TARGETS[@]}"; do
    tv pm disable --user $USER_ID "$c"
    echo "step2 $c" >>"$STATE_FILE"
  done
  sleep 3
  tv am start --user $USER_ID -a android.intent.action.MAIN -c android.intent.category.HOME >/dev/null
  sleep 2
  status
  echo
  echo "Olhe a TV. Se o TVHomeLab estiver na tela, responda S em até ${AUTO_ROLLBACK_SECS}s."
  echo "Sem resposta ou resposta diferente de S = as HOME da Google TV são reativadas."
  if read -r -t "$AUTO_ROLLBACK_SECS" -p "TVHomeLab na tela? [S/n] " r && [[ "$r" =~ ^[Ss]$ ]]; then
    echo ">> Mantido. Agora teste o botão HOME do controle: $0 logcat"
  else
    echo ">> Revertendo o step2..."
    undo2
  fi
}

keytest() {
  check_adb
  tv input keyevent KEYCODE_HOME
  sleep 2
  tv dumpsys activity activities | grep -m2 -E "mResumedActivity|topResumedActivity"
  echo "(keyevent via ADB não substitui o teste com o botão físico do controle: use 'logcat')"
}

logcat_home() {
  check_adb
  echo ">> Aperte o botão HOME do CONTROLE nos próximos 20 s..."
  "${ADB[@]}" logcat -c
  timeout 20 "${ADB[@]}" logcat -v time ActivityTaskManager:I ActivityManager:I '*:S' </dev/null \
    | grep -iE "START u0|cmp=" | tee "$OUT_DIR/logcat_home_$(date +%H%M%S).txt"
  echo "Sucesso: cmp=$MY_PKG/.MainActivity   |   Falha: cmp=$GTV_PKG/.home.HomeActivity"
}

case "${1:-}" in
  status)   check_adb; status ;;
  step1)    step1 ;;
  step2)    step2 ;;
  keytest)  keytest ;;
  logcat)   logcat_home ;;
  undo2)    undo2 ;;
  rollback) rollback ;;
  *)        sed -n '2,22p' "$0"; exit 1 ;;
esac
