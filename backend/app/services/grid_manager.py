"""
HPCL Maritime Grid Manager
Creates grid representation of Indian coastal waters for A* pathfinding
"""

import numpy as np
from typing import Dict, List, Tuple, Optional, Set
import logging
from dataclasses import dataclass

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class GridCell:
    """Represents a single grid cell in maritime space"""
    lat: float
    lon: float
    is_navigable: bool = True
    water_depth_m: float = 100.0  # Default safe depth
    obstacle_type: str = 'clear'  # 'clear', 'island', 'shallow', 'restricted'
    risk_score: float = 0.0
    
    def __hash__(self):
        return hash((round(self.lat, 4), round(self.lon, 4)))
    
    def __eq__(self, other):
        if not isinstance(other, GridCell):
            return False
        return (round(self.lat, 4) == round(other.lat, 4) and 
                round(self.lon, 4) == round(other.lon, 4))


class MaritimeGridManager:
    """
    Manages grid representation of Indian coastal waters
    Grid resolution: 1 km × 1 km cells
    """
    
    # Indian Coastal Waters Boundaries (focused on HPCL ports)
    GRID_BOUNDS = {
        'lat_min': 8.0,   # Southern tip (near Kochi)
        'lat_max': 23.0,  # Northern edge (Gujarat coast)
        'lon_min': 68.0,  # Western edge (Gujarat)
        'lon_max': 88.0   # Eastern edge (West Bengal)
    }
    
    # Grid resolution: ~1 km cells
    CELL_SIZE_DEGREES = 0.01  # Approximately 1.1 km at equator
    
    def __init__(self):
        self.grid: Dict[Tuple[float, float], GridCell] = {}
        self.obstacle_cells: Set[Tuple[float, float]] = set()
        self.grid_initialized = False
        
        # Precomputed neighbor offsets (8-direction movement)
        self.neighbor_offsets = [
            (-1, -1), (-1, 0), (-1, 1),  # North-west, North, North-east
            (0, -1),           (0, 1),    # West, East
            (1, -1),  (1, 0),  (1, 1)     # South-west, South, South-east
        ]
    
    def initialize_grid(self, obstacles: List[Dict] = None):
        """
        Initialize maritime grid for Indian coastal waters
        
        Args:
            obstacles: List of obstacle definitions
        """
        logger.info("Initializing maritime grid for Indian coastal waters...")
        
        lat_steps = int((self.GRID_BOUNDS['lat_max'] - self.GRID_BOUNDS['lat_min']) / self.CELL_SIZE_DEGREES)
        lon_steps = int((self.GRID_BOUNDS['lon_max'] - self.GRID_BOUNDS['lon_min']) / self.CELL_SIZE_DEGREES)
        
        logger.info(f"Grid dimensions: {lat_steps} x {lon_steps} = {lat_steps * lon_steps:,} cells")
        
        # Initialize all cells as navigable water
        for i in range(lat_steps):
            for j in range(lon_steps):
                lat = self.GRID_BOUNDS['lat_min'] + (i * self.CELL_SIZE_DEGREES)
                lon = self.GRID_BOUNDS['lon_min'] + (j * self.CELL_SIZE_DEGREES)
                
                cell = GridCell(
                    lat=round(lat, 4),
                    lon=round(lon, 4),
                    is_navigable=True,
                    water_depth_m=100.0
                )
                self.grid[(cell.lat, cell.lon)] = cell
        
        # Apply obstacles
        if obstacles:
            self._apply_obstacles(obstacles)
        
        self.grid_initialized = True
        logger.info(f"Grid initialized: {len(self.grid):,} cells, {len(self.obstacle_cells)} obstacles")
    
    def _apply_obstacles(self, obstacles: List[Dict]):
        """
        Apply obstacle data to grid
        
        Args:
            obstacles: List of obstacle definitions with lat, lon, radius, type
        """
        logger.info(f"Applying {len(obstacles)} obstacles to grid...")
        
        for obstacle in obstacles:
            obstacle_type = obstacle.get('type', 'island')
            center_lat = obstacle['lat']
            center_lon = obstacle['lon']
            radius_km = obstacle.get('radius_km', 5.0)
            
            # Convert radius to grid cells
            radius_cells = int(radius_km / (self.CELL_SIZE_DEGREES * 111))  # 111 km per degree
            
            # Mark cells within radius as obstacles
            for lat_key, lon_key in self.grid.keys():
                distance = self._haversine_distance(center_lat, center_lon, lat_key, lon_key)
                
                if distance <= radius_km:
                    cell = self.grid[(lat_key, lon_key)]
                    cell.is_navigable = False
                    cell.obstacle_type = obstacle_type
                    cell.risk_score = 1.0
                    self.obstacle_cells.add((lat_key, lon_key))
                
                # Risk gradient for nearby cells (within 2x radius)
                elif distance <= radius_km * 2:
                    cell = self.grid[(lat_key, lon_key)]
                    cell.risk_score = 0.3 * (1 - (distance - radius_km) / radius_km)
    
    def get_cell(self, lat: float, lon: float) -> Optional[GridCell]:
        """
        Get grid cell at specific coordinates
        
        Args:
            lat: Latitude
            lon: Longitude
            
        Returns:
            GridCell or None if out of bounds
        """
        # Snap to grid
        grid_lat = round(lat / self.CELL_SIZE_DEGREES) * self.CELL_SIZE_DEGREES
        grid_lon = round(lon / self.CELL_SIZE_DEGREES) * self.CELL_SIZE_DEGREES
        
        return self.grid.get((round(grid_lat, 4), round(grid_lon, 4)))
    
    def get_neighbors(self, cell: GridCell) -> List[GridCell]:
        """
        Get navigable neighboring cells (8-direction)
        
        Args:
            cell: Current cell
            
        Returns:
            List of navigable neighbor cells
        """
        neighbors = []
        
        for dlat, dlon in self.neighbor_offsets:
            neighbor_lat = round(cell.lat + (dlat * self.CELL_SIZE_DEGREES), 4)
            neighbor_lon = round(cell.lon + (dlon * self.CELL_SIZE_DEGREES), 4)
            
            neighbor = self.grid.get((neighbor_lat, neighbor_lon))
            
            if neighbor and neighbor.is_navigable:
                neighbors.append(neighbor)
        
        return neighbors
    
    def is_navigable(self, lat: float, lon: float, vessel_draft_m: float = 12.0) -> bool:
        """
        Check if location is navigable for given vessel
        
        Args:
            lat: Latitude
            lon: Longitude
            vessel_draft_m: Vessel draft in meters
            
        Returns:
            True if navigable, False otherwise
        """
        cell = self.get_cell(lat, lon)
        
        if not cell:
            return False
        
        if not cell.is_navigable:
            return False
        
        # Check water depth (need 3m clearance)
        if cell.water_depth_m < vessel_draft_m + 3.0:
            return False
        
        return True
    
    def get_risk_score(self, lat: float, lon: float) -> float:
        """
        Get collision risk score at location
        
        Args:
            lat: Latitude
            lon: Longitude
            
        Returns:
            Risk score (0.0 = safe, 1.0 = very dangerous)
        """
        cell = self.get_cell(lat, lon)
        
        if not cell:
            return 1.0  # Out of bounds
        
        return cell.risk_score
    
    def _haversine_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calculate haversine distance in kilometers
        
        Args:
            lat1, lon1: First coordinate
            lat2, lon2: Second coordinate
            
        Returns:
            Distance in kilometers
        """
        lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])
        
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = np.sin(dlat/2)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon/2)**2
        c = 2 * np.arcsin(np.sqrt(a))
        
        return 6371 * c  # Earth radius in km
    
    def get_grid_statistics(self) -> Dict:
        """
        Get grid statistics
        
        Returns:
            Dictionary with grid statistics
        """
        total_cells = len(self.grid)
        navigable_cells = sum(1 for cell in self.grid.values() if cell.is_navigable)
        obstacle_cells = len(self.obstacle_cells)
        risky_cells = sum(1 for cell in self.grid.values() if cell.risk_score > 0.3)
        
        return {
            'total_cells': total_cells,
            'navigable_cells': navigable_cells,
            'obstacle_cells': obstacle_cells,
            'risky_cells': risky_cells,
            'navigable_percentage': round(navigable_cells / total_cells * 100, 2),
            'grid_bounds': self.GRID_BOUNDS,
            'cell_size_km': round(self.CELL_SIZE_DEGREES * 111, 2)
        }


# Global grid manager instance
maritime_grid = MaritimeGridManager()


def initialize_maritime_grid(obstacles: List[Dict] = None):
    """
    Initialize global maritime grid
    
    Args:
        obstacles: List of obstacle definitions
    """
    if not maritime_grid.grid_initialized:
        maritime_grid.initialize_grid(obstacles)
    return maritime_grid


def get_maritime_grid() -> MaritimeGridManager:
    """Get global maritime grid instance"""
    return maritime_grid
