[out:json][timeout:120];
(
  way["place"~"neighbourhood|suburb|quarter"](55.95,37.10,56.04,37.27);
  relation["place"~"neighbourhood|suburb|quarter"](55.95,37.10,56.04,37.27);
  way["railway"="rail"](55.95,37.10,56.04,37.27);
  way["highway"~"^(motorway|trunk|primary|secondary)$"](55.95,37.10,56.04,37.27);
  way["waterway"="river"](55.95,37.10,56.04,37.27);
  way["natural"="water"](55.95,37.10,56.04,37.27);
  relation["natural"="water"](55.95,37.10,56.04,37.27);
  way["landuse"="forest"](55.95,37.10,56.04,37.27);
  way["natural"="wood"](55.95,37.10,56.04,37.27);
  relation["landuse"="forest"](55.95,37.10,56.04,37.27);
  relation["natural"="wood"](55.95,37.10,56.04,37.27);
  relation["boundary"="administrative"]["name"~"Зеленоград"];
);
out geom;
