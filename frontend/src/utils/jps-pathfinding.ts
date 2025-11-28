/**
 * Jump Point Search (JPS) Pathfinding Algorithm
 * Optimized for maritime grid-based routing
 */

interface Point {
  lat: number;
  lng: number;
}

interface GridNode {
  x: number;
  y: number;
  g: number; // Cost from start
  h: number; // Heuristic to goal
  f: number; // Total cost (g + h)
  parent: GridNode | null;
}

interface Grid {
  width: number;
  height: number;
  cells: boolean[][]; // true = obstacle, false = passable
}

// 8 directions: N, NE, E, SE, S, SW, W, NW
const DIRECTIONS = [
  { x: 0, y: -1 },  // N
  { x: 1, y: -1 },  // NE
  { x: 1, y: 0 },   // E
  { x: 1, y: 1 },   // SE
  { x: 0, y: 1 },   // S
  { x: -1, y: 1 },  // SW
  { x: -1, y: 0 },  // W
  { x: -1, y: -1 }  // NW
];

export class JPSPathfinder {
  private grid: Grid;
  private resolution: number; // Degrees per grid cell
  private bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number };

  constructor(bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }, resolution = 0.05) {
    this.resolution = resolution;
    this.bounds = bounds;
    
    // Create grid dimensions
    const width = Math.ceil((bounds.maxLng - bounds.minLng) / resolution);
    const height = Math.ceil((bounds.maxLat - bounds.minLat) / resolution);
    
    // Initialize grid (all blocked by default - assume land)
    this.grid = {
      width,
      height,
      cells: Array(height).fill(null).map(() => Array(width).fill(true))
    };

    // Mark ocean areas as passable (inverse of land)
    this.initializeOceanGrid(bounds);
  }

  /**
   * Initialize ocean areas as passable
   * Mark land as obstacles, everything else is ocean
   */
  private initializeOceanGrid(bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }) {
    for (let y = 0; y < this.grid.height; y++) {
      for (let x = 0; x < this.grid.width; x++) {
        const point = this.gridToLatLng(x, y);
        
        // Check if point is on land (Indian subcontinent)
        if (this.isOnLand(point.lat, point.lng)) {
          this.grid.cells[y][x] = true; // true = obstacle (land)
        } else {
          this.grid.cells[y][x] = false; // false = passable (ocean)
        }
      }
    }
  }

  /**
   * Point-in-polygon test (ray casting). Polygon provided as array of {lat,lng}.
   */
  private pointInPolygon(lat: number, lng: number, polygon: Point[]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lng, yi = polygon[i].lat;
      const xj = polygon[j].lng, yj = polygon[j].lat;
      const intersect = ((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi + 1e-12) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  /**
   * Simplified land polygons for India mainland and Sri Lanka.
   * These are coarse but adequate to prevent routes crossing land.
   */
  private landPolygons: Point[][] = [
    // India mainland (accurate outline following coastline)
    [
      { lat: 8.08, lng: 77.54 }, // Kanyakumari (southern tip)
      { lat: 8.5, lng: 76.9 },   // Southwest coast Kerala
      { lat: 9.5, lng: 76.3 },
      { lat: 10.5, lng: 76.0 },
      { lat: 11.5, lng: 75.7 },
      { lat: 12.5, lng: 74.9 },
      { lat: 13.2, lng: 74.7 },
      { lat: 14.5, lng: 74.1 },
      { lat: 15.4, lng: 73.8 },
      { lat: 16.2, lng: 73.4 },
      { lat: 17.3, lng: 73.0 },
      { lat: 18.2, lng: 72.9 },  // Mumbai area
      { lat: 19.0, lng: 72.8 },
      { lat: 20.0, lng: 72.7 },
      { lat: 20.8, lng: 72.6 },
      { lat: 21.6, lng: 69.6 },  // Gujarat coast
      { lat: 22.5, lng: 68.8 },
      { lat: 23.0, lng: 68.5 },
      { lat: 24.0, lng: 68.2 },  // Pakistan border area
      { lat: 24.5, lng: 70.0 },  // Turn inland
      { lat: 25.0, lng: 73.0 },
      { lat: 26.0, lng: 75.0 },
      { lat: 27.0, lng: 77.0 },
      { lat: 28.0, lng: 79.0 },
      { lat: 29.0, lng: 80.0 },
      { lat: 28.5, lng: 82.0 },
      { lat: 27.0, lng: 85.0 },
      { lat: 26.0, lng: 87.0 },
      { lat: 25.0, lng: 88.5 },  // West Bengal
      { lat: 23.5, lng: 89.0 },  // Bangladesh border
      { lat: 22.5, lng: 88.3 },  // Kolkata area - now go down east coast
      { lat: 21.5, lng: 87.5 },
      { lat: 20.5, lng: 86.8 },
      { lat: 19.5, lng: 85.8 },
      { lat: 18.5, lng: 84.8 },
      { lat: 17.5, lng: 83.3 },  // Visakhapatnam
      { lat: 16.5, lng: 82.2 },
      { lat: 15.5, lng: 80.3 },  // Andhra coast
      { lat: 14.5, lng: 80.3 },
      { lat: 13.5, lng: 80.3 },  // Chennai area
      { lat: 12.5, lng: 79.8 },
      { lat: 11.5, lng: 79.8 },
      { lat: 10.5, lng: 79.3 },
      { lat: 9.5, lng: 79.1 },
      { lat: 8.7, lng: 78.2 },   // Near Tuticorin
      { lat: 8.08, lng: 77.54 }  // Back to Kanyakumari (close polygon)
    ],
    // Sri Lanka (coarse outline)
    [
      { lat: 9.8, lng: 80.0 },
      { lat: 9.5, lng: 80.4 },
      { lat: 9.2, lng: 80.7 },
      { lat: 8.9, lng: 81.1 },
      { lat: 8.5, lng: 81.3 },
      { lat: 8.0, lng: 81.2 },
      { lat: 7.6, lng: 81.0 },
      { lat: 7.3, lng: 80.6 },
      { lat: 6.9, lng: 80.3 },
      { lat: 6.6, lng: 79.9 },
      { lat: 6.6, lng: 79.6 },
      { lat: 7.0, lng: 79.2 },
      { lat: 7.5, lng: 79.0 },
      { lat: 8.0, lng: 79.0 },
      { lat: 8.5, lng: 79.2 },
      { lat: 9.0, lng: 79.5 },
      { lat: 9.5, lng: 79.7 },
      { lat: 9.8, lng: 80.0 }
    ]
  ];

  /**
   * Determine if a point is on land by testing polygons.
   */
  private isOnLand(lat: number, lng: number): boolean {
    for (const poly of this.landPolygons) {
      // quick bbox reject
      let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
      for (const p of poly) {
        if (p.lat < minLat) minLat = p.lat;
        if (p.lat > maxLat) maxLat = p.lat;
        if (p.lng < minLng) minLng = p.lng;
        if (p.lng > maxLng) maxLng = p.lng;
      }
      if (lat < minLat || lat > maxLat || lng < minLng || lng > maxLng) continue;
      if (this.pointInPolygon(lat, lng, poly)) return true;
    }
    return false;
  }

  addLandMask(landPolygons: Point[][]) {
    landPolygons.forEach(polygon => {
      polygon.forEach(point => {
        const cell = this.latLngToGrid(point);
        if (this.isInBounds(cell.x, cell.y)) {
          this.grid.cells[cell.y][cell.x] = true; // Mark as obstacle (land)
        }
      });
    });
  }

  private latLngToGrid(point: Point): { x: number; y: number } {
    const x = Math.floor((point.lng - this.bounds.minLng) / this.resolution);
    const y = Math.floor((this.bounds.maxLat - point.lat) / this.resolution);
    return { x, y };
  }

  private gridToLatLng(x: number, y: number): Point {
    return {
      lng: this.bounds.minLng + x * this.resolution,
      lat: this.bounds.maxLat - y * this.resolution
    };
  }

  private isInBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.grid.width && y >= 0 && y < this.grid.height;
  }

  private isPassable(x: number, y: number): boolean {
    if (!this.isInBounds(x, y)) return false;
    return !this.grid.cells[y][x];
  }

  private heuristic(x1: number, y1: number, x2: number, y2: number): number {
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const D = 1;
    const D2 = Math.SQRT2;
    return D * (dx + dy) + (D2 - 2 * D) * Math.min(dx, dy);
  }

  private hasForcedNeighbors(x: number, y: number, dx: number, dy: number): boolean {
    if (dx !== 0 && dy === 0) { // Horizontal
      const blocked1 = !this.isPassable(x, y - 1);
      const blocked2 = !this.isPassable(x, y + 1);
      const open1 = this.isPassable(x + dx, y - 1);
      const open2 = this.isPassable(x + dx, y + 1);
      return (blocked1 && open1) || (blocked2 && open2);
    }
    if (dx === 0 && dy !== 0) { // Vertical
      const blocked1 = !this.isPassable(x - 1, y);
      const blocked2 = !this.isPassable(x + 1, y);
      const open1 = this.isPassable(x - 1, y + dy);
      const open2 = this.isPassable(x + 1, y + dy);
      return (blocked1 && open1) || (blocked2 && open2);
    }
    if (dx !== 0 && dy !== 0) {
      const blocked1 = !this.isPassable(x - dx, y);
      const blocked2 = !this.isPassable(x, y - dy);
      const open1 = this.isPassable(x - dx, y + dy);
      const open2 = this.isPassable(x + dx, y - dy);
      return (blocked1 && open1) || (blocked2 && open2);
    }
    return false;
  }

  private jump(x: number, y: number, dx: number, dy: number, goalX: number, goalY: number): { x: number; y: number } | null {
    const nx = x + dx;
    const ny = y + dy;

    if (!this.isPassable(nx, ny)) {
      return null;
    }

    if (nx === goalX && ny === goalY) {
      return { x: nx, y: ny };
    }

    if (this.hasForcedNeighbors(nx, ny, dx, dy)) {
      return { x: nx, y: ny };
    }

    if (dx !== 0 && dy !== 0) {
      if (this.jump(nx, ny, dx, 0, goalX, goalY) !== null) {
        return { x: nx, y: ny };
      }
      if (this.jump(nx, ny, 0, dy, goalX, goalY) !== null) {
        return { x: nx, y: ny };
      }
    }

    return this.jump(nx, ny, dx, dy, goalX, goalY);
  }

  /**
   * Get jump point successors
   * Simple version: try all 8 directions and return first jump point in each direction
   */
  private getSuccessors(node: GridNode, goalX: number, goalY: number): { x: number; y: number }[] {
    const successors: { x: number; y: number }[] = [];

    for (const dir of DIRECTIONS) {
      const jp = this.jump(node.x, node.y, dir.x, dir.y, goalX, goalY);
      if (jp) {
        successors.push(jp);
      }
    }

    return successors;
  }

  /**
   * Main JPS pathfinding algorithm
   */
  findPath(start: Point, goal: Point): Point[] {
    const startCell = this.latLngToGrid(start);
    const goalCell = this.latLngToGrid(goal);

    console.log('JPS pathfinding from', start, 'to', goal);
    console.log('Start cell:', startCell, 'is passable:', this.isPassable(startCell.x, startCell.y));
    console.log('Goal cell:', goalCell, 'is passable:', this.isPassable(goalCell.x, goalCell.y));

    const validStart = this.findNearestOceanCell(startCell.x, startCell.y);
    const validGoal = this.findNearestOceanCell(goalCell.x, goalCell.y);

    if (!validStart || !validGoal) {
      console.warn('Could not find valid ocean cells, using offshore fallback');
      return this.createOffshoreRoute(start, goal);
    }
    
    console.log('Valid start cell:', validStart, 'Valid goal cell:', validGoal);

    const openList: GridNode[] = [];
    const closedSet = new Set<string>();
    const nodeMap = new Map<string, GridNode>();

    const startNode: GridNode = {
      x: validStart.x,
      y: validStart.y,
      g: 0,
      h: this.heuristic(validStart.x, validStart.y, validGoal.x, validGoal.y),
      f: 0,
      parent: null
    };
    startNode.f = startNode.g + startNode.h;

    openList.push(startNode);
    nodeMap.set(`${validStart.x},${validStart.y}`, startNode);

    let iterations = 0;
    const maxIterations = 10000; // Prevent infinite loops

    while (openList.length > 0 && iterations < maxIterations) {
      iterations++;
      
      openList.sort((a, b) => a.f - b.f);
      const current = openList.shift()!;

      const distToGoal = Math.abs(current.x - validGoal.x) + Math.abs(current.y - validGoal.y);
      if (distToGoal <= 2) {
        const path = this.reconstructPath(current);
        path[0] = start;
        path[path.length - 1] = goal;
        return path;
      }

      closedSet.add(`${current.x},${current.y}`);

      const successors = this.getSuccessors(current, validGoal.x, validGoal.y);

      for (const succ of successors) {
        const key = `${succ.x},${succ.y}`;

        if (closedSet.has(key)) {
          continue;
        }

        const dx = succ.x - current.x;
        const dy = succ.y - current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const tentativeG = current.g + distance;

        let successor = nodeMap.get(key);

        if (!successor) {
          successor = {
            x: succ.x,
            y: succ.y,
            g: tentativeG,
            h: this.heuristic(succ.x, succ.y, validGoal.x, validGoal.y),
            f: 0,
            parent: current
          };
          successor.f = successor.g + successor.h;
          nodeMap.set(key, successor);
          openList.push(successor);
        } else if (tentativeG < successor.g) {
          successor.g = tentativeG;
          successor.f = successor.g + successor.h;
          successor.parent = current;

          if (!openList.includes(successor)) {
            openList.push(successor);
          }
        }
      }
    }

    return this.createOffshoreRoute(start, goal);
  }

  private findNearestOceanCell(x: number, y: number): { x: number; y: number } | null {
    if (this.isPassable(x, y)) {
      return { x, y };
    }

    for (let radius = 1; radius <= 10; radius++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (this.isPassable(nx, ny)) {
            return { x: nx, y: ny };
          }
        }
      }
    }

    return null;
  }

  /**
   * Create an offshore route when pathfinding fails
   */
  private createOffshoreRoute(start: Point, goal: Point): Point[] {
    console.log('Creating offshore fallback route from', start, 'to', goal);
    const waypoints: Point[] = [start];
    
    const lngDiff = goal.lng - start.lng;
    const latDiff = goal.lat - start.lat;
    
    // West coast routes (Mumbai to Kochi, etc.) - stay in Arabian Sea
    if (start.lng < 76 && goal.lng < 76) {
      console.log('West coast route detected - using Arabian Sea');
      // Add waypoints offshore in Arabian Sea
      waypoints.push({ lat: start.lat - Math.abs(latDiff) * 0.3, lng: 71.5 });
      waypoints.push({ lat: goal.lat + Math.abs(latDiff) * 0.3, lng: 71.5 });
    }
    // East coast routes - stay in Bay of Bengal  
    else if (start.lng > 80 && goal.lng > 80) {
      console.log('East coast route detected - using Bay of Bengal');
      const midLat = (start.lat + goal.lat) / 2;
      waypoints.push({ lat: midLat, lng: 85.0 });
    }
    // Cross-coast routes - go around southern tip
    else if (Math.abs(lngDiff) > 8) {
      console.log('Cross-coast route detected - going around southern India');
      waypoints.push({ lat: 7.0, lng: 77.5 });
    }
    // Default offshore waypoint
    else {
      const midLat = (start.lat + goal.lat) / 2;
      const midLng = (start.lng + goal.lng) / 2;
      waypoints.push({ lat: midLat, lng: midLng });
    }
    
    waypoints.push(goal);
    console.log('Offshore route waypoints:', waypoints);
    return waypoints;
  }

  private reconstructPath(goalNode: GridNode): Point[] {
    const path: Point[] = [];
    let current: GridNode | null = goalNode;

    while (current !== null) {
      path.unshift(this.gridToLatLng(current.x, current.y));
      current = current.parent;
    }

    return path;
  }

  /**
   * Fallback to a simple midpoint route if everything else fails
   */
  private createFallbackRoute(start: Point, goal: Point): Point[] {
    const midLat = (start.lat + goal.lat) / 2;
    const midLng = (start.lng + goal.lng) / 2;
    return [start, { lat: midLat, lng: midLng }, goal];
  }
}

