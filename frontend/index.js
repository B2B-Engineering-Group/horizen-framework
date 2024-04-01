import RequestManager from "./services/RequestManager/service.js";
import FrameManager from "./services/FrameManager/service.js";

export const api = new RequestManager();
export const hFrame = new FrameManager();

