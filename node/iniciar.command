#!/bin/zsh
cd "${0:A:h}"
if [[ -x "./Protocolos-Notariais" ]]; then
  exec ./Protocolos-Notariais
fi
exec node src/server.js
