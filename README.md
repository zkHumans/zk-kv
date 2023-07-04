# ZK:KV

Decentralized Zero-Knowledge Key-Value Store powered by Mina Protocol

- Key-Value data is private and encrypted
  - With optional unencrypted meta (or "protocol") data that may privately reference other data within off-chain storage depending on context
  - Users and/or zkApps can use private secrets to access data and prove inclusion or exclusion of data within sets
  - _any_ number of Store's are supported (actually 2^256) with a single zkApp deployment
- Key-Value data is decentralized
  - participating nodes may collectively distribute the data
  - simply run this same project in multiple instances, configure to monitor the same zkApp Address
- Backend-database agnostic
  - currently supports all [databases supported by Prisma](https://www.prisma.io/docs/reference/database-reference/supported-databases) with a little config-file change
  - other databases and file-stores possible
  - applicable to high-performance data access with the power of decentralized SQL
- How it works
  - each `ZK:KV` Store:
    - has a static identifier (key) and a root hash commitment (value)
    - contains one or more elements of StoreData consisting of a key, a value, and optional meta data
    - is itself StoreData within the zkApp's Store of Stores, hence recursive
  - user/UI interactions with off-chain ZK Key-Values are read-only
    - (but they may write other data, including records associated with the ZK Key-Values)
  - users submit proofs of StoreData changes to the zkApp contract
  - the zkApp validates StoreData updates and emits events
  - the _Indexer_ service reads SmartContract events and writes verified data to off-chain storage

## The zkApp Stack

- [SnarkyJS](https://github.com/o1-labs/SnarkyJS): TypeScript framework for zk-SNARKs and zkApps
- [Nx](https://nx.dev/): Next generation build system with first class monorepo support and powerful integrations
- [tRPC](https://trpc.io/): End-to-end typesafe APIs made easy
  - [zod](https://github.com/colinhacks/zod): TypeScript-first schema validation with static type inference
- [Prisma](https://www.prisma.io/): Next-generation Node.js and TypeScript ORM
- [Jest](https://github.com/jestjs/jest): Delightful JavaScript Testing
- [Traefik](https://github.com/traefik/traefik): The Cloud Native Application Proxy
- UI: Bring your own!... Next.js included, many supported

The `ZK:KV` zkApp Stack may be used as a template or reference for building
other projects. Keep parts you want, remove or leave the rest. The Nx build
system with additional mojo connects elements of the SnarkyJS zkApp; contracts,
UI, indexer/sequencer service, library development, and local offline storage -
into a cohesive interdependent system with great DX.

It especially supports the process of developing SnarkyJS contracts and/or
libraries (publishable or private) while also using them as they are within
other projects within the monorepo.

Seamless integration is achieved in part by using ESM (vs commonjs) exclusively
across the entire stack when possible. A number of configuration measures
facilitate this. Exports (like NPM packages) may still be published in both
formats with configuration.

Refer to the git log for a built-in step-by-step tutorial for how `nx` and
`zkapp-cli` (`zk`) files are generated (including cli flags+options) and
integrated.

## Directory Structure of Projects

```txt
 .
├──  apps
│  ├──  api           # API server; Express ↔ tRPC ↔ Prisma
│  ├──  api-e2e       # E2E API tests
│  ├──  indexer       # process and service the zkApp in the background
│  └──  ui            # zkApp frontend (zkapp-cli generated Next.js)
└──  libs
   ├──  contracts     # SnarkyJS contracts (zkapp-cli generated, with ZK:KV additions)
   ├──  library       # develop your publishable SnarkyJS library here!
   ├──  prisma        # Prisma
   ├──  trpc          # tRPC (api) server
   ├──  trpc-client   # tRPC (api) client
   └──  utils         # misc utilities shared by other projects
```

## Current Status & Limitations

`ZK:KV` is a developing work in progress. It exists in part as a generalized
case study for multi-dimensional ZK Merkle Proofs and an exploration of current
SnarkyJS zkApp design best practices within a production-grade latest-greatest
tech stack.

Utility abstraction is intentionally avoided and/or minimized to not obscure
SnarkyJS implementation details from onboarding new developers.

The UI is underdeveloped (its a general get-started) as this illustrates a
number of design patterns to be consumed (_à la carte_) by other zkApps of more
specific purpose than an end result in and of itself. The Smart Contracts in
their current form work well, however support for high-volume concurrency
(using recursive proofs) is under development. The zkApp indexer, API,
decentralized off-line storage, container deployment, tests, and other parts
work well.

### Authentication

Key-Value data may be authenticated by hashed secrets and proofs of inclusion
within Stores. For example, `HASH (User Mina Wallet Signature)`
could be used as a Store identifier (key within another Store) and/or
StoreData value whereby proof of inclusion within a Store "grants access".

UI/API authentication is context specific so generalization is not yet understood. For reference, see tRPC [Authorization](https://trpc.io/docs/server/authorization), [Custom header](https://trpc.io/docs/client/headers#example-with-auth-login), and [Middlewares](https://trpc.io/docs/server/middlewares#authorization).

### Reference Implementation

Reference for building with `ZK:KV` (with or without the zkApp Stack):

- [libs/contracts/src/ZKKV.ts](libs/contracts/src/ZKKV.ts)
  - ZKKV SnarkyJS SmartContract and Structs
- [libs/contracts/src/cli/demo-zkkv.ts](libs/contracts/src/cli/demo-zkkv.ts)
  - demo/test the contract illustrating deployment, transactions, and sequential event emission
- [apps/api-e2e/src/api/store.spec.ts](apps/api-e2e/src/api/store.spec.ts)
  - off-chain storage interactions of `ZK:KV` Stores and Data using the API
  - shows all operations to create, update, and restore MerkleMaps for proof generation
- [apps/indexer/src/main.ts](apps/indexer/src/main.ts)
  - indexer: fetches zkApp events and processes them into off-chain storage updates
  - tracks block heights of processed events for graceful recovery where it left off
  - supports graceful stop for data integrity protection
- [apps/ui/src/pages/zkkv.tsx](apps/ui/src/pages/zkkv.tsx)
  - ui: connects to, and gets meta data from, the API including the zkApp address
  - imports from the project's namespace, ie `@zk-kv/contracts` so the same code works for (un)published libraries

### Disclaimer

_Not for production use._

## Configuration

- Entirely managed by `.env`
- Sourced by Nx, Docker, and Prisma
- Start with `env-example-development` or `env-example-production`, see comments
- Nx projects may have their own `.env*` configurations

### Dynamic Configuration

Some configuration is served through the API (dynamic real-time) to be consumed
by other aspects that run from static built and/or deployed files. For example,
configuring the `ZKAPP_ADDRESS_` within `.env` and adding it to the API's
`/meta` route makes it easy to update for all components to use.

## Build & Run

### Production

The `ZK:KV` zkApp Stack has a microservices architecture. The following describes
deployment with Docker. Refer to [docker-compose.yml](docker-compose.yml) for
an idea of how the services are run, including within various profiles, for
different deployment context.

```sh
# copy example then edit environment
cp env-example-production .env

# build docker image
docker compose --profile build build

# optional: setup and seed database
docker compose --profile setup up --abort-on-container-exit

# start services
docker compose --profile run up -d
```

The docker compose `run` profile starts the following services:

- Traefik proxy with auto-SSL
- API
- App (UI)
- Indexer
- PostgreSQL
- Prisma Studio (localhost access only)

#### Administration Utilities for Node Operators

Example `~/.ssh/config` configuration to access unexposed (not public) services
running on a server from a local machine. With this configuration, ssh to the
server(s) running the zkApp stack then access the utility with local browser.

```txt
Host zk-kv
Hostname 111.99.111.55
User root
LocalForward 127.0.0.1:15555 localhost:5555 # prisma studio
LocalForward 127.0.0.1:18080 localhost:8080 # traefik API dashboard
```

- [http://localhost:15555](http://localhost:15555) ~ [Prisma Studio](https://www.prisma.io/studio)
- [http://localhost:18080](http://localhost:18080) ~ [Traefik Dashboard](https://doc.traefik.io/traefik/operations/dashboard/)

### Development

```sh
# copy example then edit environment
cp env-example-development .env

# install dependencies
npm install

# start containers: postgres
# (or configure prisma for sqlite, etc)
docker compose --profile dev up

# optional: setup and seed database
npm run setup
```

#### Example Commands

There are various ways to run the different services and Nx targets.

See `nx --help` and scripts in [package.json](package.json), [libs/contracts/package.json](libs/contracts/package.json), etc.

Note: you may need to prefix `nx` with `npx nx`.

```sh
# lint/typecheck/build all projects (except for ui), use nx cache
npm run build

# same as above, watch for changes
npm run buildw

# build all dependencies then serve the ui, at :3000
npm run dev

# start the api, without the inspector, enable watch mode
nx run api:serve:development --inspect=false --watch=true

# start the ui, locally served at :3000
nx run ui:serve:development

# start the indexer
nx run indexer:serve:development

# build the api specifically including all its dependencies
nx run api:build:development --verbose

# run a specific test, watch for changes
nx run contracts:test -t Add --watch

# run tests for a project, show test coverage
nx run contracts:test --coverage

# run the ZK:KV contract demo script, with proofs enabled
./bin/run.sh libs/contracts/src/cli/demo-zkkv.ts

# ...with proofs disabled
ZK_PROOFS_ENABLED=0 ./bin/run.sh libs/contracts/src/cli/demo-zkkv.ts

# generate a random SnarkyJS public/private key pair
./bin/run.sh libs/contracts/src/cli/generate-key.ts

# from zkapp-cli generated contracts, interact with the Add contract
./bin/run.sh libs/contracts/src/interact.ts <deployAlias>

# start the prisma studio to explore+manage the database, at :5555
npx prisma studio

# start the nx graph to explore project/task relationships, at :4211
nx graph

# clear cached nx artifacts and shut down the nx daemon
nx reset

# apply prettier formatting project-wide
nx format:write

# remove some nx-ifications from within the contracts directory
nx run-many --targets=clean

# continually git-pull latest source for updates, and as needed:
# - rebuild docker image
# - apply database migrations
# - restart affected services
while true; do ./bin/deployment-update.sh ; sleep 10m ; done
```

## zkApp Contracts

Contracts work as they do within a `zkapp-cli` generated project. Contracts
reside at [libs/contracts](libs/contracts) and were originally generated by
`zkapp-cli`. Change to their directory for normal `zk` operations, with the
config, keys, etc. More contract directories (projects) can be added.

The stack includes some nx-ifications to support seamless development using the
contracts within other projects of the stack.

- all contract dependencies are built when contracts are built
- contracts may be included with `import { Add } from '@zk-kv/contracts'`, for example (true for all libs/)
- contract interaction files may be run by referencing their source file, for example (true for all cli scripts):
  - `$ ZK_PROOFS_ENABLED=0 ./bin/run.sh libs/contracts/src/lib/demo-zkkv.ts`

### Deploy Contracts

```sh
# install zkapp-cli globally:
npm install -g zkapp-cli

cd libs/contracts
zk config
zk deploy
```

If/when the zkApp Address changes, update it in your `.env`.

### Nx'ification

Note: To cover expectations of `zkapp-cli`, `node_modules/` and `build/` from
the parent project are symlinked within `libs/contracts/`. This is
automatically setup by [bin/zkapp-nx.sh](bin/zkapp-nx.sh) when building the
contracts. A potential undesired, but navigable, side-effect is that some
`--watch`'d tasks or processes (using watchman, for example) may be triggered
to think file changes have occurred when changes happen in these directories,
like by other build processes updating the nx cache.

Use `nx run-many --targets=clean` to manually remove the nx-ifications.

## Tests

### Unit Tests

Tests everywhere! Every project is setup for Jest unit tests (and other testing
engines, like cypress are available with different nx generators).

```sh
npm run test
npm run testw # watch mode
```

The npm scripts are shortcuts for nx:

```sh
npx nx run-many --targets=test
npx nx run-many --targets=test --watch
```

### End-to-end Tests

In different terminals:

```sh
# run the database
# with docker, for example:
docker compose --profile dev up

# run the api
npx nx run api:serve:development

# run the api-e2e tests
npx nx run api-e2e:e2e
```

## API

Refer to the tRPC [routers/](libs/trpc/src/lib/routers/) for existing API
endpoints including those used to interface with Store and StoreData.

### Health Check

The health.check endpoint, `https://api.example.com/api/health.check` checks to
ensure the database (and potentially other system components) are available and
returns a system status indicator which may be used by Uptime/Keyword Monitors
like [UptimeRobot](https://uptimerobot.com/).

Example healthy status: `{"result":{"data":{"json":1}}}`

### Meta

Used to serve configuration and other info. Expand to suit needs of your
project. These are consumed by other components (microservices) within the
project. They may also be used by other projects and/or nodes in a distributed
cluster. For example:

```json
{
  "result": {
    "data": {
      "json": {
        "env": "development",
        "address": {
          "Add": "B62qkwohsqTBPsvhYE8cPZSpzJMgoKn4i1LQRuBAtVXWpaT4dgH6WoA",
          "ZKKV": "B62qnbRW3upekbWwRm5XV7i15zz82SK9CawuLCBCbLQmRTzoBbm1wqw"
        },
        "url": { "auth": "" }
      }
    }
  }
}
```

## Prisma

[Databases supported by Prisma](https://www.prisma.io/docs/reference/database-reference/supported-databases)

### cli

Run Prisma CLI commands via `npx prisma [command]`.

You can certainly add your own [Nx
run-commands](https://nx.dev/packages/workspace/executors/run-commands) to the
[libs/prisma/project.json](libs/prisma/project.json) if you'd like to use
something like `nx run prisma:generate` instead to be consistent with the
general Nx approach.

### files

```txt
 .
└──  libs
   └──  prisma
       ├──  migrations     # database migration files
       ├──  schema.prisma  # models
       └──  seed.ts        # optional database seed upon setup
```

## Contributing

[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

- Follow [`commitizen's conventional-changelog`](https://github.com/commitizen/cz-cli) commit message format
- Use `npm run commit` or `npx cz` for a prompt to assist writing the commit message properly
- The conventional commit scope (the type of change) typically corresponds to Nx project; ie "contracts" or "ui"
  - when possible, keep git commits project- and context- specific (ok to deviate for some broad refactors/migrations)
  - refer to `git log <filename>` for current conventions

### Updating Dependencies

The following is a general suggested flow for `chore: nx migrate and update deps`.

```sh
# inspect updates
npm-check -u

# nx migrate; this updates nx-managed deps
nx migrate latest --interactive

# follow `nx migrate` instructions

# inspect package.json, then
npm install

# if nx migrations, then:
npx nx migrate --run-migrations

# if nx migrations:
# depending on dev context, `git commit` or `rm` migrations.json

# clean up after nx package.json...
nx format:write

# a good idea to run tests from clean cache at this point before proceeding

# update other deps
npm-check -u

# for good measure
npm audit fix

# run unit/e2e tests, contract demos, poke around and confirm good-to-go
```

## Tips

Find this useful? Consider sharing some `$MINA` to support development. Thanks! 🚀

```txt
B62qoVJw8hnhP9H2U3Py6uMudbFwa2pnXAhrmGzxo7bccQdXsdy4Rs8
```

## Nx

<a alt="Nx logo" href="https://nx.dev" target="_blank" rel="noreferrer"><img src="https://raw.githubusercontent.com/nrwl/nx/master/images/nx-logo.png" width="45"></a>

✨ **This workspace has been generated by [Nx, a Smart, fast and extensible build system.](https://nx.dev)** ✨

### Generate code

If you happen to use Nx plugins, you can leverage code generators that might come with it.

Run `nx list` to get a list of available plugins and whether they have generators. Then run `nx list <plugin-name>` to see what generators are available.

Learn more about [Nx generators on the docs](https://nx.dev/plugin-features/use-code-generators).

### Running tasks

To execute tasks with Nx use the following syntax:

```
nx <target> <project> <...options>
```

You can also run multiple targets:

```
nx run-many -t <target1> <target2>
```

..or add `-p` to filter specific projects

```
nx run-many -t <target1> <target2> -p <proj1> <proj2>
```

Targets can be defined in the `package.json` or `projects.json`. Learn more [in the docs](https://nx.dev/core-features/run-tasks).

### Want better Editor Integration?

Have a look at the [Nx Console extensions](https://nx.dev/nx-console). It provides autocomplete support, a UI for exploring and running tasks & generators, and more! Available for VSCode, IntelliJ and comes with a LSP for Vim users.

### Ready to deploy?

Just run `nx build demoapp` to build the application. The build artifacts will be stored in the `dist/` directory, ready to be deployed.

### Set up CI!

Nx comes with local caching already built-in (check your `nx.json`). On CI you might want to go a step further.

- [Set up remote caching](https://nx.dev/core-features/share-your-cache)
- [Set up task distribution across multiple machines](https://nx.dev/core-features/distribute-task-execution)
- [Learn more how to setup CI](https://nx.dev/recipes/ci)

### Connect with us!

- [Join the community](https://nx.dev/community)
- [Subscribe to the Nx Youtube Channel](https://www.youtube.com/@nxdevtools)
- [Follow us on Twitter](https://twitter.com/nxdevtools)
