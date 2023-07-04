#!/usr/bin/env bash

git pull | grep -v 'up to date' \
  && docker compose --profile build build --pull

docker compose --profile run up -d
