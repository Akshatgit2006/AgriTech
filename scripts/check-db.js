import { MongoClient } from "mongodb";
import { randomUUID } from "node:crypto";
import dns from "node:dns";
import { isDemo } from "../server/store.js";

const dnsOverride = process.argv
  .find((argument) => argument.startsWith("--dns="))
  ?.slice(6);
if (dnsOverride) {
  dns.setServers(dnsOverride.split(","));
  console.log("Using explicit DNS servers for this diagnostic process only.");
}
console.log(
  `Application storage mode: ${isDemo() ? "local demo JSON (MongoDB is bypassed)" : "MongoDB"}`,
);
if (!process.env.MONGODB_URI) {
  console.error("MongoDB test skipped: MONGODB_URI is missing.");
  process.exitCode = 1;
} else {
  const databaseName = process.env.MONGODB_DB || "fieldwise";
  console.log(`Testing configured database: ${databaseName}`);
  let client;
  let collection;
  let stage = "connection";
  const id = `fieldwise-check-${randomUUID()}`;
  try {
    const uri = new URL(process.env.MONGODB_URI);
    if (uri.protocol === "mongodb+srv:") {
      stage = "DNS SRV lookup";
      await dns.promises.resolveSrv(`_mongodb._tcp.${uri.hostname}`);
      console.log("PASS: DNS SRV lookup");
      stage = "DNS TXT lookup";
      await dns.promises.resolveTxt(uri.hostname);
      console.log("PASS: DNS TXT lookup");
    }
    stage = "connection";
    client = new MongoClient(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 10000,
      maxPoolSize: 1,
    });
    if (uri.protocol === "mongodb+srv:" && client.options.srvHost !== uri.hostname) {
      console.log("WARNING: The MongoDB driver interpreted a different hostname. Check reserved characters in the connection string credentials.");
    }
    await client.connect();
    const db = client.db(databaseName);
    await db.command({ ping: 1 });
    console.log("PASS: authenticated connection and database ping");
    collection = db.collection("_fieldwise_diagnostics");
    stage = "write";
    await collection.insertOne({
      _id: id,
      purpose: "temporary connection verification",
      value: 1,
      createdAt: new Date(),
    });
    console.log("PASS: insert temporary diagnostic document");
    stage = "read";
    const saved = await collection.findOne({ _id: id });
    if (saved?.value !== 1) throw new Error("VerificationMismatch");
    console.log("PASS: read persisted document");
    stage = "transaction";
    const session = client.startSession();
    try {
      await session.withTransaction(
        async () => {
          await collection.updateOne(
            { _id: id },
            { $set: { value: 2 } },
            { session },
          );
        },
        { maxCommitTimeMS: 10000 },
      );
    } finally {
      await session.endSession();
    }
    if ((await collection.findOne({ _id: id }))?.value !== 2)
      throw new Error("VerificationMismatch");
    console.log(
      "PASS: transaction commit and persisted update (required by farm/order APIs)",
    );
    stage = "delete";
    await collection.deleteOne({ _id: id });
    if (await collection.findOne({ _id: id }))
      throw new Error("VerificationMismatch");
    console.log("PASS: delete and verify cleanup");
  } catch (error) {
    // Do not print driver messages: they may contain connection details.
    const codes = new Set([
      error.code,
      error.cause?.code,
      ...[...(error.reason?.servers?.values?.() || [])].map(
        (server) => server.error?.cause?.code || server.error?.code,
      ),
    ]);
    let reason =
      "Database operation failed; inspect connection settings and network access.";
    if (codes.has(18))
      reason =
        "Authentication failed: check the database username, password and authSource.";
    else if (codes.has(13))
      reason = "Database user lacks permission for this operation.";
    else if (codes.has("ENOTFOUND") || codes.has("EAI_AGAIN"))
      reason =
        "DNS lookup failed; network access or the cluster hostname needs checking.";
    else if (codes.has("EACCES") || codes.has("EPERM"))
      reason = "The execution environment blocked network access.";
    else if (codes.has(20))
      reason =
        "Transactions are unavailable; use a MongoDB replica set or Atlas cluster.";
    else if (error.name === "MongoServerSelectionError")
      reason =
        "Could not reach an available MongoDB server; check Atlas network access, cluster status and connectivity.";
    else if (error.name === "MongoParseError")
      reason = "The connection string is invalid.";
    console.error(
      `FAIL at ${stage}: ${reason} (${error.name}; codes: ${[...codes].filter(Boolean).join(", ") || "none"})`,
    );
    if (
      typeof error.hostname === "string" &&
      /^[a-zA-Z0-9_.-]+$/.test(error.hostname)
    )
      console.error(`Failed DNS name: ${error.hostname}`);
    if (typeof error.syscall === "string" && /^[a-zA-Z]+$/.test(error.syscall))
      console.error(`Failed operation: ${error.syscall}`);
    process.exitCode = 1;
  } finally {
    if (collection) {
      try {
        await collection.deleteOne({ _id: id });
      } catch {
        console.error(
          `Cleanup could not be confirmed for diagnostic document ${id}.`,
        );
        process.exitCode = 1;
      }
    }
    if (client) await client.close();
  }
}
