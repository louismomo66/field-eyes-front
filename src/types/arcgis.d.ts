declare module '@arcgis/core/Map' {
  export default class Map {
    constructor(options: any);
    basemap: string;
    layers: any[];
  }
}

declare module '@arcgis/core/views/MapView' {
  export default class MapView {
    constructor(options: any);
    container: HTMLDivElement;
    map: any;
    center: number[];
    zoom: number;
    ui: any;
    when(): Promise<void>;
    destroy(): void;
  }
}

declare module '@arcgis/core/layers/GraphicsLayer' {
  export default class GraphicsLayer {
    constructor(options: any);
    id: string;
    add(graphic: any): void;
    removeAll(): void;
  }
}

declare module '@arcgis/core/Graphic' {
  export default class Graphic {
    constructor(options: any);
    geometry: any;
    symbol: any;
    popupTemplate: any;
    attributes: any;
  }
}

declare module '@arcgis/core/geometry/Point' {
  export default class Point {
    constructor(options: any);
    type: string;
    longitude: number;
    latitude: number;
  }
}

declare module '@arcgis/core/symbols/PictureMarkerSymbol' {
  export default class PictureMarkerSymbol {
    constructor(options: any);
    url: string;
    width: string | number;
    height: string | number;
  }
}

declare module '@arcgis/core/widgets/BasemapToggle' {
  export default class BasemapToggle {
    constructor(options: any);
    view: any;
    nextBasemap: string;
  }
}

declare module '@arcgis/core/widgets/Home' {
  export default class Home {
    constructor(options: any);
    view: any;
  }
} 