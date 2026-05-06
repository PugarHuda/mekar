import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./lib/config.js";
import { logger } from "./lib/logger.js";
import { storageRouter } from "./routes/storage.js";
import { computeRouter } from "./routes/compute.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: "5mb" }));
app.use(morgan("tiny"));

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    network: config.network,
    chainId: config.chainId,
    rpc: config.rpcUrl,
    contracts: config.contracts,
  });
});

app.use("/api/storage", storageRouter);
app.use("/api/compute", computeRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, "unhandled error");
  res.status(500).json({ error: err.message });
});

app.listen(config.port, () => {
  logger.info(
    { port: config.port, network: config.network, chainId: config.chainId },
    "MEKAR backend listening"
  );
});
