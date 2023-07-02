#!/usr/bin/env bash

# cleanup from a prisma issue, remove once resolved TODO
# [fix(client): don't create package.json automatically](https://github.com/prisma/prisma/pull/19772) 👀

rm -f libs/prisma/package-lock.json
git restore libs/prisma/package.json
