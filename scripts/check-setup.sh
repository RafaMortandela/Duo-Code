#!/usr/bin/env bash
# Confere se a máquina tem o que é preciso para rodar o Duo Code a partir do
# código-fonte. Não instala nada: só diz o que falta e como instalar.
#
# Uso: npm run setup     (ou: bash scripts/check-setup.sh)

set -u

missing=0
ok()   { printf '  \033[32m✓\033[0m %s\n' "$1"; }
fail() { printf '  \033[31m✗\033[0m %s\n      %s\n' "$1" "$2"; missing=$((missing + 1)); }

# versão_atual >= versão_mínima ?
at_least() { [ "$(printf '%s\n%s\n' "$2" "$1" | sort -V | head -n1)" = "$2" ]; }

echo "Duo Code — verificação do ambiente"
echo

echo "Ferramentas"
if command -v node >/dev/null 2>&1; then
  v="$(node -v | sed 's/^v//')"
  if at_least "$v" "20.19.0"; then ok "Node.js $v"; else
    fail "Node.js $v é antigo demais" "Instale o Node.js 22 (https://nodejs.org ou via nvm: nvm install 22)"
  fi
else
  fail "Node.js não encontrado" "Instale o Node.js 22 (https://nodejs.org ou via nvm: nvm install 22)"
fi

if command -v npm >/dev/null 2>&1; then ok "npm $(npm -v)"; else
  fail "npm não encontrado" "Ele vem junto com o Node.js"
fi

if command -v cargo >/dev/null 2>&1; then ok "Rust ($(cargo -V | cut -d' ' -f2))"; else
  fail "Rust não encontrado" "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh   (depois abra um novo terminal)"
fi

python=""
for candidate in python3 python; do
  if command -v "$candidate" >/dev/null 2>&1 &&
     "$candidate" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 9) else 1)' 2>/dev/null; then
    python="$candidate"
    break
  fi
done
if [ -n "$python" ]; then ok "Python ($("$python" -V 2>&1 | cut -d' ' -f2)) — usado para rodar as suas soluções"; else
  fail "Python 3.9 ou mais novo não encontrado" "Debian/Ubuntu: sudo apt install python3"
fi

# Bibliotecas de sistema do Tauri: só no Linux, e só sabemos conferir via dpkg.
if [ "$(uname -s)" = "Linux" ]; then
  echo
  echo "Bibliotecas de sistema (Tauri)"
  if command -v dpkg >/dev/null 2>&1; then
    packages="libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev"
    absent=""
    for pkg in $packages; do
      if dpkg -s "$pkg" >/dev/null 2>&1; then ok "$pkg"; else absent="$absent $pkg"; fi
    done
    if [ -n "$absent" ]; then
      fail "faltam:$absent" "sudo apt install$absent"
    fi
  else
    echo "  Esta distribuição não usa dpkg. Veja os pacotes equivalentes em:"
    echo "  https://tauri.app/start/prerequisites/"
  fi
fi

echo
if [ "$missing" -eq 0 ]; then
  echo "Tudo certo. Próximos passos:"
  echo "  npm install"
  echo "  npm run tauri dev"
else
  echo "Faltam $missing item(ns). Instale o que está marcado com ✗ e rode de novo."
  exit 1
fi
