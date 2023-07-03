-- CreateTable
CREATE TABLE "log" (
    "id" SERIAL NOT NULL,
    "message" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zkapp" (
    "address" TEXT NOT NULL,
    "blockInit" BIGINT NOT NULL DEFAULT 0,
    "blockLast" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zkapp_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "store" (
    "id" TEXT NOT NULL,
    "commitment" TEXT NOT NULL,
    "meta" JSONB,
    "zkappAddress" TEXT NOT NULL,

    CONSTRAINT "store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storeData" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT,
    "meta" JSONB,
    "blockHeight" BIGINT,
    "globalSlot" BIGINT,
    "storeId" TEXT NOT NULL,

    CONSTRAINT "storeData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "storeData_key_storeId_key" ON "storeData"("key", "storeId");

-- AddForeignKey
ALTER TABLE "store" ADD CONSTRAINT "store_zkappAddress_fkey" FOREIGN KEY ("zkappAddress") REFERENCES "zkapp"("address") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storeData" ADD CONSTRAINT "storeData_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
