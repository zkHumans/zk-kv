#!/usr/bin/env bash

# A wrapper to:
# - run a node script from cli with node options
# - execute a built file by referencing its (typescript) source file
#
# Orginally a snarky-run helper; works for snarkyjs files and others.

test -z "${1}" && echo "USAGE: ${0} <path to file>" && exit 1
test ! -f nx.json && echo "ERROR: ${0}: run from project root" && exit 1

node_options=(
  # fixes ERR_MODULE_NOT_FOUND
  --es-module-specifier-resolution=node

  # inspiration from https://github.com/o1-labs/snarkyjs/blob/main/run
  --enable-source-maps
  --stack-trace-limit=1000

  # from zkapp-cli generated contracts
  --experimental-vm-modules
  --experimental-wasm-threads

  # noisy warnings for experimental node options obscure console output
  --no-warnings
)

# convert the path of the source file to
# p: the name of its project
# d: the directory of its project
# b: the full path of its built file
p=$(echo ${1} | cut -d'/' -f 2)
d=$(echo ${1} | cut -d'/' -f 1,2)
f=$(echo ${1} | cut -d'/' -f 3- | sed -e 's/\.ts$/.js/')
b="dist/${d}/${f}"

# rebuild to ensure build file is current
# run npm build script if exists, fallback to nx :build target
grep -q '"build": ' ${d}/package.json \
  && (pushd ${d} && npm run build && popd) \
  || npx nx run ${p}:build

# execute the built file with node options and pass params
exec node ${node_options[@]} ${b} "${@:2}"
