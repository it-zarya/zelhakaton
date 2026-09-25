[out:json][timeout:240];
(
  way["railway"="rail"](55.9266,37.0803,56.0478,37.3253);
  way["highway"~"^(motorway|trunk|primary|secondary|tertiary)$"](55.9266,37.0803,56.0478,37.3253);
  way["waterway"="river"](55.9266,37.0803,56.0478,37.3253);
  way["natural"="water"](55.9266,37.0803,56.0478,37.3253);
  relation["natural"="water"](55.9266,37.0803,56.0478,37.3253);
  way["landuse"="forest"](55.9266,37.0803,56.0478,37.3253);
  way["natural"="wood"](55.9266,37.0803,56.0478,37.3253);
  relation["landuse"="forest"](55.9266,37.0803,56.0478,37.3253);
  relation["natural"="wood"](55.9266,37.0803,56.0478,37.3253);
);
out geom;
