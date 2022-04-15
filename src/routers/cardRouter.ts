import { Router } from "express";

import * as cardController from "../controllers/cardController.js";

const cardRouter = Router();

cardRouter.post("/cards", cardController.create);

export default cardRouter;
