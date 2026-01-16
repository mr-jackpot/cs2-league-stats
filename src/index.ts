import Koa from "koa";
import bodyParser from "koa-bodyparser";
import cors from "@koa/cors";
import { config } from "dotenv";
import { router } from "./routes";
import { errorHandler } from "./middleware/errorHandler";

config();

const app = new Koa();
const PORT = process.env.PORT || 3000;

app.use(errorHandler);
app.use(cors());
app.use(bodyParser());
app.use(router.routes());
app.use(router.allowedMethods());

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export { app };
