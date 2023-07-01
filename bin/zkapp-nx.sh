#!/usr/bin/env bash

# assist zkapp contracts to work within nx project
# with nx libs and "zk deploy" compatibility

test ! -f ../../nx.json \
  && echo "ERROR: ${0}: run from within zkapp contracts directory" \
  && exit 1

# "zk deploy" expects compiled output in ./build
# - symlink nx build dir
build_dir=$(basename $(pwd))
rm -rf ./build
ln -sf ../../dist/libs/${build_dir} ./build

# "zk deploy" expects ./node_modules to exist
# - built nx libraries are symlinked (by main npm postinstall)
ln -sf ../../node_modules .
