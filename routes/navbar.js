import express from "express";
import {
  getNavbarConfig,
  updateNavbarConfig,
  getAvailableCategories
} from "../controllers/navbarController.js";

const router = express.Router();

router.get("/config", getNavbarConfig);
router.put("/config", updateNavbarConfig);
router.get("/categories", getAvailableCategories);

export default router;