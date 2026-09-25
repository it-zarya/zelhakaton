// Отдельная точка входа админки: не импортирует контент игры, поэтому сохранение не перезагружает эту страницу.
import "@fontsource/golos-text/400.css";
import "@fontsource/golos-text/600.css";
import "@fontsource/unbounded/600.css";
import { bootAdmin } from "./admin";

void bootAdmin(document.querySelector<HTMLElement>("#admin")!);