/**
 * Calculate maritime route using JPS pathfinding
 * Avoids land masses and finds optimal ocean paths
 */
export function calculateMaritimeRoute(start: Point, goal: Point): Point[] {
  console.log('Calculating maritime route from', start, 'to', goal);
  
  const bounds = {
    minLat: 6,
    maxLat: 25,
    minLng: 68,
    maxLng: 90
  };

  // Create JPS pathfinder with appropriate resolution
  const jps = new JPSPathfinder(bounds, 0.1); // 0.1 degree resolution (~11km)
  
  // Run JPS to find ocean path
  const path = jps.findPath(start, goal);

  console.log('JPS returned path with', path.length, 'waypoints');

  // Smooth the path for natural-looking routes
  if (path.length > 4) {
    const smoothed = smoothPath(path);
    console.log('Smoothed to', smoothed.length, 'waypoints');
    return smoothed;
  }

  return path;
}

  /**
   * Smooth path using simple interpolation ensuring points remain offshore.
   */
  function smoothPath(path: Point[]): Point[] {
    if (path.length <= 2) return path;
    const smoothed: Point[] = [path[0]];

    // Lightweight land check duplicated for smoothing (avoids accessing private methods)
    const mainlandPoly = [
      { lat: 8.3, lng: 76.9 }, { lat: 9.5, lng: 76.2 }, { lat: 10.5, lng: 76.0 }, { lat: 11.5, lng: 75.7 },
      { lat: 12.5, lng: 74.9 }, { lat: 13.2, lng: 74.7 }, { lat: 14.5, lng: 74.0 }, { lat: 15.4, lng: 73.7 },
      { lat: 16.2, lng: 73.3 }, { lat: 17.3, lng: 72.9 }, { lat: 18.2, lng: 72.8 }, { lat: 19.0, lng: 72.8 },
      { lat: 20.0, lng: 72.6 }, { lat: 20.8, lng: 72.3 }, { lat: 21.6, lng: 72.7 }, { lat: 22.2, lng: 72.9 },
      { lat: 22.8, lng: 73.4 }, { lat: 23.4, lng: 74.2 }, { lat: 24.0, lng: 75.1 }, { lat: 24.4, lng: 76.2 },
      { lat: 24.6, lng: 77.5 }, { lat: 24.8, lng: 79.0 }, { lat: 24.7, lng: 80.5 }, { lat: 24.5, lng: 82.0 },
      { lat: 24.2, lng: 83.5 }, { lat: 23.8, lng: 85.0 }, { lat: 23.0, lng: 86.5 }, { lat: 22.4, lng: 87.2 },
      { lat: 21.6, lng: 87.5 }, { lat: 20.6, lng: 87.6 }, { lat: 19.5, lng: 87.5 }, { lat: 18.4, lng: 87.4 },
      { lat: 17.2, lng: 86.8 }, { lat: 16.3, lng: 86.2 }, { lat: 15.2, lng: 85.5 }, { lat: 14.2, lng: 84.7 },
      { lat: 13.3, lng: 83.9 }, { lat: 12.6, lng: 82.8 }, { lat: 12.0, lng: 81.6 }, { lat: 11.4, lng: 80.3 },
      { lat: 10.6, lng: 79.8 }, { lat: 9.6, lng: 79.6 }, { lat: 8.8, lng: 79.8 }, { lat: 8.3, lng: 80.5 },
      { lat: 8.1, lng: 81.2 }, { lat: 8.2, lng: 82.0 }, { lat: 8.1, lng: 83.0 }, { lat: 8.0, lng: 84.0 },
      { lat: 8.0, lng: 85.0 }, { lat: 8.2, lng: 86.0 }, { lat: 8.2, lng: 87.0 }, { lat: 8.3, lng: 88.0 },
      { lat: 8.2, lng: 88.5 }, { lat: 8.0, lng: 89.0 }, { lat: 7.8, lng: 88.5 }, { lat: 7.6, lng: 87.5 },
      { lat: 7.5, lng: 86.0 }, { lat: 7.5, lng: 84.5 }, { lat: 7.6, lng: 83.0 }, { lat: 7.6, lng: 81.5 },
      { lat: 7.5, lng: 80.0 }, { lat: 7.4, lng: 78.5 }, { lat: 7.4, lng: 77.5 }, { lat: 7.6, lng: 76.8 },
      { lat: 7.9, lng: 76.5 }, { lat: 8.3, lng: 76.9 }
    ];

    const sriLankaPoly = [
      { lat: 9.8, lng: 80.0 }, { lat: 9.5, lng: 80.4 }, { lat: 9.2, lng: 80.7 }, { lat: 8.9, lng: 81.1 },
      { lat: 8.5, lng: 81.3 }, { lat: 8.0, lng: 81.2 }, { lat: 7.6, lng: 81.0 }, { lat: 7.3, lng: 80.6 },
      { lat: 6.9, lng: 80.3 }, { lat: 6.6, lng: 79.9 }, { lat: 6.6, lng: 79.6 }, { lat: 7.0, lng: 79.2 },
      { lat: 7.5, lng: 79.0 }, { lat: 8.0, lng: 79.0 }, { lat: 8.5, lng: 79.2 }, { lat: 9.0, lng: 79.5 },
      { lat: 9.5, lng: 79.7 }, { lat: 9.8, lng: 80.0 }
    ];

    const pointInPoly = (lat: number, lng: number, poly: Point[]) => {
      let inside = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const xi = poly[i].lng, yi = poly[i].lat;
        const xj = poly[j].lng, yj = poly[j].lat;
        const intersect = ((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi + 1e-12) + xi);
        if (intersect) inside = !inside;
      }
      return inside;
    };

    const isLand = (p: Point) => pointInPoly(p.lat, p.lng, mainlandPoly) || pointInPoly(p.lat, p.lng, sriLankaPoly);

    for (let i = 1; i < path.length - 1; i++) {
      const prev = path[i - 1];
      const curr = path[i];
      const next = path[i + 1];
      const candidate: Point = {
        lat: (prev.lat + curr.lat + next.lat) / 3,
        lng: (prev.lng + curr.lng + next.lng) / 3
      };
      smoothed.push(isLand(candidate) ? curr : candidate);
    }

    smoothed.push(path[path.length - 1]);
    return smoothed;
  }
